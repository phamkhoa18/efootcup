import { NextRequest } from "next/server";
import { writeFile, mkdir } from "fs/promises";
import path from "path";
import { requireAuth, apiResponse, apiError } from "@/lib/auth";

// POST /api/upload — Upload an image (avatar, payment_proof, etc.)
export async function POST(req: NextRequest) {
    try {
        const authResult = await requireAuth(req);
        if (authResult instanceof Response) return authResult;

        const formData = await req.formData();
        const file = formData.get("file") as File | null;
        const type = (formData.get("type") as string) || "general";

        if (!file) {
            return apiError("Vui lòng chọn file", 400);
        }

        // Allowed types for authenticated users
        const allowedTypes = ["general", "avatar", "payment_proof", "registration", "screenshot"];
        if (!allowedTypes.includes(type)) {
            return apiError("Loại file không hợp lệ", 400);
        }

        // Validate file type — accept any image format
        if (!file.type.startsWith("image/")) {
            return apiError("Chỉ chấp nhận file hình ảnh", 400);
        }

        // Validate file size (max 10MB)
        const maxSize = 10 * 1024 * 1024;
        if (file.size > maxSize) {
            return apiError("File quá lớn (tối đa 10MB)", 400);
        }

        // Determine upload subdirectory based on type
        const subDir = type === "avatar" ? "avatars"
            : type === "payment_proof" ? "payment_proof"
                : type === "registration" ? "registration"
                    : type === "screenshot" ? "screenshots"
                        : "general";

        // Create uploads directory
        const uploadsDir = path.join(process.cwd(), "uploads", subDir);
        await mkdir(uploadsDir, { recursive: true });

        // Generate unique filename
        const ext = file.name.split(".").pop() || "jpg";
        const filename = `${authResult.user._id}_${Date.now()}.${ext}`;
        const filepath = path.join(uploadsDir, filename);

        // Write file
        const bytes = await file.arrayBuffer();
        await writeFile(filepath, Buffer.from(bytes));

        // Return the public URL
        const url = `/api/files/${subDir}/${filename}`;

        return apiResponse({ url, type }, 200, "Upload thành công");
    } catch (error) {
        console.error("Upload error:", error);
        return apiError("Có lỗi xảy ra khi upload", 500);
    }
}
