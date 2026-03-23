import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Metadata } from "next";
import { getSiteSettings } from "@/lib/site-settings";

export const dynamic = "force-dynamic";
export const revalidate = 0;

function toAbsoluteUrl(url: string, siteUrl: string): string {
    if (!url) return "";
    if (url.startsWith("http://") || url.startsWith("https://")) return url;
    const base = siteUrl.replace(/\/$/, "");
    return `${base}${url.startsWith("/") ? url : "/" + url}`;
}

export async function generateMetadata(): Promise<Metadata> {
    const s = await getSiteSettings();
    const siteUrl = s.siteUrl || "https://efootball.vn";
    const title = "Chính sách bảo mật";
    const description = `Chính sách bảo mật và quyền riêng tư của nền tảng ${s.siteName}.`;
    const imageUrl = toAbsoluteUrl(s.ogImage || "/assets/efootball_bg.webp", siteUrl);

    return {
        title,
        description,
        openGraph: {
            title: `${title} | ${s.siteName}`,
            description,
            url: `${siteUrl}/chinh-sach`,
            siteName: s.siteName,
            images: [{ url: imageUrl, width: 1200, height: 630, alt: title }],
            locale: "vi_VN",
            type: "website",
        },
        twitter: {
            card: "summary_large_image",
            title,
            description,
            images: [imageUrl],
        },
    };
}

