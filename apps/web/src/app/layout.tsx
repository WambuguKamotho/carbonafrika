import type { Metadata } from "next";
import Script from "next/script";
import { Inter } from "next/font/google";
import "./globals.css";
import Header from "@/components/layout/Header";

const inter = Inter({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700", "800", "900"],
  display: "swap",
  variable: "--font-inter",
});
import Footer from "@/components/layout/Footer";
import { QueryProvider } from "@/components/providers/QueryProvider";
import { Toaster } from "@/components/ui/Toaster";
import SessionGuard from "@/components/providers/SessionGuard";
import BetaBanner from "@/components/ui/BetaBanner";

const SITE_URL = "https://kabon.africa";
const DESCRIPTION =
  "Kabon.Africa connects African communities restoring indigenous forests, savannas, and grasslands with global carbon credit buyers. Earn by healing the land.";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: "Kabon.Africa: Restore Africa, Earn Carbon Credits",
    template: "%s | Kabon.Africa",
  },
  description: DESCRIPTION,
  keywords: ["carbon credits", "Africa", "reforestation", "blockchain", "climate", "sustainability"],
  applicationName: "Kabon.Africa",
  alternates: { canonical: "/" },
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true, "max-image-preview": "large" },
  },
  openGraph: {
    title: "Kabon.Africa: Restore Africa, Earn Carbon Credits",
    description: DESCRIPTION,
    url: SITE_URL,
    siteName: "Kabon.Africa",
    type: "website",
    locale: "en_US",
  },
  twitter: {
    card: "summary_large_image",
    title: "Kabon.Africa: Restore Africa, Earn Carbon Credits",
    description: "Restore Africa. Earn Carbon Credits.",
  },
};

const PLAUSIBLE_DOMAIN = process.env.NEXT_PUBLIC_PLAUSIBLE_DOMAIN;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const LCP_IMAGE = "https://images.unsplash.com/photo-1516026672322-bc52d61a55d5?w=1200&q=60&auto=format&fit=crop&fm=webp";

  return (
    <html lang="en" suppressHydrationWarning className={inter.variable}>
      <head>
        {/* Preload the LCP hero image so the browser fetches it immediately */}
        <link rel="preload" as="image" href={LCP_IMAGE} fetchPriority="high" />
      </head>
      <body>
        {PLAUSIBLE_DOMAIN && (
          <Script
            defer
            data-domain={PLAUSIBLE_DOMAIN}
            src="https://plausible.io/js/script.js"
            strategy="afterInteractive"
          />
        )}
        <QueryProvider>
          <SessionGuard />
          <div className="min-h-screen flex flex-col">
            <BetaBanner />
            <Header />
            <main className="flex-1">{children}</main>
            <Footer />
          </div>
          <Toaster />
        </QueryProvider>
      </body>
    </html>
  );
}
