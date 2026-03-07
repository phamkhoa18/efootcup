import type { Metadata, Viewport } from "next";
import "./globals.css";
import { AuthProvider } from "@/contexts/AuthContext";
import { Toaster } from "sonner";
import { ConfirmDialogProvider } from "@/components/ui/confirm-dialog";
import { getSiteSettings } from "@/lib/site-settings";
import Script from "next/script";

export const viewport: Viewport = {
  themeColor: "#0A3D91",
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
};

export async function generateMetadata(): Promise<Metadata> {
  const s = await getSiteSettings();

  const siteUrl = s.siteUrl || "https://efootball.vn";

  return {
    metadataBase: new URL(siteUrl),
    title: {
      default: s.seoTitle || `${s.siteName} - Tổ Chức Giải Đấu eFootball Chuyên Nghiệp`,
      template: `%s | ${s.siteName}`,
    },
    description: s.seoDescription || s.siteDescription,
    keywords: s.seoKeywords,
    authors: [{ name: s.siteName }],
    creator: s.siteName,
    publisher: s.siteName,
    alternates: {
      canonical: siteUrl,
    },
    icons: {
      icon: s.favicon || "/favicon.ico",
      apple: s.appleTouchIcon || undefined,
    },
    openGraph: {
      title: s.seoTitle || s.siteName,
      description: s.seoDescription || s.siteDescription,
      url: siteUrl,
      siteName: s.siteName,
      images: [
        {
          url: s.ogImage || "/assets/efootball_bg.webp",
          width: 1200,
          height: 630,
          alt: `${s.siteName} Showcase`,
        },
      ],
      locale: "vi_VN",
      type: "website",
    },
    twitter: {
      card: "summary_large_image",
      title: s.siteName,
      description: s.seoDescription || s.siteDescription,
      images: [s.ogImage || "/assets/efootball_bg.webp"],
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
}

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const s = await getSiteSettings();

  return (
    <html lang="vi">
      <head>
        {/* Google Analytics */}
        {s.googleAnalyticsId && (
          <>
            <Script
              src={`https://www.googletagmanager.com/gtag/js?id=${s.googleAnalyticsId}`}
              strategy="afterInteractive"
            />
            <Script id="gtag-init" strategy="afterInteractive">
              {`window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}gtag('js',new Date());gtag('config','${s.googleAnalyticsId}');`}
            </Script>
          </>
        )}
        {/* Facebook Pixel */}
        {s.facebookPixelId && (
          <Script id="fb-pixel" strategy="afterInteractive">
            {`!function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=!0;t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}(window,document,'script','https://connect.facebook.net/en_US/fbevents.js');fbq('init','${s.facebookPixelId}');fbq('track','PageView');`}
          </Script>
        )}
        {/* Custom Head Code */}
        {s.customHeadCode && (
          <div dangerouslySetInnerHTML={{ __html: s.customHeadCode }} />
        )}
      </head>
      <body className="antialiased">
        <AuthProvider>
          <ConfirmDialogProvider>
            {children}
          </ConfirmDialogProvider>
          <Toaster position="top-right" richColors />
        </AuthProvider>
        {/* Custom Footer Code */}
        {s.customFooterCode && (
          <div dangerouslySetInnerHTML={{ __html: s.customFooterCode }} />
        )}
      </body>
    </html>
  );
}
