import nodemailer from "nodemailer";
import dbConnect from "@/lib/mongodb";

// ============================================================
// SMTP Config interface (from SiteSettings DB)
// ============================================================
interface SmtpConfig {
    smtpHost: string;
    smtpPort: number;
    smtpSecure: boolean;
    smtpUser: string;
    smtpPass: string;
    smtpFromName: string;
    smtpFromEmail: string;
    emailEnabled: boolean;
}

// ============================================================
// Get SMTP config from DB (SiteSettings), fallback to env
// ============================================================
async function getSmtpConfig(): Promise<SmtpConfig> {
    try {
        await dbConnect();
        // Dynamic import to avoid circular dependency
        const SiteSettings = (await import("@/models/SiteSettings")).default;
        const settings = await (SiteSettings as any).getSingleton();

        if (settings?.smtpHost && settings?.smtpUser) {
            return {
                smtpHost: settings.smtpHost,
                smtpPort: settings.smtpPort || 587,
                smtpSecure: settings.smtpSecure || false,
                smtpUser: settings.smtpUser,
                smtpPass: settings.smtpPass || "",
                smtpFromName: settings.smtpFromName || "EFV CUP VN",
                smtpFromEmail: settings.smtpFromEmail || settings.smtpUser,
                emailEnabled: settings.emailEnabled !== false,
            };
        }
    } catch (err) {
        console.error("Failed to load SMTP config from DB:", err);
    }

    // Fallback to environment variables
    return {
        smtpHost: process.env.SMTP_HOST || "",
        smtpPort: parseInt(process.env.SMTP_PORT || "587"),
        smtpSecure: process.env.SMTP_SECURE === "true",
        smtpUser: process.env.SMTP_USER || "",
        smtpPass: process.env.SMTP_PASS || "",
        smtpFromName: "EFV CUP VN",
        smtpFromEmail: process.env.SMTP_FROM || process.env.SMTP_USER || "",
        emailEnabled: !!process.env.SMTP_HOST,
    };
}

// ============================================================
// Create transporter from config
// ============================================================
function createTransporterFromConfig(config: SmtpConfig) {
    if (config.smtpHost && config.smtpUser) {
        return nodemailer.createTransport({
            host: config.smtpHost,
            port: config.smtpPort,
            secure: config.smtpSecure,
            auth: {
                user: config.smtpUser,
                pass: config.smtpPass,
            },
        });
    }

    // Fallback: Ethereal for testing
    return nodemailer.createTransport({
        host: "smtp.ethereal.email",
        port: 587,
        auth: {
            user: process.env.ETHEREAL_USER || "",
            pass: process.env.ETHEREAL_PASS || "",
        },
    });
}

// ============================================================
// Generate a random 4-digit verification code
// ============================================================
export function generateVerificationCode(): string {
    return Math.floor(1000 + Math.random() * 9000).toString();
}

