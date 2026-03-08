import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export const metadata = {
    title: "Điều khoản sử dụng",
    description: "Điều khoản sử dụng của nền tảng eFootball Vietnam.",
};

export default function DieuKhoanPage() {
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
                <h1 className="text-2xl font-semibold text-gray-800 mb-1">Điều khoản sử dụng</h1>
                <p className="text-[13px] text-gray-400 mb-8">Cập nhật lần cuối: 08/03/2026</p>

                {/* Content */}
                <div className="bg-white rounded-xl border border-gray-100 p-6 sm:p-8 space-y-6 text-[14px] text-gray-600 leading-relaxed">

                    <section>
                        <h2 className="text-base font-semibold text-gray-800 mb-2">1. Giới thiệu</h2>
                        <p>
                            Chào mừng bạn đến với <strong>eFootball Vietnam</strong> (efootball.vn). Bằng việc truy cập và sử dụng nền tảng,
                            bạn đồng ý tuân thủ các điều khoản và điều kiện dưới đây. Nếu bạn không đồng ý, vui lòng ngừng sử dụng dịch vụ.
                        </p>
                    </section>

                    <section>
                        <h2 className="text-base font-semibold text-gray-800 mb-2">2. Tài khoản người dùng</h2>
                        <ul className="list-disc pl-5 space-y-1.5">
                            <li>Mỗi người chỉ được đăng ký <strong>một tài khoản duy nhất</strong>.</li>
                            <li>Bạn chịu trách nhiệm bảo mật thông tin đăng nhập của mình.</li>
                            <li>Thông tin đăng ký phải chính xác và trung thực.</li>
                            <li>Chúng tôi có quyền khóa hoặc xóa tài khoản vi phạm mà không cần thông báo trước.</li>
                        </ul>
                    </section>

                    <section>
                        <h2 className="text-base font-semibold text-gray-800 mb-2">3. Quy tắc thi đấu</h2>
                        <ul className="list-disc pl-5 space-y-1.5">
                            <li>Người chơi phải tuân thủ luật chơi do ban tổ chức giải đấu quy định.</li>
                            <li>Nghiêm cấm sử dụng phần mềm gian lận, hack, hoặc bất kỳ hành vi nào ảnh hưởng đến tính công bằng.</li>
                            <li>Kết quả thi đấu do hệ thống ghi nhận hoặc ban tổ chức xác nhận là kết quả chính thức.</li>
                            <li>Tranh chấp kết quả sẽ được giải quyết bởi ban tổ chức giải đấu, quyết định của ban tổ chức là cuối cùng.</li>
                        </ul>
                    </section>

                    <section>
                        <h2 className="text-base font-semibold text-gray-800 mb-2">4. Hành vi bị cấm</h2>
                        <ul className="list-disc pl-5 space-y-1.5">
                            <li>Sử dụng ngôn ngữ thô tục, xúc phạm, phân biệt đối xử.</li>
                            <li>Spam, quảng cáo trái phép trên nền tảng.</li>
                            <li>Giả mạo danh tính người khác.</li>
                            <li>Cố tình phá hoại giải đấu hoặc gây ảnh hưởng tiêu cực.</li>
                            <li>Dàn xếp tỉ số hoặc bán độ dưới mọi hình thức.</li>
                        </ul>
                    </section>

                    <section>
                        <h2 className="text-base font-semibold text-gray-800 mb-2">5. Phí và thanh toán</h2>
                        <p>
                            Một số giải đấu có thể yêu cầu phí tham gia. Phí này được quy định bởi ban tổ chức giải đấu.
                            Chính sách hoàn trả phí do ban tổ chức giải đấu quyết định.
                            eFootball Vietnam không chịu trách nhiệm về các khoản phí giữa người chơi và ban tổ chức.
                        </p>
                    </section>

                    <section>
                        <h2 className="text-base font-semibold text-gray-800 mb-2">6. Bảng xếp hạng và điểm EFV</h2>
                        <p>
                            Điểm EFV và bảng xếp hạng được tính toán tự động dựa trên kết quả thi đấu.
                            Hệ thống có quyền điều chỉnh điểm trong trường hợp phát hiện sai sót hoặc gian lận.
                            Điểm EFV không có giá trị quy đổi thành tiền mặt.
                        </p>
                    </section>

                    <section>
                        <h2 className="text-base font-semibold text-gray-800 mb-2">7. Quyền sở hữu trí tuệ</h2>
                        <p>
                            Toàn bộ nội dung trên nền tảng bao gồm giao diện, logo, mã nguồn thuộc quyền sở hữu của eFootball Vietnam.
                            Nghiêm cấm sao chép, phân phối lại mà không có sự đồng ý bằng văn bản.
                        </p>
                    </section>

                    <section>
                        <h2 className="text-base font-semibold text-gray-800 mb-2">8. Giới hạn trách nhiệm</h2>
                        <p>
                            eFootball Vietnam cung cấp nền tảng &quot;nguyên trạng&quot; và không đảm bảo dịch vụ hoạt động liên tục không gián đoạn.
                            Chúng tôi không chịu trách nhiệm về bất kỳ thiệt hại trực tiếp hoặc gián tiếp phát sinh từ việc sử dụng nền tảng.
                        </p>
                    </section>

                    <section>
                        <h2 className="text-base font-semibold text-gray-800 mb-2">9. Thay đổi điều khoản</h2>
                        <p>
                            Chúng tôi có quyền thay đổi điều khoản sử dụng bất cứ lúc nào.
                            Việc tiếp tục sử dụng nền tảng sau khi thay đổi đồng nghĩa với việc bạn chấp nhận các điều khoản mới.
                        </p>
                    </section>

                    <section>
                        <h2 className="text-base font-semibold text-gray-800 mb-2">10. Liên hệ</h2>
                        <p>
                            Nếu có bất kỳ câu hỏi nào, vui lòng liên hệ qua fanpage chính thức hoặc email hỗ trợ trên website.
                        </p>
                    </section>
                </div>
            </div>
        </div>
    );
}
