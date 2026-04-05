import type { NextConfig } from "next";

const nextConfig: NextConfig = {
    // Enable standalone output for production deployments
    // Whitelist image quality values used by <Image> components
    images: {
        qualities: [75, 85, 90],
    },

    // Increase body size limit for file uploads (default is 4MB)
    experimental: {
        serverActions: {
            bodySizeLimit: "50mb",
        },
    },

    async rewrites() {
        return [
            {
                // Redirect old /uploads/* URLs to /api/files/* for backward compatibility
                source: "/uploads/:path*",
                destination: "/api/files/:path*",
            },
        ];
    },
};

export default nextConfig;
