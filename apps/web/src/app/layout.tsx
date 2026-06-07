import type { Metadata } from "next";
import Script from "next/script";
import "./globals.css";
import Header from "@/components/layout/Header";
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
    images: [{ url: "/og.png", width: 1200, height: 630, alt: "Kabon.Africa" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Kabon.Africa: Restore Africa, Earn Carbon Credits",
    description: "Restore Africa. Earn Carbon Credits.",
    images: ["/og.png"],
  },
  icons: { icon: "/favicon.ico" },
};

const PLAUSIBLE_DOMAIN = process.env.NEXT_PUBLIC_PLAUSIBLE_DOMAIN;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&display=swap"
          rel="stylesheet"
        />
        {PLAUSIBLE_DOMAIN && (
          <Script
            defer
            data-domain={PLAUSIBLE_DOMAIN}
            src="https://plausible.io/js/script.js"
            strategy="afterInteractive"
          />
        )}
      </head>
      <body>
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
