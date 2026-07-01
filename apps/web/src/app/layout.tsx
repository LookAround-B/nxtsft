import type { Metadata, Viewport } from "next";
import "./globals.css";
import { Providers } from "@/components/Providers";
import { AuthProvider } from "@/lib/auth";
import { BottomNav } from "@/components/site/BottomNav";
import { Toaster } from "@/components/ui/sonner";
import { Preloader } from "@/components/site/Preloader";
import { SiteChrome } from "@/components/site/SiteChrome";
import { ListPropertyPopup } from "@/components/site/ListPropertyPopup";
import { CookieBanner } from "@/components/site/CookieBanner";
import { PWARegister } from "@/components/PWARegister";
import { Analytics } from "@vercel/analytics/next";
import { SpeedInsights } from "@vercel/speed-insights/next";
import { SITE_URL } from "@/lib/site";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: "NxtSft.com  — India's Smart Real Estate Platform",
    template: "%s | NxtSft.com",
  },
  description:
    "NxtSft.com is India's next-generation real estate ecosystem — verified listings, AI matching, zero commission, integrated CRM and ERP.",
  applicationName: "NxtSft.com",
  keywords: [
    "real estate India",
    "property listings",
    "buy property",
    "rent property",
    "zero commission real estate",
    "AI property matching",
    "verified listings",
    "real estate CRM",
    "NxtSft",
  ],
  authors: [{ name: "NxtSft.com", url: SITE_URL }],
  creator: "NxtSft.com",
  publisher: "NxtSft.com",
  manifest: "/manifest.json",
  alternates: {
    canonical: "/",
  },
  appleWebApp: {
    capable: true,
    title: "NxtSft",
    statusBarStyle: "default",
  },
  formatDetection: {
    telephone: false,
  },
  openGraph: {
    title: "NxtSft.com — Find. Own. Live Smarter.",
    description:
      "India's most comprehensive real estate platform — AI matched, zero commission, CRM+ERP in one.",
    url: SITE_URL,
    siteName: "NxtSft.com",
    locale: "en_IN",
    type: "website",
    images: [
      {
        url: "/logo.png",
        width: 1200,
        height: 630,
        alt: "NxtSft.com — India's Smart Real Estate Platform",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "NxtSft.com — Find. Own. Live Smarter.",
    description:
      "India's most comprehensive real estate platform — AI matched, zero commission, CRM+ERP in one.",
    site: "@NxtSftCom",
    creator: "@NxtSftCom",
    images: ["/logo.png"],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-image-preview": "large",
      "max-snippet": -1,
      "max-video-preview": -1,
    },
  },
  icons: {
    icon: "/logo.png",
    shortcut: "/logo.png",
    apple: "/logo.png",
  },
  category: "real estate",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#E3261E",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <Preloader />
        <Providers>
          <AuthProvider>
            <SiteChrome>{children}</SiteChrome>
            <BottomNav />
            <ListPropertyPopup />
            <CookieBanner />
            <Toaster richColors position="top-right" />
            <PWARegister />
          </AuthProvider>
        </Providers>
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  );
}
