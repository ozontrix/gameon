"use client";

import { useState } from "react";

import { Navigation } from "@/components/Navigation";
import { NotifyModal } from "@/components/NotifyModal";
import { HeroSection } from "@/components/HeroSection";
import { SportsSection } from "@/components/SportsSection";
import { ZonesSection } from "@/components/ZonesSection";
import { AudienceSection } from "@/components/AudienceSection";
import { CommunitySection } from "@/components/CommunitySection";
import { BookingSection } from "@/components/BookingSection";
import { LocationSection } from "@/components/LocationSection";
import { FooterSection } from "@/components/FooterSection";
import { StackedCard } from "@/components/StackedCard";

// ─── Main Page ───
export default function Home() {
  const [modalOpen, setModalOpen] = useState(false);

  return (
    <>
      <Navigation onNotifyClick={() => setModalOpen(true)} />

      <main className="relative">
        <HeroSection onNotifyClick={() => setModalOpen(true)} />

        {/* Stacked cards — each section slides up as a card with rounded top corners */}
        <StackedCard index={0} totalCards={6}>
          <SportsSection onReserve={() => {
            document.getElementById("booking")?.scrollIntoView({ behavior: "smooth" });
          }} />
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
          <BookingSection />
        </StackedCard>

        <StackedCard index={5} totalCards={6}>
          <LocationSection />
        </StackedCard>

        <FooterSection />
      </main>

      <NotifyModal open={modalOpen} onClose={() => setModalOpen(false)} />
    </>
  );
}
