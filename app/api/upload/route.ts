import { NextRequest } from "next/server";
import { writeFile, mkdir } from "fs/promises";
import path from "path";
import { requireAuth, apiResponse, apiError } from "@/lib/auth";

// POST /api/upload — Upload an image (avatar, etc.)
export async function POST(req: NextRequest) {
    try {
        const authResult = await requireAuth(req);
        if (authResult instanceof Response) return authResult;

        const formData = await req.formData();
        const file = formData.get("file") as File | null;

        if (!file) {
            return apiError("Vui lòng chọn file", 400);
        }

        // Validate file type
        const allowedTypes = ["image/jpeg", "image/png", "image/webp", "image/gif"];
        if (!allowedTypes.includes(file.type)) {
            return apiError("Chỉ chấp nhận file ảnh (JPG, PNG, WebP, GIF)", 400);
        }

        // Validate file size (max 5MB)
        const maxSize = 5 * 1024 * 1024;
        if (file.size > maxSize) {
            return apiError("File quá lớn (tối đa 5MB)", 400);
        }

        // Create uploads directory
        const uploadsDir = path.join(process.cwd(), "public", "uploads", "avatars");
        await mkdir(uploadsDir, { recursive: true });

        // Generate unique filename
        const ext = file.name.split(".").pop() || "jpg";
        const filename = `${authResult.user._id}_${Date.now()}.${ext}`;
        const filepath = path.join(uploadsDir, filename);

        // Write file
        const bytes = await file.arrayBuffer();
        await writeFile(filepath, Buffer.from(bytes));

        // Return the public URL
        const url = `/uploads/avatars/${filename}`;

        return apiResponse({ url }, 200, "Upload thành công");
    } catch (error) {
        console.error("Upload error:", error);
        return apiError("Có lỗi xảy ra khi upload", 500);
    }
}
