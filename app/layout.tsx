import type { Metadata, Viewport } from "next";
import "./globals.css";
import { AuthProvider } from "@/contexts/AuthContext";

export const viewport: Viewport = {
  themeColor: "#0A3D91",
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
};

export const metadata: Metadata = {
  metadataBase: new URL("https://efootcup.efootball.vn"),
  title: {
    default: "eFootball Cup VN - Tổ Chức Giải Đấu eFootball Chuyên Nghiệp",
    template: "%s | eFootball Cup VN"
  },
  description:
    "Nền tảng tổ chức và quản lý giải đấu eFootball hàng đầu Việt Nam. Tạo giải đấu chuyên nghiệp, quản lý đội hình, theo dõi kết quả trực tiếp và kết nối cộng đồng game thủ.",
  keywords: [
    "eFootball",
    "giải đấu",
    "tournament",
    "esports",
    "Việt Nam",
    "PES",
    "eFootCup",
    "tổ chức giải",
    "bóng đá điện tử"
  ],
  authors: [{ name: "eFootCup Team" }],
  creator: "eFootCup VN",
  publisher: "eFootCup VN",
  alternates: {
    canonical: "https://efootcup.efootball.vn",
  },
  openGraph: {
    title: "eFootball Cup VN - Tổ Chức Giải Đấu eFootball Chuyên Nghiệp",
    description: "Nền tảng tổ chức và quản lý giải đấu eFootball hàng đầu Việt Nam. Kết nối đam mê, chinh phục giải đấu.",
    url: "https://efootcup.efootball.vn",
    siteName: "eFootCup VN",
    images: [
      {
        url: "/assets/efootball_bg.webp",
        width: 1200,
        height: 630,
        alt: "eFootball Cup VN Showcase",
      },
    ],
    locale: "vi_VN",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "eFootball Cup VN",
    description: "Nền tảng tổ chức và quản lý giải đấu eFootball hàng đầu Việt Nam",
    images: ["/assets/efootball_bg.webp"],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="vi">
      <body className="antialiased">
        <AuthProvider>
          {children}
        </AuthProvider>
      </body>
    </html>
  );
}