// ============================================================
// Send verification email with 4-digit code
// ============================================================
export async function sendVerificationEmail(
    email: string,
    name: string,
    code: string
): Promise<{ success: boolean; previewUrl?: string }> {
    try {
        const config = await getSmtpConfig();
        const transporter = createTransporterFromConfig(config);
        const fromAddress = `"${config.smtpFromName}" <${config.smtpFromEmail || "noreply@EFV CUP.vn"}>`;

        const mailOptions = {
            from: fromAddress,
            to: email,
            subject: `[EFV CUP] Ma xac minh: ${code}`,
            html: `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin:0; padding:0; background-color:#f4f6f9; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;">
    <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f4f6f9; padding:40px 20px;">
        <tr>
            <td align="center">
                <table width="480" cellpadding="0" cellspacing="0" style="background-color:#ffffff; border-radius:16px; overflow:hidden; box-shadow:0 4px 24px rgba(0,0,0,0.08);">
                    <!-- Header -->
                    <tr>
                        <td style="background: linear-gradient(135deg, #0A3D91 0%, #1E40AF 50%, #4338CA 100%); padding:32px 40px; text-align:center;">
                            <h1 style="color:#ffffff; font-size:24px; font-weight:700; margin:0; letter-spacing:-0.5px;">
                                EFV CUP VN
                            </h1>
                            <p style="color:rgba(255,255,255,0.7); font-size:13px; margin:8px 0 0; font-weight:300;">
                                Nen tang giai dau eFootball #1 Viet Nam
                            </p>
                        </td>
                    </tr>
                    
                    <!-- Body -->
                    <tr>
                        <td style="padding:40px;">
                            <p style="color:#1a1a2e; font-size:16px; margin:0 0 8px; font-weight:600;">
                                Xin chao ${name},
                            </p>
                            <p style="color:#6b7280; font-size:14px; line-height:1.6; margin:0 0 28px;">
                                Cam on ban da dang ky tai khoan EFV CUP. Vui long nhap ma xac minh ben duoi de kich hoat tai khoan cua ban:
                            </p>
                            
                            <!-- Code -->
                            <div style="background: linear-gradient(135deg, #f0f4ff 0%, #e8ecf9 100%); border:2px dashed #1E40AF; border-radius:12px; padding:24px; text-align:center; margin:0 0 28px;">
                                <p style="color:#6b7280; font-size:12px; text-transform:uppercase; letter-spacing:2px; margin:0 0 12px; font-weight:600;">
                                    MA XAC MINH
                                </p>
                                <div style="font-size:40px; font-weight:800; color:#1E40AF; letter-spacing:12px; font-family:'Courier New', monospace;">
                                    ${code}
                                </div>
                            </div>
                            
                            <!-- Warning -->
                            <div style="background:#fef3c7; border-left:4px solid #f59e0b; border-radius:0 8px 8px 0; padding:14px 16px; margin:0 0 28px;">
                                <p style="color:#92400e; font-size:13px; margin:0; font-weight:500;">
                                    Ma nay se het han sau <strong>5 phut</strong>. Vui long khong chia se ma nay voi bat ky ai.
                                </p>
                            </div>
                            
                            <p style="color:#9ca3af; font-size:13px; line-height:1.6; margin:0;">
                                Neu ban khong yeu cau ma nay, vui long bo qua email nay. Tai khoan cua ban se khong bi anh huong.
                            </p>
                        </td>
                    </tr>
                    
                    <!-- Footer -->
                    <tr>
                        <td style="background-color:#f9fafb; padding:20px 40px; border-top:1px solid #e5e7eb; text-align:center;">
                            <p style="color:#9ca3af; font-size:12px; margin:0;">
                                &copy; 2026 EFV CUP VN. All rights reserved.
                            </p>
                        </td>
                    </tr>
                </table>
            </td>
        </tr>
    </table>
</body>
</html>
            `,
        };

        const info = await transporter.sendMail(mailOptions);

        const previewUrl = nodemailer.getTestMessageUrl(info);
        if (previewUrl) {
            console.log("Preview email URL:", previewUrl);
        } else {
            console.log(`Verification email sent to ${email} (messageId: ${info.messageId})`);
        }

        return { success: true, previewUrl: previewUrl || undefined };
    } catch (error) {
        console.error("Send email error:", error);
        return { success: false };
    }
}

