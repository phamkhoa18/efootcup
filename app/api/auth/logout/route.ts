import { NextRequest, NextResponse } from "next/server";
import { apiResponse } from "@/lib/auth";

// POST /api/auth/logout
export async function POST(req: NextRequest) {
    const response = apiResponse(null, 200, "Đăng xuất thành công");

    response.cookies.set("token", "", {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        maxAge: 0,
        path: "/",
    });

    return response;
}
