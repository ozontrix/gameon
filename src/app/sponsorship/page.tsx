import type { Metadata } from "next";
import { SponsorshipPage } from "@/components/SponsorshipPage";

export const metadata: Metadata = {
  title: "Sponsorship | GAME ON — Premium Sports Destination",
  description:
    "Partner with Game On Multi Sports in Sector 70, Gurugram. Sponsorship opportunities, brand visibility, and launch event partnerships across every sport and zone.",
};

export default function Sponsorship() {
  return <SponsorshipPage />;
}
