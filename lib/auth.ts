import { NextRequest, NextResponse } from "next/server";
import jwt from "jsonwebtoken";
import User, { IUser } from "@/models/User";
import dbConnect from "@/lib/mongodb";

const JWT_SECRET = process.env.JWT_SECRET || "efootcup_secret";

export interface AuthUser {
    _id: string;
    name: string;
    email: string;
    role: "manager" | "user";
}

// Generate JWT token
export function generateToken(user: IUser): string {
    const expiresIn = (process.env.JWT_EXPIRES_IN || "7d") as string;
    return jwt.sign(
        {
            _id: user._id.toString(),
            name: user.name,
            email: user.email,
            role: user.role,
        },
        JWT_SECRET,
        { expiresIn: expiresIn as any }
    );
}

// Verify JWT token
export function verifyToken(token: string): AuthUser | null {
    try {
        const decoded = jwt.verify(token, JWT_SECRET) as AuthUser;
        return decoded;
    } catch {
        return null;
    }
}

// Get current user from request
export async function getCurrentUser(
    req: NextRequest
): Promise<AuthUser | null> {
    // Check Authorization header
    const authHeader = req.headers.get("authorization");
    let token: string | null = null;

    if (authHeader?.startsWith("Bearer ")) {
        token = authHeader.substring(7);
    }

    // Check cookie
    if (!token) {
        token = req.cookies.get("token")?.value || null;
    }

    if (!token) return null;

    const decoded = verifyToken(token);
    return decoded;
}

// Middleware: require authentication
export async function requireAuth(
    req: NextRequest
): Promise<{ user: AuthUser } | NextResponse> {
    const user = await getCurrentUser(req);

    if (!user) {
        return NextResponse.json(
            { success: false, message: "Vui lòng đăng nhập" },
            { status: 401 }
        );
    }

    return { user };
}

// Middleware: require manager role
export async function requireManager(
    req: NextRequest
): Promise<{ user: AuthUser } | NextResponse> {
    const result = await requireAuth(req);

    if (result instanceof NextResponse) return result;

    if (result.user.role !== "manager") {
        return NextResponse.json(
            { success: false, message: "Bạn không có quyền thực hiện thao tác này" },
            { status: 403 }
        );
    }

    return result;
}

// Middleware: require specific roles
export async function requireRole(
    req: NextRequest,
    roles: string[]
): Promise<{ user: AuthUser } | NextResponse> {
    const result = await requireAuth(req);

    if (result instanceof NextResponse) return result;

    if (!roles.includes(result.user.role)) {
        return NextResponse.json(
            { success: false, message: "Bạn không có quyền thực hiện thao tác này" },
            { status: 403 }
        );
    }

    return result;
}

// Helper: standard API response
export function apiResponse(
    data: unknown,
    status: number = 200,
    message: string = "Thành công"
) {
    return NextResponse.json(
        { success: status < 400, message, data },
        { status }
    );
}

export function apiError(message: string, status: number = 400) {
    return NextResponse.json({ success: false, message, data: null }, { status });
}
