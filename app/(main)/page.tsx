import { Metadata } from "next";
import { HeroSection } from "@/components/sections/HeroSection";
import { FeaturesSection } from "@/components/sections/FeaturesSection";
import { HowItWorksSection } from "@/components/sections/HowItWorksSection";
import { TournamentsShowcase } from "@/components/sections/TournamentsShowcase";
import { StatsSection } from "@/components/sections/StatsSection";
import { CTASection } from "@/components/sections/CTASection";
import { getSiteSettings } from "@/lib/site-settings";

export async function generateMetadata(): Promise<Metadata> {
  const s = await getSiteSettings();
  return {
    title: `${s.siteName} - Nền tảng quản lý giải đấu eFootball hàng đầu`,
    description: s.siteDescription || "Tổ chức và tham gia các giải đấu eFootball chuyên nghiệp.",
  };
}

export default function Home() {
  return (
    <>
      <HeroSection />
      <StatsSection />
      <FeaturesSection />
      <HowItWorksSection />
      <TournamentsShowcase />
      <CTASection />
    </>
  );
}
