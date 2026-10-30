"use client";

import { Navigation } from "@/components/Navigation";
import { HeroSection } from "@/components/HeroSection";
import { SportsSection } from "@/components/SportsSection";
import { ZonesSection } from "@/components/ZonesSection";
import { AudienceSection } from "@/components/AudienceSection";
import { CommunitySection } from "@/components/CommunitySection";
import { AppDownloadSection } from "@/components/AppDownloadSection";
import { LocationSection } from "@/components/LocationSection";
import { FooterSection } from "@/components/FooterSection";
import { StackedCard } from "@/components/StackedCard";

// ─── Main Page ───
export default function HomePage() {
  return (
    <>
      <Navigation />

      <main className="relative bg-go-black">
        <HeroSection />

        {/* Stacked cards — each section slides up as a card with rounded top corners */}
        <StackedCard index={0} totalCards={6}>
          <SportsSection />
        </StackedCard>

        <StackedCard index={1} totalCards={6}>
          <ZonesSection />
        </StackedCard>

        <StackedCard index={2} totalCards={6}>
          <AudienceSection />
        </StackedCard>

        <StackedCard index={3} totalCards={6}>
          <CommunitySection />
        </StackedCard>

        <StackedCard index={4} totalCards={6}>
          <AppDownloadSection />
        </StackedCard>

        <StackedCard index={5} totalCards={6}>
          <LocationSection />
        </StackedCard>

        <FooterSection />
      </main>
    </>
  );
}
