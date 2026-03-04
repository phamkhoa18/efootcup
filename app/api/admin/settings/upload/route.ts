import { NextRequest } from "next/server";
import { writeFile, mkdir } from "fs/promises";
import path from "path";
import { requireAdmin, apiResponse, apiError } from "@/lib/auth";

// POST /api/admin/settings/upload — Upload site branding images
export async function POST(req: NextRequest) {
    try {
        const authResult = await requireAdmin(req);
        if (authResult instanceof Response) return authResult;

        const formData = await req.formData();
        const file = formData.get("file") as File | null;
        const type = (formData.get("type") as string) || "logo"; // logo, logoDark, favicon, appleTouchIcon, ogImage

        if (!file) {
            return apiError("Vui lòng chọn file", 400);
        }

        // Validate type
        const allowedTypes = ["logo", "logoDark", "favicon", "appleTouchIcon", "ogImage", "payment_qr", "payment_proof", "content"];
        if (!allowedTypes.includes(type)) {
            return apiError("Loại file không hợp lệ", 400);
        }

        // Validate file type
        const allowedMimeTypes = ["image/jpeg", "image/png", "image/webp", "image/gif", "image/svg+xml", "image/x-icon", "image/vnd.microsoft.icon"];
        if (!allowedMimeTypes.includes(file.type)) {
            return apiError("Chỉ chấp nhận file ảnh (JPG, PNG, WebP, GIF, SVG, ICO)", 400);
        }

        // Validate file size (max 5MB)
        const maxSize = 5 * 1024 * 1024;
        if (file.size > maxSize) {
            return apiError("File quá lớn (tối đa 5MB)", 400);
        }

        // Create uploads directory
        const uploadsDir = path.join(process.cwd(), "public", "uploads", "site");
        await mkdir(uploadsDir, { recursive: true });

        // Generate filename based on type
        const ext = file.name.split(".").pop() || "png";
        const filename = `${type}_${Date.now()}.${ext}`;
        const filepath = path.join(uploadsDir, filename);

        // Write file
        const bytes = await file.arrayBuffer();
        await writeFile(filepath, Buffer.from(bytes));

        // Return the public URL
        const url = `/uploads/site/${filename}`;

        return apiResponse({ url, type }, 200, "Upload thành công");
    } catch (error) {
        console.error("Settings upload error:", error);
        return apiError("Có lỗi xảy ra khi upload", 500);
    }
}