// ============================================================
// Send Reset Password email with 6-digit code
// ============================================================
export async function sendResetPasswordEmail(
    email: string,
    name: string,
    code: string
): Promise<{ success: boolean; previewUrl?: string }> {
    try {
        const config = await getSmtpConfig();
        if (!config.emailEnabled && !config.smtpHost) {
            console.log("Email not configured, skipping reset password email");
            return { success: false };
        }

        const transporter = createTransporterFromConfig(config);
        const fromAddress = `"${config.smtpFromName}" <${config.smtpFromEmail || "noreply@EFV CUP.vn"}>`;

        const mailOptions = {
            from: fromAddress,
            to: email,
            subject: `[EFV CUP] Dat lai mat khau - Ma xac nhan: ${code}`,
            html: `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin:0; padding:0; background-color:#f4f6f9; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;">
    <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f4f6f9; padding:40px 20px;">
        <tr>
            <td align="center">
                <table width="480" cellpadding="0" cellspacing="0" style="background-color:#ffffff; border-radius:16px; overflow:hidden; box-shadow:0 4px 24px rgba(0,0,0,0.08);">
                    <!-- Header -->
                    <tr>
                        <td style="background: linear-gradient(135deg, #0A3D91 0%, #1E40AF 50%, #4338CA 100%); padding:32px 40px; text-align:center;">
                            <h1 style="color:#ffffff; font-size:24px; font-weight:700; margin:0; letter-spacing:-0.5px;">
                                EFV CUP VN
                            </h1>
                            <p style="color:rgba(255,255,255,0.7); font-size:13px; margin:8px 0 0; font-weight:300;">
                                Nen tang giai dau eFootball #1 Viet Nam
                            </p>
                        </td>
                    </tr>
                    
                    <!-- Body -->
                    <tr>
                        <td style="padding:40px;">
                            <p style="color:#1a1a2e; font-size:16px; margin:0 0 8px; font-weight:600;">
                                Xin chao ${name},
                            </p>
                            <p style="color:#6b7280; font-size:14px; line-height:1.6; margin:0 0 28px;">
                                Chung toi nhan duoc yeu cau dat lai mat khau cho tai khoan cua ban. Vui long su dung ma xac nhan ben duoi:
                            </p>
                            
                            <!-- Code -->
                            <div style="background: linear-gradient(135deg, #fef3c7 0%, #fde68a 100%); border:2px dashed #f59e0b; border-radius:12px; padding:24px; text-align:center; margin:0 0 28px;">
                                <p style="color:#92400e; font-size:12px; text-transform:uppercase; letter-spacing:2px; margin:0 0 12px; font-weight:600;">
                                    MA DAT LAI MAT KHAU
                                </p>
                                <div style="font-size:40px; font-weight:800; color:#b45309; letter-spacing:12px; font-family:'Courier New', monospace;">
                                    ${code}
                                </div>
                            </div>
                            
                            <!-- Warning -->
                            <div style="background:#fef2f2; border-left:4px solid #ef4444; border-radius:0 8px 8px 0; padding:14px 16px; margin:0 0 28px;">
                                <p style="color:#991b1b; font-size:13px; margin:0; font-weight:500;">
                                    Ma nay se het han sau <strong>15 phut</strong>. Neu ban khong yeu cau dat lai mat khau, vui long bo qua email nay va doi mat khau ngay.
                                </p>
                            </div>
                            
                            <p style="color:#9ca3af; font-size:13px; line-height:1.6; margin:0;">
                                Neu ban khong yeu cau dat lai mat khau, vui long bo qua email nay. Tai khoan cua ban van an toan.
                            </p>
                        </td>
                    </tr>
                    
                    <!-- Footer -->
                    <tr>
                        <td style="background-color:#f9fafb; padding:20px 40px; border-top:1px solid #e5e7eb; text-align:center;">
                            <p style="color:#9ca3af; font-size:12px; margin:0;">
                                &copy; 2026 EFV CUP VN. All rights reserved.
                            </p>
                        </td>
                    </tr>
                </table>
            </td>
        </tr>
    </table>
</body>
</html>
            `,
        };

        const info = await transporter.sendMail(mailOptions);

        const previewUrl = nodemailer.getTestMessageUrl(info);
        if (previewUrl) {
            console.log("Reset password email preview URL:", previewUrl);
        } else {
            console.log(`Reset password email sent to ${email} (messageId: ${info.messageId})`);
        }

        return { success: true, previewUrl: previewUrl || undefined };
    } catch (error) {
        console.error("Send reset password email error:", error);
        return { success: false };
    }
}

