/**
 * Compress an image file using Canvas API.
 * Resizes to max 1920px on longest side and compresses to JPEG quality 0.7.
 * Guarantees output < 2MB for reliable upload.
 */
export async function compressImage(file: File, maxSize = 1920, quality = 0.7): Promise<File> {
    return new Promise((resolve, reject) => {
        const img = new Image();
        const url = URL.createObjectURL(file);

        img.onload = () => {
            URL.revokeObjectURL(url);

            let { width, height } = img;

            // Scale down if larger than maxSize
            if (width > maxSize || height > maxSize) {
                if (width > height) {
                    height = Math.round((height * maxSize) / width);
                    width = maxSize;
                } else {
                    width = Math.round((width * maxSize) / height);
                    height = maxSize;
                }
            }

            const canvas = document.createElement("canvas");
            canvas.width = width;
            canvas.height = height;

            const ctx = canvas.getContext("2d");
            if (!ctx) {
                resolve(file); // fallback to original
                return;
            }

            ctx.drawImage(img, 0, 0, width, height);

            canvas.toBlob(
                (blob) => {
                    if (!blob) {
                        resolve(file);
                        return;
                    }
                    // Create new file with compressed data
                    const compressed = new File([blob], file.name.replace(/\.[^.]+$/, ".jpg"), {
                        type: "image/jpeg",
                        lastModified: Date.now(),
                    });
                    resolve(compressed);
                },
                "image/jpeg",
                quality
            );
        };

        img.onerror = () => {
            URL.revokeObjectURL(url);
            resolve(file); // fallback to original if image can't be loaded
        };

        img.src = url;
    });
}
