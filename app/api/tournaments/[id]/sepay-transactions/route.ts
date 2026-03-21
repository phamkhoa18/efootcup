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

        // Get ALL registrations for this tournament to do broader matching
        const registrations = await Registration.find({
            tournament: tournament._id,
        }).populate("user", "name email efvId");

        // Build multiple lookup maps for flexible matching
        const invoiceMap = new Map<string, any>();      // invoiceNumber -> reg
        const phoneMap = new Map<string, any>();        // phone -> reg
        const regIdPartMap = new Map<string, any>();    // last 8 chars of reg._id -> reg

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

            // Parse paymentNote for invoiceNumber
            try {
                const noteData = JSON.parse(reg.paymentNote || "{}");
                if (noteData.invoiceNumber) {
                    regData.invoiceNumber = noteData.invoiceNumber;
                    invoiceMap.set(noteData.invoiceNumber, regData);
                    invoiceMap.set(noteData.invoiceNumber.toUpperCase(), regData);
                }
            } catch {}

            // Index by phone number (normalized — digits only, last 9-10 digits)
            if (reg.phone) {
                const cleanPhone = reg.phone.replace(/\D/g, "");
                if (cleanPhone.length >= 9) {
                    phoneMap.set(cleanPhone, regData);
                    // Also store last 9 digits (strip leading 0 or 84)
                    const last9 = cleanPhone.slice(-9);
                    phoneMap.set(last9, regData);
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

        console.log(`📋 ${registrations.length} regs, ${invoiceMap.size} invoices, ${phoneMap.size} phones`);

        // Match transactions to registrations
        const enrichedTransactions = transactions.map((tx: any) => {
            const txContent = (tx.transaction_content || tx.content || "").toString().trim();
            const txCode = (tx.code || "").toString().trim();
            const txContentUpper = txContent.toUpperCase();

            let matchedReg = null;

            // Strategy 1: Direct code match against invoice numbers
            if (txCode && invoiceMap.has(txCode)) {
                matchedReg = invoiceMap.get(txCode);
            }

            // Strategy 2: Search for any invoice number in the content
            if (!matchedReg && txContent) {
                for (const [invoice, reg] of invoiceMap.entries()) {
                    if (txContentUpper.includes(invoice.toUpperCase())) {
                        matchedReg = reg;
                        break;
                    }
                }
            }

            // Strategy 3: Look for EFCUP pattern in content
            if (!matchedReg && txContent) {
                const efcupMatch = txContent.match(/EFCUP-([A-Z0-9]+)-/i);
                if (efcupMatch) {
                    const regIdPart = efcupMatch[1].toUpperCase();
                    if (regIdPartMap.has(regIdPart)) {
                        matchedReg = regIdPartMap.get(regIdPart);
                    }
                }
            }

            // Strategy 4: Look for PAY code in paymentNote of registrations
            if (!matchedReg && txCode && txCode.startsWith("PAY")) {
                for (const reg of registrations) {
                    try {
                        const noteStr = reg.paymentNote || "";
                        if (noteStr.includes(txCode)) {
                            matchedReg = buildRegData(reg, txCode);
                            break;
                        }
                    } catch {}
                }
            }

            // Strategy 5: Match by phone number in transaction content
            // Bank transfers often contain sender phone: "122052750878 0859932114 PAY..."
            if (!matchedReg && txContent) {
                // Extract all potential phone numbers from content (9-11 digit sequences)
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

            // Strategy 6: Match by player name in transaction content
            // MoMo/manual transfers often contain player name: "PHAM DANG KHOA chuyen tien"
            if (!matchedReg && txContent && txContent.length > 5) {
                const normalizedContent = normalizeVN(txContent);
                let bestMatch: any = null;
                let bestScore = 0;

                for (const reg of registrations) {
                    if (!reg.playerName || reg.playerName.length < 3) continue;
                    const normalizedName = normalizeVN(reg.playerName);
                    // Check if full name appears in content
                    if (normalizedContent.includes(normalizedName)) {
                        // Prefer longer name matches (more specific)
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

            return {
                id: tx.id,
                transactionDate: tx.transaction_date,
                amountIn: parseFloat(tx.amount_in) || 0,
                amountOut: parseFloat(tx.amount_out) || 0,
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