// ============================================================
// Send generic notification email
// ============================================================
export async function sendNotificationEmail(
    email: string,
    name: string,
    title: string,
    message: string,
    link: string = "https://EFV CUP.efootball.vn"
): Promise<{ success: boolean }> {
    try {
        const config = await getSmtpConfig();
        if (!config.emailEnabled && !config.smtpHost) {
            console.log("Email not configured, skipping notification email");
            return { success: false };
        }

        const transporter = createTransporterFromConfig(config);
        const fromAddress = `"${config.smtpFromName}" <${config.smtpFromEmail || "noreply@EFV CUP.vn"}>`;

        const mailOptions = {
            from: fromAddress,
            to: email,
            subject: `[EFV CUP] ${title}`,
            html: `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
</head>
<body style="margin:0; padding:0; background-color:#f4f6f9; font-family: sans-serif;">
    <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f4f6f9; padding:40px 20px;">
        <tr>
            <td align="center">
                <table width="480" cellpadding="0" cellspacing="0" style="background-color:#ffffff; border-radius:16px; overflow:hidden; box-shadow:0 4px 24px rgba(0,0,0,0.08);">
                    <tr>
                        <td style="background: linear-gradient(135deg, #0A3D91 0%, #1E40AF 50%, #4338CA 100%); padding:24px; text-align:center;">
                            <h1 style="color:#ffffff; font-size:20px; font-weight:700; margin:0;">EFV CUP VN</h1>
                        </td>
                    </tr>
                    <tr>
                        <td style="padding:32px;">
                            <p style="color:#1a1a2e; font-size:16px; margin:0 0 16px; font-weight:600;">Xin chao ${name},</p>
                            <p style="color:#4b5563; font-size:14px; line-height:1.6; margin:0 0 24px;">${message}</p>
                            
                            <a href="${link.startsWith('http') ? link : 'https://EFV CUP.efootball.vn' + link}" 
                               style="display:inline-block; background-color:#1E40AF; color:#ffffff; padding:12px 24px; border-radius:8px; text-decoration:none; font-weight:600; font-size:14px;">
                               Xem chi tiet
                            </a>
                        </td>
                    </tr>
                    <tr>
                        <td style="background-color:#f9fafb; padding:20px; border-top:1px solid #e5e7eb; text-align:center;">
                            <p style="color:#9ca3af; font-size:12px; margin:0;">&copy; 2026 EFV CUP VN</p>
                        </td>
                    </tr>
                </table>
            </td>
        </tr>
    </table>
</body>
</html>
            `,
        };

        await transporter.sendMail(mailOptions);
        console.log(`Notification email sent to ${email}`);
        return { success: true };
    } catch (error) {
        console.error("Send notification email error:", error);
        return { success: false };
    }
}

// ============================================================
// Send Payment Invoice Email (Hoa don thanh toan)
// ============================================================
export interface InvoiceData {
    playerName: string;
    email: string;
    teamName: string;
    teamShortName: string;
    tournamentTitle: string;
    tournamentId: string;
    amount: number;
    currency?: string;
    paymentDate: Date;
    orderCode: number | string;
    reference?: string;
    paymentMethod?: string;
    registrationId: string;
    isAutoApproved?: boolean;
}

