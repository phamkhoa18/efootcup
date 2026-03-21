import { NextRequest } from "next/server";
import mongoose from "mongoose";
import dbConnect from "@/lib/mongodb";
import PaymentConfig from "@/models/PaymentConfig";
import Tournament from "@/models/Tournament";
import Registration from "@/models/Registration";
import { requireManager, apiResponse, apiError } from "@/lib/auth";

interface RouteParams {
    params: Promise<{ id: string }>;
}

/**
 * GET /api/tournaments/[id]/sepay-transactions
 *
 * Fetches transactions from SePay API for reconciliation.
 * Uses the SePay API Token stored in PaymentConfig.
 * Returns transactions + matching registration data.
 */
export async function GET(req: NextRequest, { params }: RouteParams) {
    try {
        const authResult = await requireManager(req);
        if (authResult instanceof Response) return authResult;

        await dbConnect();
        const { id: idOrSlug } = await params;
        const query = mongoose.Types.ObjectId.isValid(idOrSlug)
            ? { _id: idOrSlug }
            : { slug: idOrSlug };

        const tournament = await Tournament.findOne(query);
        if (!tournament) return apiError("Không tìm thấy giải đấu", 404);

        // Get SePay config
        const paymentConfig = await (PaymentConfig as any).getSingleton();
        const sepayMethod = paymentConfig.methods?.find(
            (m: any) => m.type === "sepay" && m.enabled
        );

        if (!sepayMethod) {
            return apiError("Chưa cấu hình phương thức SePay", 400);
        }

        const apiToken = sepayMethod.sepayApiToken;
        if (!apiToken) {
            return apiError("Chưa cấu hình SePay API Token. Vào Admin → Thanh toán → SePay → nhập API Token từ my.sepay.vn", 400);
        }

        const accountNumber = sepayMethod.accountNumber;

        // Get query params for filtering
        const url = new URL(req.url);
        const fromDate = url.searchParams.get("from_date") || "";
        const toDate = url.searchParams.get("to_date") || "";
        const limit = url.searchParams.get("limit") || "5000"; // SePay max is 5000

        // Build SePay API URL
        const apiUrl = new URL("https://my.sepay.vn/userapi/transactions/list");
        if (accountNumber) {
            apiUrl.searchParams.set("account_number", accountNumber);
        }
        apiUrl.searchParams.set("limit", limit);
        if (fromDate) apiUrl.searchParams.set("transaction_date_min", fromDate);
        if (toDate) apiUrl.searchParams.set("transaction_date_max", toDate);

        console.log(`🔍 Fetching SePay transactions: ${apiUrl.toString()}`);

        const sepayRes = await fetch(apiUrl.toString(), {
            headers: {
                "Authorization": `Bearer ${apiToken}`,
                "Content-Type": "application/json",
            },
        });

        if (!sepayRes.ok) {
            const errText = await sepayRes.text();
            console.error(`❌ SePay API error: ${sepayRes.status} ${errText}`);
            return apiError(`SePay API lỗi: ${sepayRes.status}. Kiểm tra API Token.`, sepayRes.status === 401 ? 401 : 500);
        }

        const sepayData = await sepayRes.json();
        const transactions = sepayData.transactions || sepayData.data || [];

        console.log(`📊 SePay returned ${transactions.length} transactions`);
        // Debug: log first raw transaction to see actual field names
        if (transactions.length > 0) {
            console.log(`🔍 Sample raw tx keys: ${Object.keys(transactions[0]).join(', ')}`);
            console.log(`🔍 Sample raw tx: amount_in=${transactions[0].amount_in}, amount_out=${transactions[0].amount_out}, transferAmount=${transactions[0].transferAmount}, amount=${transactions[0].amount}`);
        }
        // Raw total from SePay data
        const rawTotal = transactions.reduce((s: number, t: any) => s + (parseFloat(String(t.amount_in ?? t.transferAmount ?? t.amount ?? 0)) || 0), 0);
        console.log(`💰 Raw SePay total amount_in: ${rawTotal}`);

        // Get ALL registrations for this tournament to do broader matching
        const registrations = await Registration.find({
            tournament: tournament._id,
        }).populate("user", "name email efvId phone");

        // Build multiple lookup maps for flexible matching
        const invoiceMap = new Map<string, any>();      // invoiceNumber -> reg
        const phoneMap = new Map<string, any>();        // phone -> reg
        const regIdPartMap = new Map<string, any>();    // last 8 chars of reg._id -> reg
        const payCodeMap = new Map<string, any>();      // PAY code -> reg (from stored webhook data)
        const emailMap = new Map<string, any>();        // email -> reg


        const buildRegData = (reg: any, invoiceNumber = "") => ({
            _id: reg._id,
            playerName: reg.playerName,
            teamName: reg.teamName,
            efvId: (reg.user as any)?.efvId,
            status: reg.status,
            paymentStatus: reg.paymentStatus,
            paymentAmount: reg.paymentAmount,
            paymentMethod: reg.paymentMethod,
            phone: reg.phone,
            invoiceNumber,
        });

        for (const reg of registrations) {
            const regData = buildRegData(reg);


            // Parse paymentNote for invoiceNumber and PAY codes
            try {
                const noteStr = reg.paymentNote || "{}";
                const noteData = JSON.parse(noteStr);
                if (noteData.invoiceNumber) {
                    regData.invoiceNumber = noteData.invoiceNumber;
                    invoiceMap.set(noteData.invoiceNumber, regData);
                    invoiceMap.set(noteData.invoiceNumber.toUpperCase(), regData);
                }
                // Index by orderCode (this is the PAY code stored after webhook)
                if (noteData.orderCode) {
                    payCodeMap.set(noteData.orderCode.toUpperCase(), regData);
                }
                // Index by bankPayCode (PAY code linked by bank webhook)
                if (noteData.bankPayCode) {
                    payCodeMap.set(noteData.bankPayCode.toUpperCase(), regData);
                }
                if (noteData.sepayOrderId) {
                    payCodeMap.set(String(noteData.sepayOrderId).toUpperCase(), regData);
                }
                // Index by transactionId (SePay tx id)
                if (noteData.transactionId) {
                    payCodeMap.set(String(noteData.transactionId), regData);
                }
                // Extract PAY codes from bankDetails.content
                if (noteData.bankDetails?.content) {
                    const payMatches = String(noteData.bankDetails.content).match(/PAY[A-F0-9]{15,}/gi);
                    if (payMatches) {
                        for (const pm of payMatches) {
                            payCodeMap.set(pm.toUpperCase(), regData);
                        }
                    }
                }
                // Also extract PAY codes from the raw paymentNote string
                const rawPayMatches = noteStr.match(/PAY[A-F0-9]{15,}/gi);
                if (rawPayMatches) {
                    for (const pm of rawPayMatches) {
                        payCodeMap.set(pm.toUpperCase(), regData);
                    }
                }
            } catch {}

            // Index by phone number (normalized — digits only, last 9-10 digits)
            if (reg.phone) {
                const cleanPhone = reg.phone.replace(/\D/g, "");
                if (cleanPhone.length >= 9) {
                    phoneMap.set(cleanPhone, regData);
                    const last9 = cleanPhone.slice(-9);
                    phoneMap.set(last9, regData);
                }
            }

            // Index by email
            if (reg.email) {
                emailMap.set(reg.email.toLowerCase(), regData);
            }
            if ((reg.user as any)?.email) {
                emailMap.set((reg.user as any).email.toLowerCase(), regData);
            }

            // Index by user phone (from User model)
            if ((reg.user as any)?.phone) {
                const userPhone = (reg.user as any).phone.replace(/\D/g, "");
                if (userPhone.length >= 9) {
                    phoneMap.set(userPhone, regData);
                    phoneMap.set(userPhone.slice(-9), regData);
                }
            }

            // Index by last 8 chars of registration ID
            const idStr = reg._id.toString();
            const last8 = idStr.slice(-8).toUpperCase();
            regIdPartMap.set(last8, regData);
        }

        // Helper: normalize Vietnamese text for matching (remove diacritics + lowercase)
        const normalizeVN = (s: string) =>
            s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/đ/gi, "d").toLowerCase().trim();

        console.log(`📋 ${registrations.length} regs, ${invoiceMap.size} invoices, ${payCodeMap.size} payCodes, ${phoneMap.size} phones`);

        // Match transactions to registrations
        const enrichedTransactions = transactions.map((tx: any) => {
            const txContent = (tx.transaction_content || tx.content || "").toString().trim();
            const txCode = (tx.code || "").toString().trim();
            const txContentUpper = txContent.toUpperCase();
            const txCodeUpper = txCode.toUpperCase();

            let matchedReg = null;

            // Strategy 1: Direct code match against invoice numbers (EFCUP-xxx)
            if (txCode && invoiceMap.has(txCode)) {
                matchedReg = invoiceMap.get(txCode);
            }

            // Strategy 2: Direct code match against PAY code map
            if (!matchedReg && txCodeUpper && payCodeMap.has(txCodeUpper)) {
                matchedReg = payCodeMap.get(txCodeUpper);
            }

            // Strategy 3: Search for any invoice number in the content
            if (!matchedReg && txContent) {
                for (const [invoice, reg] of invoiceMap.entries()) {
                    if (txContentUpper.includes(invoice.toUpperCase())) {
                        matchedReg = reg;
                        break;
                    }
                }
            }

            // Strategy 4: Search for PAY codes in content → match against payCodeMap
            if (!matchedReg && txContent) {
                const contentPayMatches = txContentUpper.match(/PAY[A-F0-9]{15,}/gi);
                if (contentPayMatches) {
                    for (const pm of contentPayMatches) {
                        if (payCodeMap.has(pm.toUpperCase())) {
                            matchedReg = payCodeMap.get(pm.toUpperCase());
                            break;
                        }
                    }
                }
            }

            // Strategy 5: Look for EFCUP pattern in content
            if (!matchedReg && txContent) {
                const efcupMatch = txContent.match(/EFCUP-([A-Z0-9]+)-/i);
                if (efcupMatch) {
                    const regIdPart = efcupMatch[1].toUpperCase();
                    if (regIdPartMap.has(regIdPart)) {
                        matchedReg = regIdPartMap.get(regIdPart);
                    }
                }
            }

            // Strategy 6: Match by SePay transaction ID
            if (!matchedReg && tx.id) {
                const txIdStr = String(tx.id);
                if (payCodeMap.has(txIdStr)) {
                    matchedReg = payCodeMap.get(txIdStr);
                }
            }

            // Strategy 7: Match by phone number in transaction content
            if (!matchedReg && txContent) {
                const phoneMatches = txContent.match(/\b\d{9,11}\b/g) || [];
                for (const phoneStr of phoneMatches) {
                    const last9 = phoneStr.slice(-9);
                    if (phoneMap.has(phoneStr)) {
                        matchedReg = phoneMap.get(phoneStr);
                        break;
                    }
                    if (phoneMap.has(last9)) {
                        matchedReg = phoneMap.get(last9);
                        break;
                    }
                }
            }

            // Strategy 8: Match by player name in transaction content
            if (!matchedReg && txContent && txContent.length > 5) {
                const normalizedContent = normalizeVN(txContent);
                let bestMatch: any = null;
                let bestScore = 0;

                for (const reg of registrations) {
                    if (!reg.playerName || reg.playerName.length < 3) continue;
                    const normalizedName = normalizeVN(reg.playerName);
                    if (normalizedContent.includes(normalizedName)) {
                        if (normalizedName.length > bestScore) {
                            bestScore = normalizedName.length;
                            bestMatch = buildRegData(reg);
                        }
                    }
                }
                if (bestMatch) {
                    matchedReg = bestMatch;
                }
            }

            const rawAmountIn = tx.amount_in ?? tx.transferAmount ?? tx.amount ?? 0;
            const rawAmountOut = tx.amount_out ?? 0;

            return {
                id: tx.id,
                transactionDate: tx.transaction_date,
                amountIn: parseFloat(String(rawAmountIn)) || 0,
                amountOut: parseFloat(String(rawAmountOut)) || 0,
                content: txContent,
                code: txCode,
                referenceNumber: tx.reference_number || "",
                bankBrandName: tx.bank_brand_name || tx.gateway || "",
                accountNumber: tx.account_number || "",
                subAccount: tx.sub_account || "",
                accumulated: parseFloat(tx.accumulated) || 0,
                registration: matchedReg,
            };
        });

        // Debug: log match stats
        const matched = enrichedTransactions.filter((t: any) => t.registration).length;
        const unmatched = enrichedTransactions.filter((t: any) => !t.registration && t.amountIn > 0).length;
        const totalAmountIn = enrichedTransactions.reduce((s: number, t: any) => s + t.amountIn, 0);
        console.log(`📊 Match results: ${matched} matched, ${unmatched} unmatched, totalIn=${totalAmountIn}`);
        // Log first 5 unmatched PAY codes for debugging
        const unmatchedPAY = enrichedTransactions
            .filter((t: any) => !t.registration && t.amountIn > 0 && t.code)
            .slice(0, 5)
            .map((t: any) => `${t.code} (${t.amountIn}đ)`);
        if (unmatchedPAY.length > 0) {
            console.log(`🔍 Sample unmatched: ${unmatchedPAY.join(', ')}`);
        }

        return apiResponse({
            transactions: enrichedTransactions,
            total: enrichedTransactions.length,
            tournamentId: tournament._id,
            tournamentTitle: tournament.title,
            entryFee: tournament.entryFee,
        }, 200, "Danh sách giao dịch SePay");
    } catch (error) {
        console.error("Fetch SePay transactions error:", error);
        return apiError("Có lỗi xảy ra khi lấy danh sách giao dịch", 500);
    }
}

