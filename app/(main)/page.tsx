import { Metadata } from "next";
import { HeroSection } from "@/components/sections/HeroSection";
import { FeaturesSection } from "@/components/sections/FeaturesSection";
import { HowItWorksSection } from "@/components/sections/HowItWorksSection";
import { TournamentsShowcase } from "@/components/sections/TournamentsShowcase";
import { StatsSection } from "@/components/sections/StatsSection";
import { CTASection } from "@/components/sections/CTASection";

// We can remove "use client" from the main page and keep it only in the sub-components if they need it.
// Most of these sections probably have animations (Framer Motion), so they should be "use client".

export const metadata: Metadata = {
  title: "eFootCup VN - Nền tảng quản lý giải đấu eFootball hàng đầu",
  description: "Tổ chức và tham gia các giải đấu eFootball chuyên nghiệp. Hệ thống bốc thăm tự động, lịch thi đấu trực quan và cộng đồng game thủ sôi động.",
};

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