export async function sendPaymentInvoiceEmail(
    data: InvoiceData
): Promise<{ success: boolean; previewUrl?: string }> {
    try {
        const config = await getSmtpConfig();
        if (!config.emailEnabled && !config.smtpHost) {
            console.log("Email not configured, skipping invoice email");
            return { success: false };
        }

        const transporter = createTransporterFromConfig(config);
        const fromAddress = `"${config.smtpFromName}" <${config.smtpFromEmail || "noreply@EFV CUP.vn"}>`;

        const invoiceNumber = `INV-${String(data.orderCode).padStart(6, "0")}`;
        const formattedAmount = Number(data.amount).toLocaleString("vi-VN");
        const formattedDate = new Intl.DateTimeFormat("vi-VN", {
            year: "numeric",
            month: "2-digit",
            day: "2-digit",
            hour: "2-digit",
            minute: "2-digit",
            timeZone: "Asia/Ho_Chi_Minh",
        }).format(data.paymentDate instanceof Date ? data.paymentDate : new Date(data.paymentDate));

        const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://EFV CUP.efootball.vn";
        const tournamentLink = `${siteUrl}/giai-dau/${data.tournamentId}`;

        const statusMessage = data.isAutoApproved
            ? `Ban da chinh thuc duoc duyet tham gia giai dau "<strong>${data.tournamentTitle}</strong>".`
            : `Thanh toan cua ban cho giai "<strong>${data.tournamentTitle}</strong>" da duoc ghi nhan. Ban to chuc se xem xet dang ky cua ban.`;

        const mailOptions = {
            from: fromAddress,
            to: data.email,
            subject: `[EFV CUP] Hoa don thanh toan #${invoiceNumber} - ${data.tournamentTitle}`,
            html: `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Hoa don thanh toan - EFV CUP</title>
</head>
<body style="margin:0; padding:0; background-color:#f0f2f5; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; -webkit-font-smoothing:antialiased;">
    <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f0f2f5; padding:40px 20px;">
        <tr>
            <td align="center">
                <table width="560" cellpadding="0" cellspacing="0" style="background-color:#ffffff; border-radius:16px; overflow:hidden; box-shadow:0 8px 40px rgba(0,0,0,0.08);">
                    
                    <!-- HEADER -->
                    <tr>
                        <td style="background: linear-gradient(135deg, #0A3D91 0%, #1E40AF 50%, #4338CA 100%); padding:32px 40px; text-align:center;">
                            <h1 style="color:#ffffff; font-size:24px; font-weight:700; margin:0; letter-spacing:-0.5px;">
                                EFV CUP VN
                            </h1>
                            <p style="color:rgba(255,255,255,0.7); font-size:13px; margin:8px 0 0; font-weight:300;">
                                Nen tang giai dau eFootball #1 Viet Nam
                            </p>
                        </td>
                    </tr>

                    <!-- SUCCESS BANNER -->
                    <tr>
                        <td style="background: linear-gradient(135deg, #059669 0%, #10B981 100%); padding:24px 40px; text-align:center;">
                            <h2 style="color:#ffffff; font-size:20px; font-weight:700; margin:0;">
                                Thanh toan thanh cong!
                            </h2>
                            <p style="color:rgba(255,255,255,0.85); font-size:14px; margin:8px 0 0; font-weight:400;">
                                Giao dich cua ban da duoc xac nhan tu dong
                            </p>
                        </td>
                    </tr>

                    <!-- BODY -->
                    <tr>
                        <td style="padding:36px 40px 20px;">
                            <p style="color:#1a1a2e; font-size:16px; margin:0 0 8px; font-weight:600;">
                                Xin chao ${data.playerName},
                            </p>
                            <p style="color:#6b7280; font-size:14px; line-height:1.7; margin:0 0 24px;">
                                ${statusMessage}
                            </p>
                        </td>
                    </tr>

                    <!-- INVOICE BOX -->
                    <tr>
                        <td style="padding:0 40px 28px;">
                            <table width="100%" cellpadding="0" cellspacing="0" style="background:#f8fafc; border:1px solid #e2e8f0; border-radius:12px; overflow:hidden;">
                                <!-- Invoice Header -->
                                <tr>
                                    <td colspan="2" style="background:linear-gradient(135deg, #1e293b 0%, #334155 100%); padding:16px 24px;">
                                        <table width="100%" cellpadding="0" cellspacing="0">
                                            <tr>
                                                <td style="color:#ffffff; font-size:16px; font-weight:700;">
                                                    HOA DON THANH TOAN
                                                </td>
                                                <td align="right" style="color:#94a3b8; font-size:13px; font-weight:500;">
                                                    ${invoiceNumber}
                                                </td>
                                            </tr>
                                        </table>
                                    </td>
                                </tr>

                                <!-- Invoice Details -->
                                <tr>
                                    <td colspan="2" style="padding:20px 24px 0;">
                                        <table width="100%" cellpadding="0" cellspacing="0">
                                            <tr>
                                                <td style="padding:8px 0; border-bottom:1px solid #e2e8f0; color:#6b7280; font-size:13px; font-weight:500; width:140px;">
                                                    Giai dau
                                                </td>
                                                <td style="padding:8px 0; border-bottom:1px solid #e2e8f0; color:#1e293b; font-size:14px; font-weight:600; text-align:right;">
                                                    ${data.tournamentTitle}
                                                </td>
                                            </tr>
                                            <tr>
                                                <td style="padding:8px 0; border-bottom:1px solid #e2e8f0; color:#6b7280; font-size:13px; font-weight:500;">
                                                    Nguoi choi
                                                </td>
                                                <td style="padding:8px 0; border-bottom:1px solid #e2e8f0; color:#1e293b; font-size:14px; font-weight:500; text-align:right;">
                                                    ${data.playerName}
                                                </td>
                                            </tr>
                                            <tr>
                                                <td style="padding:8px 0; border-bottom:1px solid #e2e8f0; color:#6b7280; font-size:13px; font-weight:500;">
                                                    Doi
                                                </td>
                                                <td style="padding:8px 0; border-bottom:1px solid #e2e8f0; color:#1e293b; font-size:14px; font-weight:500; text-align:right;">
                                                    ${data.teamName} (${data.teamShortName})
                                                </td>
                                            </tr>
                                            <tr>
                                                <td style="padding:8px 0; border-bottom:1px solid #e2e8f0; color:#6b7280; font-size:13px; font-weight:500;">
                                                    Ma don hang
                                                </td>
                                                <td style="padding:8px 0; border-bottom:1px solid #e2e8f0; color:#1e293b; font-size:14px; font-weight:500; text-align:right; font-family:'Courier New', monospace;">
                                                    #${data.orderCode}
                                                </td>
                                            </tr>
                                            ${data.reference ? `
                                            <tr>
                                                <td style="padding:8px 0; border-bottom:1px solid #e2e8f0; color:#6b7280; font-size:13px; font-weight:500;">
                                                    Ma giao dich
                                                </td>
                                                <td style="padding:8px 0; border-bottom:1px solid #e2e8f0; color:#1e293b; font-size:14px; font-weight:500; text-align:right; font-family:'Courier New', monospace;">
                                                    ${data.reference}
                                                </td>
                                            </tr>
                                            ` : ""}
                                            <tr>
                                                <td style="padding:8px 0; border-bottom:1px solid #e2e8f0; color:#6b7280; font-size:13px; font-weight:500;">
                                                    Phuong thuc
                                                </td>
                                                <td style="padding:8px 0; border-bottom:1px solid #e2e8f0; color:#1e293b; font-size:14px; font-weight:500; text-align:right;">
                                                    ${data.paymentMethod || "PayOS - Chuyen khoan"}
                                                </td>
                                            </tr>
                                            <tr>
                                                <td style="padding:8px 0; border-bottom:1px solid #e2e8f0; color:#6b7280; font-size:13px; font-weight:500;">
                                                    Thoi gian
                                                </td>
                                                <td style="padding:8px 0; border-bottom:1px solid #e2e8f0; color:#1e293b; font-size:14px; font-weight:500; text-align:right;">
                                                    ${formattedDate}
                                                </td>
                                            </tr>
                                            <tr>
                                                <td style="padding:8px 0; border-bottom:1px solid #e2e8f0; color:#6b7280; font-size:13px; font-weight:500;">
                                                    Trang thai
                                                </td>
                                                <td style="padding:8px 0; border-bottom:1px solid #e2e8f0; text-align:right;">
                                                    <span style="display:inline-block; background:#dcfce7; color:#15803d; font-size:12px; font-weight:700; padding:4px 12px; border-radius:20px; text-transform:uppercase; letter-spacing:0.5px;">
                                                        Da thanh toan
                                                    </span>
                                                </td>
                                            </tr>
                                        </table>
                                    </td>
                                </tr>

                                <!-- TOTAL -->
                                <tr>
                                    <td colspan="2" style="padding:16px 24px;">
                                        <table width="100%" cellpadding="0" cellspacing="0" style="background:linear-gradient(135deg, #059669 0%, #10B981 100%); border-radius:10px; overflow:hidden;">
                                            <tr>
                                                <td style="padding:16px 20px; color:rgba(255,255,255,0.85); font-size:14px; font-weight:600;">
                                                    TONG THANH TOAN
                                                </td>
                                                <td align="right" style="padding:16px 20px; color:#ffffff; font-size:22px; font-weight:800; letter-spacing:-0.5px;">
                                                    ${formattedAmount} ${data.currency || "VND"}
                                                </td>
                                            </tr>
                                        </table>
                                    </td>
                                </tr>
                            </table>
                        </td>
                    </tr>

                    ${data.isAutoApproved ? `
                    <!-- AUTO-APPROVE NOTICE -->
                    <tr>
                        <td style="padding:0 40px 24px;">
                            <div style="background:#eff6ff; border-left:4px solid #3b82f6; border-radius:0 8px 8px 0; padding:14px 16px;">
                                <p style="color:#1e40af; font-size:13px; margin:0; font-weight:600;">
                                    Dang ky da duoc tu dong duyet!
                                </p>
                                <p style="color:#3b82f6; font-size:12px; margin:6px 0 0; line-height:1.5;">
                                    Ban da chinh thuc tham gia giai dau. Hay kiem tra lich thi dau va chuan bi cho tran dau dau tien!
                                </p>
                            </div>
                        </td>
                    </tr>
                    ` : ""}

                    <!-- CTA BUTTON -->
                    <tr>
                        <td style="padding:0 40px 32px; text-align:center;">
                            <a href="${tournamentLink}" 
                               style="display:inline-block; background:linear-gradient(135deg, #1E40AF 0%, #4338CA 100%); color:#ffffff; padding:14px 32px; border-radius:10px; text-decoration:none; font-weight:700; font-size:14px; box-shadow:0 4px 14px rgba(30,64,175,0.3);">
                                Xem giai dau
                            </a>
                        </td>
                    </tr>

                    <!-- NOTE -->
                    <tr>
                        <td style="padding:0 40px 28px;">
                            <div style="background:#fefce8; border-left:4px solid #eab308; border-radius:0 8px 8px 0; padding:14px 16px;">
                                <p style="color:#854d0e; font-size:12px; margin:0; line-height:1.6;">
                                    <strong>Luu y:</strong> Day la email xac nhan tu dong. Vui long luu lai hoa don nay. Neu can ho tro, lien he Ban to chuc qua email hoac fanpage.
                                </p>
                            </div>
                        </td>
                    </tr>

                    <!-- FOOTER -->
                    <tr>
                        <td style="background-color:#f9fafb; padding:24px 40px; border-top:1px solid #e5e7eb; text-align:center;">
                            <p style="color:#6b7280; font-size:12px; margin:0 0 4px;">
                                Ma dang ky: <span style="font-family:'Courier New',monospace; color:#1e293b;">${data.registrationId}</span>
                            </p>
                            <p style="color:#9ca3af; font-size:11px; margin:0 0 8px;">
                                Email nay duoc gui tu dong tu he thong EFV CUP VN
                            </p>
                            <p style="color:#9ca3af; font-size:11px; margin:0;">
                                &copy; 2026 EFV CUP VN. All rights reserved.
                            </p>
                        </td>
                    </tr>
                </table>
            </td>
        </tr>
    </table>
</body>
</html>
            `,
        };

        const info = await transporter.sendMail(mailOptions);

        const previewUrl = nodemailer.getTestMessageUrl(info);
        if (previewUrl) {
            console.log("Invoice email preview URL:", previewUrl);
        } else {
            console.log(`Invoice email sent to ${data.email} (messageId: ${info.messageId})`);
        }

        return { success: true, previewUrl: previewUrl || undefined };
    } catch (error) {
        console.error("Send invoice email error:", error);
        return { success: false };
    }
}

