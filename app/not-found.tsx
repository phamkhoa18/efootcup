import Link from "next/link";

export default function NotFound() {
    return (
        <div className="min-h-screen flex items-center justify-center bg-[#FAFBFC] px-4">
            <div className="text-center max-w-sm">
                {/* Animated 404 number */}
                <div className="relative mb-6">
                    <div className="text-[120px] sm:text-[140px] font-extrabold leading-none tracking-tighter text-transparent bg-clip-text bg-gradient-to-br from-blue-600 via-indigo-500 to-purple-600 select-none">
                        404
                    </div>
                    <div className="absolute inset-0 text-[120px] sm:text-[140px] font-extrabold leading-none tracking-tighter text-blue-100/40 blur-md select-none pointer-events-none">
                        404
                    </div>
                </div>

                {/* Message */}
                <h1 className="text-lg font-semibold text-gray-700 mb-1.5">
                    Trang không tồn tại
                </h1>
                <p className="text-[13px] text-gray-400 leading-relaxed mb-6">
                    Trang bạn đang tìm kiếm không tồn tại hoặc đã bị di chuyển.
                </p>

                {/* Actions */}
                <div className="flex items-center justify-center gap-2.5">
                    <Link
                        href="/"
                        className="inline-flex items-center gap-1.5 px-4 py-2 text-[13px] font-medium text-white bg-gradient-to-r from-blue-600 to-indigo-600 rounded-lg hover:opacity-90 transition-opacity shadow-sm"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" /><polyline points="9 22 9 12 15 12 15 22" />
                        </svg>
                        Trang chủ
                    </Link>
                    <Link
                        href="/bxh"
                        className="inline-flex items-center gap-1.5 px-4 py-2 text-[13px] font-medium text-gray-600 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M6 9H4.5a2.5 2.5 0 0 1 0-5C7 4 9 8 9 8" /><path d="M18 9h1.5a2.5 2.5 0 0 0 0-5C17 4 15 8 15 8" /><path d="M4 22h16" /><path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20 7 22" /><path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20 17 22" /><path d="M18 2H6v7a6 6 0 1 0 12 0V2Z" />
                        </svg>
                        BXH
                    </Link>
                </div>

                {/* Subtle branding */}
                <p className="text-[11px] text-gray-300 mt-8">
                    efootball.vn
                </p>
            </div>
        </div>
    );
}
