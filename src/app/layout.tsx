import type { Metadata, Viewport } from "next";
import { Anton, Chakra_Petch, Inter } from "next/font/google";
import "./globals.css";

const anton = Anton({
  variable: "--font-anton",
  subsets: ["latin"],
  weight: "400",
  display: "swap",
});

const chakraPetch = Chakra_Petch({
  variable: "--font-chakra-petch",
  subsets: ["latin"],
  weight: ["500", "700"],
  display: "swap",
});

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "GAME ON — Premium Sports Destination | Gurugram",
  description:
    "India's premium multi-sports destination launching in Sector 70, Gurugram. Play. Perform. Belong. Grow. One address. Every sport.",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Game On",
  },
  manifest: "/manifest.json",
  icons: {
    apple: "/icons/apple-touch-icon.png",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#0B0B0C",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${anton.variable} ${chakraPetch.variable} ${inter.variable} h-full`}
    >
      <body className="min-h-full bg-gameon-black text-gameon-off-white font-sans antialiased">
        {children}
      </body>
    </html>
  );
}