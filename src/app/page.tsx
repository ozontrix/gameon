"use client";

import { useState } from "react";
import Splash from "@/components/Splash";
import AppShell from "@/components/AppShell";
import Hero from "@/components/Hero";
import PillarCards from "@/components/PillarCards";
import LocationCard from "@/components/LocationCard";
import NotifyForm from "@/components/NotifyForm";
import FloatingTabBar from "@/components/FloatingTabBar";
import Footer from "@/components/Footer";

export default function Home() {
  const [splashDone, setSplashDone] = useState(false);

  return (
    <>
      <Splash onComplete={() => setSplashDone(true)} />

      {splashDone && (
        <div className="min-h-screen bg-gameon-black">
          {/* Desktop wrapper: phone-shaped column on large screens */}
          <div className="lg:max-w-[480px] lg:mx-auto lg:border-x lg:border-gameon-line lg:min-h-screen lg:shadow-2xl lg:shadow-gameon-yellow/5">
            {/* App Shell */}
            <AppShell />

            {/* Main content */}
            <main className="scroll-container">
              <Hero />
              <PillarCards />
              <LocationCard />
              <NotifyForm />
              <Footer />
            </main>

            {/* Floating Tab Bar */}
            <FloatingTabBar />
          </div>
        </div>
      )}
    </>
  );
}