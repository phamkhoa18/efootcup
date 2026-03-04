import { NextRequest } from "next/server";
import { writeFile, mkdir } from "fs/promises";
import path from "path";
import { requireAdmin, apiResponse, apiError } from "@/lib/auth";

// POST /api/admin/content/upload — Upload content images (cover, gallery, inline)
export async function POST(req: NextRequest) {
    try {
        const authResult = await requireAdmin(req);
        if (authResult instanceof Response) return authResult;

        const formData = await req.formData();
        const file = formData.get("file") as File | null;
        const type = formData.get("type") as string || "content"; // cover | gallery | content

        if (!file) {
            return apiError("Vui lòng chọn file", 400);
        }

        // Validate file type
        const allowedTypes = ["image/jpeg", "image/png", "image/webp", "image/gif", "image/svg+xml"];
        if (!allowedTypes.includes(file.type)) {
            return apiError("Chỉ chấp nhận file ảnh (JPG, PNG, WebP, GIF, SVG)", 400);
        }

        // Validate file size (max 10MB)
        const maxSize = 10 * 1024 * 1024;
        if (file.size > maxSize) {
            return apiError("File quá lớn (tối đa 10MB)", 400);
        }

        // Create uploads directory for content
        const subDir = type === "cover" ? "covers" : type === "gallery" ? "gallery" : "content";
        const uploadsDir = path.join(process.cwd(), "public", "uploads", "posts", subDir);
        await mkdir(uploadsDir, { recursive: true });

        // Generate unique filename
        const ext = file.name.split(".").pop() || "jpg";
        const cleanName = file.name.replace(/\.[^.]+$/, "").replace(/[^a-zA-Z0-9]/g, "_").slice(0, 30);
        const filename = `${cleanName}_${Date.now()}.${ext}`;
        const filepath = path.join(uploadsDir, filename);

        // Write file
        const bytes = await file.arrayBuffer();
        await writeFile(filepath, Buffer.from(bytes));

        // Return the public URL
        const url = `/uploads/posts/${subDir}/${filename}`;

        return apiResponse({
            url,
            filename,
            size: file.size,
            type: file.type,
            width: null,
            height: null,
        }, 200, "Upload thành công");
    } catch (error) {
        console.error("Content upload error:", error);
        return apiError("Có lỗi xảy ra khi upload", 500);
    }
}
