import type { Metadata, Viewport } from "next";
import { Anton, JetBrains_Mono, Space_Grotesk } from "next/font/google";
import { Toaster } from "sonner";
import { MetaPixel } from "@/components/MetaPixel";
import "./globals.css";
import { SITE_URL, SITE_NAME, SITE_DESCRIPTION, isPreviewDeployment } from '@/lib/seo';

// ─── Typography — self-hosted via next/font so every device renders the same fonts ───
// Anton      → display / major headings
// Space Grotesk → body & general text
// JetBrains Mono → mono labels (e.g. the "SOON" badge)
const anton = Anton({
  variable: "--font-anton",
  subsets: ["latin"],
  weight: "400",
  display: "swap",
});

const spaceGrotesk = Space_Grotesk({
  variable: "--font-space-grotesk",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-jetbrains-mono",
  subsets: ["latin"],
  weight: ["400", "500"],
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: { default: SITE_NAME, template: `%s | ${SITE_NAME}` },
  description: SITE_DESCRIPTION,
  applicationName: SITE_NAME,
  robots: isPreviewDeployment ? { index: false, follow: false } : { index: true, follow: true },
  verification: { google: process.env.GOOGLE_SITE_VERIFICATION },
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Game On",
  },
  manifest: "/manifest.json",
  icons: {
    icon: "/game_on_favicon.png",
    apple: "/icons/apple-touch-icon.png",
  },
  openGraph: {
    type: "website",
    locale: "en_IN",
    siteName: SITE_NAME,
    title: SITE_NAME,
    description: SITE_DESCRIPTION,
    images: [
      {
        url: '/social-preview',
        width: 1200,
        height: 630,
        alt: "Game On — Where the City Unplugs & GameOn Begins",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: SITE_NAME,
    description: SITE_DESCRIPTION,
    images: ['/social-preview'],
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#0B0B0C",
  colorScheme: "dark",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${anton.variable} ${spaceGrotesk.variable} ${jetbrainsMono.variable} h-full`}
    >
      <body className="min-h-full bg-go-black text-go-off font-sans antialiased">
        {children}
        <MetaPixel enabled={process.env.NODE_ENV === "production" && process.env.VERCEL_ENV !== "preview"} />
        <Toaster
          position="top-center"
          toastOptions={{
            style: {
              background: "rgba(14, 17, 22, 0.9)",
              backdropFilter: "blur(20px)",
              border: "1px solid rgba(255, 255, 255, 0.08)",
              color: "#F7F5F2",
              borderRadius: "20px",
            },
          }}
        />
      </body>
    </html>
  );
}