export default function ChinhSachPage() {
    return (
        <div className="min-h-screen bg-[#FAFBFC] pt-20 pb-16">
            <div className="max-w-[720px] mx-auto px-4 sm:px-6">
                {/* Back */}
                <Link
                    href="/"
                    className="inline-flex items-center gap-1.5 text-[13px] text-gray-400 hover:text-gray-600 transition-colors mb-6"
                >
                    <ArrowLeft className="w-3.5 h-3.5" />
                    Trang chủ
                </Link>

                {/* Header */}
                <h1 className="text-2xl font-semibold text-gray-800 mb-1">Chính sách bảo mật</h1>
                <p className="text-[13px] text-gray-400 mb-8">Cập nhật lần cuối: 08/03/2026</p>

                {/* Content */}
                <div className="bg-white rounded-xl border border-gray-100 p-6 sm:p-8 space-y-6 text-[14px] text-gray-600 leading-relaxed">

                    <section>
                        <h2 className="text-base font-semibold text-gray-800 mb-2">1. Thu thập thông tin</h2>
                        <p className="mb-2">Khi đăng ký và sử dụng nền tảng, chúng tôi thu thập các thông tin sau:</p>
                        <ul className="list-disc pl-5 space-y-1.5">
                            <li><strong>Thông tin cá nhân:</strong> Họ tên, email, số điện thoại, nickname, tên team.</li>
                            <li><strong>Thông tin tài khoản game:</strong> eFootball ID, Gamer ID.</li>
                            <li><strong>Thông tin mạng xã hội:</strong> Link Facebook (nếu cung cấp).</li>
                            <li><strong>Dữ liệu hoạt động:</strong> Lịch sử thi đấu, điểm số, xếp hạng.</li>
                            <li><strong>Thông tin kỹ thuật:</strong> Địa chỉ IP, loại trình duyệt, thời gian truy cập.</li>
                        </ul>
                    </section>

                    <section>
                        <h2 className="text-base font-semibold text-gray-800 mb-2">2. Mục đích sử dụng</h2>
                        <p className="mb-2">Thông tin được sử dụng cho các mục đích sau:</p>
                        <ul className="list-disc pl-5 space-y-1.5">
                            <li>Quản lý tài khoản và xác thực người dùng.</li>
                            <li>Tổ chức và quản lý giải đấu.</li>
                            <li>Tính toán điểm EFV và cập nhật bảng xếp hạng.</li>
                            <li>Gửi thông báo về giải đấu, kết quả và cập nhật hệ thống.</li>
                            <li>Cải thiện trải nghiệm người dùng và chất lượng dịch vụ.</li>
                            <li>Ngăn chặn gian lận và đảm bảo tính công bằng.</li>
                        </ul>
                    </section>

                    <section>
                        <h2 className="text-base font-semibold text-gray-800 mb-2">3. Chia sẻ thông tin</h2>
                        <p className="mb-2">Chúng tôi <strong>không bán</strong> thông tin cá nhân của bạn. Thông tin có thể được chia sẻ trong các trường hợp:</p>
                        <ul className="list-disc pl-5 space-y-1.5">
                            <li><strong>Hồ sơ công khai:</strong> Tên, nickname, team, điểm EFV và xếp hạng hiển thị trên bảng xếp hạng.</li>
                            <li><strong>Ban tổ chức giải đấu:</strong> Thông tin đăng ký giải đấu được chia sẻ với quản lý giải để liên lạc.</li>
                            <li><strong>Yêu cầu pháp lý:</strong> Khi có yêu cầu hợp lệ từ cơ quan chức năng.</li>
                        </ul>
                    </section>

                    <section>
                        <h2 className="text-base font-semibold text-gray-800 mb-2">4. Bảo mật dữ liệu</h2>
                        <ul className="list-disc pl-5 space-y-1.5">
                            <li>Mật khẩu được mã hóa một chiều (hash) và không thể xem dạng gốc.</li>
                            <li>Xác thực bằng token JWT có thời hạn.</li>
                            <li>Truy cập dữ liệu được giới hạn theo quyền hạn (user/manager/admin).</li>
                            <li>Hệ thống được bảo vệ bởi các biện pháp an ninh tiêu chuẩn.</li>
                        </ul>
                    </section>

                    <section>
                        <h2 className="text-base font-semibold text-gray-800 mb-2">5. Cookie và theo dõi</h2>
                        <p>
                            Chúng tôi sử dụng cookie để duy trì phiên đăng nhập và cải thiện trải nghiệm.
                            Nền tảng có thể sử dụng Google Analytics để thu thập dữ liệu truy cập ẩn danh
                            nhằm phân tích và cải thiện dịch vụ.
                        </p>
                    </section>

                    <section>
                        <h2 className="text-base font-semibold text-gray-800 mb-2">6. Quyền của người dùng</h2>
                        <p className="mb-2">Bạn có các quyền sau đối với dữ liệu cá nhân:</p>
                        <ul className="list-disc pl-5 space-y-1.5">
                            <li><strong>Xem và chỉnh sửa:</strong> Cập nhật thông tin cá nhân qua trang cá nhân.</li>
                            <li><strong>Xóa tài khoản:</strong> Liên hệ admin để yêu cầu xóa tài khoản và dữ liệu.</li>
                            <li><strong>Xuất dữ liệu:</strong> Yêu cầu bản sao dữ liệu cá nhân của bạn.</li>
                        </ul>
                    </section>

                    <section>
                        <h2 className="text-base font-semibold text-gray-800 mb-2">7. Lưu trữ dữ liệu</h2>
                        <p>
                            Dữ liệu được lưu trữ trên hệ thống cloud an toàn.
                            Lịch sử thi đấu và điểm số được giữ lại ngay cả khi tài khoản bị vô hiệu hóa
                            để đảm bảo tính toàn vẹn của bảng xếp hạng.
                        </p>
                    </section>

                    <section>
                        <h2 className="text-base font-semibold text-gray-800 mb-2">8. Thay đổi chính sách</h2>
                        <p>
                            Chính sách bảo mật có thể được cập nhật theo thời gian.
                            Chúng tôi sẽ thông báo về các thay đổi quan trọng qua email hoặc thông báo trên nền tảng.
                        </p>
                    </section>

                    <section>
                        <h2 className="text-base font-semibold text-gray-800 mb-2">9. Liên hệ</h2>
                        <p>
                            Nếu có câu hỏi về chính sách bảo mật, vui lòng liên hệ qua fanpage chính thức
                            hoặc gửi email đến địa chỉ hỗ trợ được cung cấp trên website.
                        </p>
                    </section>
                </div>
            </div>
        </div>
    );
}
