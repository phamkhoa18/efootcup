import { NextRequest, NextResponse } from "next/server";
import { readFile, stat } from "fs/promises";
import path from "path";

// Content-Type mapping
const MIME_TYPES: Record<string, string> = {
    jpg: "image/jpeg",
    jpeg: "image/jpeg",
    jpe: "image/jpeg",
    jfif: "image/jpeg",
    png: "image/png",
    gif: "image/gif",
    webp: "image/webp",
    svg: "image/svg+xml",
    ico: "image/x-icon",
    bmp: "image/bmp",
    avif: "image/avif",
    heic: "image/heic",
    heif: "image/heif",
    tif: "image/tiff",
    tiff: "image/tiff",
};

/**
 * GET /api/files/[...path] — Serve uploaded files from the uploads directory.
 * 
 * This replaces serving from public/uploads/ which only works in dev mode.
 * In production, Next.js doesn't serve newly uploaded files from public/.
 * 
 * Example: /api/files/avatars/user123_1234567890.jpg
 *        → reads from <project_root>/uploads/avatars/user123_1234567890.jpg
 */
export async function GET(
    req: NextRequest,
    { params }: { params: Promise<{ path: string[] }> }
) {
    try {
        const { path: pathSegments } = await params;

        if (!pathSegments || pathSegments.length === 0) {
            return NextResponse.json({ error: "File not found" }, { status: 404 });
        }

        // Join path segments and sanitize (prevent directory traversal)
        const relativePath = pathSegments.join("/");
        if (relativePath.includes("..") || relativePath.includes("~")) {
            return NextResponse.json({ error: "Invalid path" }, { status: 400 });
        }

        // Build absolute path — files stored in <project_root>/uploads/
        const uploadsDir = path.join(process.cwd(), "uploads");
        const filePath = path.join(uploadsDir, relativePath);

        // Verify the file is within the uploads directory (security check)
        const resolvedPath = path.resolve(filePath);
        const resolvedUploadsDir = path.resolve(uploadsDir);
        if (!resolvedPath.startsWith(resolvedUploadsDir)) {
            return NextResponse.json({ error: "Invalid path" }, { status: 400 });
        }

        // Check file exists
        try {
            await stat(filePath);
        } catch {
            // Do NOT cache 404s — file might be uploaded moments later
            return NextResponse.json({ error: "File not found" }, {
                status: 404,
                headers: { "Cache-Control": "no-store, no-cache, must-revalidate" },
            });
        }

        // Read file
        const fileBuffer = await readFile(filePath);

        // Determine content type
        const ext = path.extname(filePath).slice(1).toLowerCase();
        const contentType = MIME_TYPES[ext] || "application/octet-stream";

        // Return file with proper headers
        return new NextResponse(fileBuffer, {
            status: 200,
            headers: {
                "Content-Type": contentType,
                "Cache-Control": "public, max-age=31536000, immutable",
                "Content-Length": fileBuffer.length.toString(),
            },
        });
    } catch (error) {
        console.error("File serve error:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
