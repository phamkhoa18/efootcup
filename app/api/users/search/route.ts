import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/mongodb";
import User from "@/models/User";
import { requireAuth } from "@/lib/auth";

export async function GET(req: NextRequest) {
    try {
        const auth = await requireAuth(req);
        if (auth instanceof Response) return auth;

        await dbConnect();
        const { searchParams } = new URL(req.url);
        const q = searchParams.get('q');
        
        if (!q || q.trim().length === 0) {
            return NextResponse.json({ success: true, data: [] });
        }

        const searchTerm = q.trim();
        const isNum = !isNaN(Number(searchTerm));

        const query: any = { 
            $or: [
                { name: { $regex: searchTerm, $options: 'i' } },
                { nickname: { $regex: searchTerm, $options: 'i' } }
            ]
        };
        
        if (isNum) {
            query.$or.push({ efvId: Number(searchTerm) });
        }

        // Return only safe public info needed for autofill for VĐV 2 (exclude emails, passwords, specific personal details unless needed for form)
        // Wait, the form needs: name, gamerId, nickname, facebookName, facebookLink
        const users = await User.find(query)
            .select('efvId name nickname avatar gamerId facebookName facebookLink phone')
            .limit(10)
            .lean();

        return NextResponse.json({ success: true, data: users });
    } catch (error) {
        console.error("Search users error:", error);
        return NextResponse.json({ success: false, message: "Lỗi nội bộ." }, { status: 500 });
    }
}
