"use client";

import { AlertTriangle, Lock, LogIn, Settings } from "lucide-react";
import Link from "next/link";
import { motion } from "framer-motion";

export function MaintenanceView() {
    return (
        <div className="min-h-screen bg-[#F8F9FC] flex items-center justify-center p-4">
            <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="max-w-lg w-full bg-white rounded-[2rem] shadow-xl p-8 sm:p-12 text-center"
            >
                <div className="relative w-28 h-28 mx-auto mb-8">
                    <div className="absolute inset-0 bg-amber-100 rounded-full animate-ping opacity-20"></div>
                    <div className="relative w-full h-full bg-amber-50 rounded-full flex items-center justify-center shadow-inner border border-amber-100">
                        <Settings className="w-14 h-14 text-amber-500 animate-[spin_4s_linear_infinite]" />
                    </div>
                    <div className="absolute -bottom-2 -right-2 w-10 h-10 bg-white rounded-full shadow-lg flex items-center justify-center border border-gray-100">
                        <AlertTriangle className="w-5 h-5 text-amber-500" />
                    </div>
                </div>
                
                <h1 className="text-3xl font-extrabold text-gray-900 mb-4 tracking-tight">
                    Hệ Thống Đang Bảo Trì
                </h1>
                
                <p className="text-base text-gray-500 mb-10 leading-relaxed font-medium">
                    Website hiện đang tạm ngừng hoạt động để nâng cấp và khắc phục sự cố. Chúng tôi sẽ sớm trở lại. Xin lỗi vì sự bất tiện này!
                </p>
                
                <div className="space-y-4">
                    <Link 
                        href="/dang-nhap" 
                        className="w-full flex items-center justify-center gap-2 bg-[#0A3D91] text-white rounded-2xl py-4 font-semibold hover:bg-blue-800 transition-all shadow-lg shadow-blue-900/20 active:scale-[0.98]"
                    >
                        <LogIn className="w-5 h-5" />
                        Đăng nhập hệ thống
                    </Link>
                    <Link 
                        href="/admin" 
                        className="w-full flex items-center justify-center gap-2 bg-gray-50 text-gray-600 rounded-2xl py-4 font-semibold hover:bg-gray-100 hover:text-gray-900 transition-all border border-gray-100 active:scale-[0.98]"
                    >
                        <Lock className="w-5 h-5 text-gray-400" />
                        Trang Quản Trị
                    </Link>
                </div>
            </motion.div>
        </div>
    );
}
