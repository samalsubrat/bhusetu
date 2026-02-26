import Navbar  from "@/components/Navbar";
import { HeroSection } from "@/components/landing/hero-section";
import { StatsStrip } from "@/components/landing/stats-strip";
import { FeaturesSection } from "@/components/landing/features-section";
import { CTASection } from "@/components/landing/cta-section";
import { Footer } from "@/components/footer";

export default function Home() {
  return (
    <>
      <Navbar/>
      <main>
        <HeroSection />
        <StatsStrip />
        <FeaturesSection />
        <CTASection />
      </main>
      <Footer />
    </>
  );
}