// ============================================================
// Send Test Email (for admin to test SMTP config)
// ============================================================
export async function sendTestEmail(
    toEmail: string
): Promise<{ success: boolean; error?: string; previewUrl?: string }> {
    try {
        const config = await getSmtpConfig();
        const transporter = createTransporterFromConfig(config);
        const fromAddress = `"${config.smtpFromName}" <${config.smtpFromEmail || "noreply@EFV CUP.vn"}>`;

        const mailOptions = {
            from: fromAddress,
            to: toEmail,
            subject: "[EFV CUP] Email test - Kiem tra cau hinh SMTP",
            html: `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="margin:0; padding:0; background-color:#f4f6f9; font-family: sans-serif;">
    <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f4f6f9; padding:40px 20px;">
        <tr>
            <td align="center">
                <table width="480" cellpadding="0" cellspacing="0" style="background-color:#ffffff; border-radius:16px; overflow:hidden; box-shadow:0 4px 24px rgba(0,0,0,0.08);">
                    <tr>
                        <td style="background: linear-gradient(135deg, #0A3D91 0%, #1E40AF 50%, #4338CA 100%); padding:24px; text-align:center;">
                            <h1 style="color:#ffffff; font-size:20px; font-weight:700; margin:0;">EFV CUP VN</h1>
                        </td>
                    </tr>
                    <tr>
                        <td style="padding:32px;">
                            <div style="background:#dcfce7; border-left:4px solid #22c55e; border-radius:0 8px 8px 0; padding:16px; margin:0 0 20px;">
                                <p style="color:#15803d; font-size:14px; margin:0; font-weight:600;">
                                    Cau hinh SMTP hoat dong tot!
                                </p>
                            </div>
                            <p style="color:#4b5563; font-size:14px; line-height:1.6; margin:0 0 16px;">
                                Day la email kiem tra cau hinh SMTP tu trang quan tri EFV CUP VN.
                            </p>
                            <table width="100%" cellpadding="0" cellspacing="0" style="background:#f8fafc; border:1px solid #e2e8f0; border-radius:8px;">
                                <tr>
                                    <td style="padding:12px 16px; border-bottom:1px solid #e2e8f0; color:#6b7280; font-size:13px;">SMTP Host</td>
                                    <td style="padding:12px 16px; border-bottom:1px solid #e2e8f0; color:#1e293b; font-size:13px; font-weight:500; text-align:right; font-family:monospace;">${config.smtpHost || "N/A"}</td>
                                </tr>
                                <tr>
                                    <td style="padding:12px 16px; border-bottom:1px solid #e2e8f0; color:#6b7280; font-size:13px;">Port</td>
                                    <td style="padding:12px 16px; border-bottom:1px solid #e2e8f0; color:#1e293b; font-size:13px; font-weight:500; text-align:right;">${config.smtpPort}</td>
                                </tr>
                                <tr>
                                    <td style="padding:12px 16px; color:#6b7280; font-size:13px;">Sender</td>
                                    <td style="padding:12px 16px; color:#1e293b; font-size:13px; font-weight:500; text-align:right;">${config.smtpFromName} &lt;${config.smtpFromEmail}&gt;</td>
                                </tr>
                            </table>
                            <p style="color:#9ca3af; font-size:12px; margin:16px 0 0; line-height:1.5;">
                                Neu ban nhan duoc email nay, cau hinh SMTP da dung. He thong san sang gui email tu dong (xac minh tai khoan, hoa don thanh toan...).
                            </p>
                        </td>
                    </tr>
                    <tr>
                        <td style="background-color:#f9fafb; padding:16px; border-top:1px solid #e5e7eb; text-align:center;">
                            <p style="color:#9ca3af; font-size:11px; margin:0;">&copy; 2026 EFV CUP VN. All rights reserved.</p>
                        </td>
                    </tr>
                </table>
            </td>
        </tr>
    </table>
</body>
</html>
            `,
        };

        const info = await transporter.sendMail(mailOptions);
        const previewUrl = nodemailer.getTestMessageUrl(info);

        if (previewUrl) {
            console.log("Test email preview URL:", previewUrl);
        } else {
            console.log(`Test email sent to ${toEmail}`);
        }

        return { success: true, previewUrl: previewUrl || undefined };
    } catch (error: any) {
        console.error("Send test email error:", error);
        return { success: false, error: error.message || "Unknown error" };
    }
}
