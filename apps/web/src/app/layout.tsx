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
import Breadcrumbs from "@/components/layout/Breadcrumbs";
import { BreadcrumbProvider } from "@/components/layout/BreadcrumbContext";
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
  keywords: ["carbon credits", "Africa", "reforestation", "climate", "sustainability", "circular economy", "carbon marketplace", "carbon standard"],
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

// Languages relevant to Kabon.Africa's target markets
const TRANSLATE_LANGS = "en,fr,sw,pt,ar,ha,am,yo,ig";

const ORG_SCHEMA = {
  "@context": "https://schema.org",
  "@type": "Organization",
  name: "Kabon.Africa",
  url: "https://kabon.africa",
  logo: "https://kabon.africa/logo.png",
  description: "Africa's verified carbon credit marketplace connecting landowners, recyclers, and clean energy operators with global buyers.",
  email: "admin@kabon.africa",
  foundingDate: "2024",
  areaServed: "Africa",
  address: { "@type": "PostalAddress", addressLocality: "Nairobi", addressCountry: "KE" },
  sameAs: [
    "https://blog.kabon.africa",
    "https://bsky.app/profile/kabonafrica.bsky.social",
    "https://www.facebook.com/kabon.africa",
    "https://www.instagram.com/kabon.africa",
    "https://www.tiktok.com/@kabon.africa",
    "https://www.threads.net/@kabon.africa",
    "https://www.linkedin.com/company/134394177",
  ],
};

const WEBSITE_SCHEMA = {
  "@context": "https://schema.org",
  "@type": "WebSite",
  name: "Kabon.Africa",
  url: "https://kabon.africa",
  potentialAction: { "@type": "SearchAction", target: "https://kabon.africa/marketplace?q={search_term_string}", "query-input": "required name=search_term_string" },
};

const FAQ_SCHEMA = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: [
    { "@type": "Question", name: "What is Kabon.Africa?", acceptedAnswer: { "@type": "Answer", text: "Kabon.Africa is Africa's verified carbon credit marketplace. We connect African landowners, recyclers, and clean energy operators with global carbon credit buyers, enabling communities to earn income from verified climate action." } },
    { "@type": "Question", name: "How much can I earn from carbon credits?", acceptedAnswer: { "@type": "Answer", text: "Land restoration projects typically earn $12–25 per tonne of CO₂ sequestered per year. Clean energy projects earn $5–25/t and circular economy projects $5–150/t depending on the activity. A 10-hectare forest can generate $1,500–$3,000 per year." } },
    { "@type": "Question", name: "What types of projects qualify for carbon credits?", acceptedAnswer: { "@type": "Answer", text: "Kabon.Africa supports three project categories: Land Restoration (forests, savannas, wetlands, mangroves, farmland), Clean Energy (biogas, solar PV, improved cookstoves, micro-hydro, wind), and Circular Economy (plastic recycling, e-waste recovery, organic composting, textile recycling, waste heat recovery, industrial efficiency)." } },
    { "@type": "Question", name: "How are projects verified?", acceptedAnswer: { "@type": "Answer", text: "Every project is independently verified against the Kabon Carbon Standard (KCS), combining satellite monitoring, IoT sensor data, and field inspections by accredited verifiers. No credits are issued until verification is complete." } },
    { "@type": "Question", name: "How do I get paid for carbon credits?", acceptedAnswer: { "@type": "Answer", text: "Payments are made via bank transfer or M-Pesa directly to the project owner. Kabon.Africa uses fiat currency — no cryptocurrency or blockchain wallet required." } },
    { "@type": "Question", name: "How do I register my land or project?", acceptedAnswer: { "@type": "Answer", text: "Create a free account at kabon.africa/register, then submit your project via the dashboard. You'll need GPS coordinates, a project description, and supporting documents (land title, facility permit, or equipment specs). Our team verifies projects within 2–4 weeks." } },
  ],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const LCP_IMAGE = "https://images.unsplash.com/photo-1516026672322-bc52d61a55d5?w=1200&q=60&auto=format&fit=crop&fm=webp";

  return (
    <html lang="en" suppressHydrationWarning className={inter.variable}>
      <head>
        {/* Preload the LCP hero image so the browser fetches it immediately */}
        <link rel="preload" as="image" href={LCP_IMAGE} fetchPriority="high" />
        {/* Structured data — Organization, WebSite, FAQ */}
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(ORG_SCHEMA) }} />
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(WEBSITE_SCHEMA) }} />
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(FAQ_SCHEMA) }} />
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
        {/* Google Translate — lazyOnload so it never blocks FCP/LCP */}
        <Script id="google-translate-init" strategy="lazyOnload">{`
          function googleTranslateElementInit() {
            new google.translate.TranslateElement({
              pageLanguage: 'en',
              includedLanguages: '${TRANSLATE_LANGS}',
              layout: google.translate.TranslateElement.InlineLayout.SIMPLE,
              autoDisplay: false,
            }, 'google_translate_element');
          }
        `}</Script>
        <Script
          src="//translate.google.com/translate_a/element.js?cb=googleTranslateElementInit"
          strategy="lazyOnload"
        />
        {/* Metricool analytics */}
        <Script id="metricool-tracker" strategy="lazyOnload">{`
          function loadScript(a){var b=document.getElementsByTagName("head")[0],c=document.createElement("script");c.type="text/javascript",c.src="https://tracker.metricool.com/resources/be.js",c.onreadystatechange=a,c.onload=a,b.appendChild(c)}loadScript(function(){beTracker.t({hash:"2cba147c8808ce4d75252ea769935940"})});
        `}</Script>
        <QueryProvider>
          <SessionGuard />
          <BreadcrumbProvider>
            <div className="min-h-screen flex flex-col">
              <BetaBanner />
              <Header />
              <Breadcrumbs />
              <main className="flex-1">{children}</main>
              <Footer />
            </div>
          </BreadcrumbProvider>
          <Toaster />
        </QueryProvider>
      </body>
    </html>
  );
}
