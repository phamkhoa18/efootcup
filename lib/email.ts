import nodemailer from "nodemailer";

// Create reusable transporter
function createTransporter() {
    // Use Ethereal for development if no SMTP config provided
    if (process.env.SMTP_HOST) {
        return nodemailer.createTransport({
            host: process.env.SMTP_HOST,
            port: parseInt(process.env.SMTP_PORT || "587"),
            secure: process.env.SMTP_SECURE === "true",
            auth: {
                user: process.env.SMTP_USER,
                pass: process.env.SMTP_PASS,
            },
        });
    }

    // Fallback: use Ethereal for testing
    return nodemailer.createTransport({
        host: "smtp.ethereal.email",
        port: 587,
        auth: {
            user: process.env.ETHEREAL_USER || "",
            pass: process.env.ETHEREAL_PASS || "",
        },
    });
}

// Generate a random 4-digit verification code
export function generateVerificationCode(): string {
    return Math.floor(1000 + Math.random() * 9000).toString();
}

// Send verification email with 4-digit code
export async function sendVerificationEmail(
    email: string,
    name: string,
    code: string
): Promise<{ success: boolean; previewUrl?: string }> {
    try {
        const transporter = createTransporter();

        const mailOptions = {
            from: `"eFootCup VN" <${process.env.SMTP_FROM || "noreply@efootcup.vn"}>`,
            to: email,
            subject: `[eFootCup] Mã xác minh: ${code}`,
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
                                ⚽ eFootCup VN
                            </h1>
                            <p style="color:rgba(255,255,255,0.7); font-size:13px; margin:8px 0 0; font-weight:300;">
                                Nền tảng giải đấu eFootball #1 Việt Nam
                            </p>
                        </td>
                    </tr>
                    
                    <!-- Body -->
                    <tr>
                        <td style="padding:40px;">
                            <p style="color:#1a1a2e; font-size:16px; margin:0 0 8px; font-weight:600;">
                                Xin chào ${name}! 👋
                            </p>
                            <p style="color:#6b7280; font-size:14px; line-height:1.6; margin:0 0 28px;">
                                Cảm ơn bạn đã đăng ký tài khoản eFootCup. Vui lòng nhập mã xác minh bên dưới để kích hoạt tài khoản của bạn:
                            </p>
                            
                            <!-- Code -->
                            <div style="background: linear-gradient(135deg, #f0f4ff 0%, #e8ecf9 100%); border:2px dashed #1E40AF; border-radius:12px; padding:24px; text-align:center; margin:0 0 28px;">
                                <p style="color:#6b7280; font-size:12px; text-transform:uppercase; letter-spacing:2px; margin:0 0 12px; font-weight:600;">
                                    Mã xác minh
                                </p>
                                <div style="font-size:40px; font-weight:800; color:#1E40AF; letter-spacing:12px; font-family:'Courier New', monospace;">
                                    ${code}
                                </div>
                            </div>
                            
                            <!-- Warning -->
                            <div style="background:#fef3c7; border-left:4px solid #f59e0b; border-radius:0 8px 8px 0; padding:14px 16px; margin:0 0 28px;">
                                <p style="color:#92400e; font-size:13px; margin:0; font-weight:500;">
                                    ⏱ Mã này sẽ hết hạn sau <strong>5 phút</strong>. Vui lòng không chia sẻ mã này với bất kỳ ai.
                                </p>
                            </div>
                            
                            <p style="color:#9ca3af; font-size:13px; line-height:1.6; margin:0;">
                                Nếu bạn không yêu cầu mã này, vui lòng bỏ qua email này. Tài khoản của bạn sẽ không bị ảnh hưởng.
                            </p>
                        </td>
                    </tr>
                    
                    <!-- Footer -->
                    <tr>
                        <td style="background-color:#f9fafb; padding:20px 40px; border-top:1px solid #e5e7eb; text-align:center;">
                            <p style="color:#9ca3af; font-size:12px; margin:0;">
                                © 2026 eFootCup VN. All rights reserved.
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

        // Log preview URL for Ethereal, or confirmation for real SMTP
        const previewUrl = nodemailer.getTestMessageUrl(info);
        if (previewUrl) {
            console.log("📧 Preview email URL:", previewUrl);
        } else {
            console.log(`📧 Verification email sent to ${email} (messageId: ${info.messageId})`);
        }

        return { success: true, previewUrl: previewUrl || undefined };
    } catch (error) {
        console.error("❌ Send email error:", error);
        return { success: false };
    }
}

// Send generic notification email
export async function sendNotificationEmail(
    email: string,
    name: string,
    title: string,
    message: string,
    link: string = "https://efootcup.efootball.vn"
): Promise<{ success: boolean }> {
    try {
        const transporter = createTransporter();

        const mailOptions = {
            from: `"eFootCup VN" <${process.env.SMTP_FROM || "noreply@efootcup.vn"}>`,
            to: email,
            subject: `[eFootCup] ${title}`,
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
                        <td style="background: #0A3D91; padding:24px; text-align:center;">
                            <h1 style="color:#ffffff; font-size:20px; font-weight:700; margin:0;">⚽ eFootCup VN</h1>
                        </td>
                    </tr>
                    <tr>
                        <td style="padding:32px;">
                            <p style="color:#1a1a2e; font-size:16px; margin:0 0 16px; font-weight:600;">Xin chào ${name},</p>
                            <p style="color:#4b5563; font-size:14px; line-height:1.6; margin:0 0 24px;">${message}</p>
                            
                            <a href="${link.startsWith('http') ? link : 'https://efootcup.efootball.vn' + link}" 
                               style="display:inline-block; background-color:#1E40AF; color:#ffffff; padding:12px 24px; border-radius:8px; text-decoration:none; font-weight:600; font-size:14px;">
                               Xem chi tiết
                            </a>
                        </td>
                    </tr>
                    <tr>
                        <td style="background-color:#f9fafb; padding:20px; border-top:1px solid #e5e7eb; text-align:center;">
                            <p style="color:#9ca3af; font-size:12px; margin:0;">© 2026 eFootCup VN</p>
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
        console.log(`📧 Notification email sent to ${email}`);
        return { success: true };
    } catch (error) {
        console.error("❌ Send notification email error:", error);
        return { success: false };
    }
}
