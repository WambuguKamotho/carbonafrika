import type { Metadata } from "next";
import "./globals.css";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import { QueryProvider } from "@/components/providers/QueryProvider";
import { Toaster } from "@/components/ui/Toaster";
import SessionGuard from "@/components/providers/SessionGuard";

export const metadata: Metadata = {
  title: "Kabon.Africa — Restore Africa, Earn Carbon Credits",
  description:
    "Kabon.Africa connects African communities restoring indigenous forests, savannas, and grasslands with global carbon credit buyers. Earn by healing the land.",
  keywords: ["carbon credits", "Africa", "reforestation", "blockchain", "climate", "sustainability"],
  openGraph: {
    title: "Kabon.Africa",
    description: "Restore Africa. Earn Carbon Credits.",
    type: "website",
  },
};

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
      </head>
      <body>
        <QueryProvider>
          <SessionGuard />
          <div className="min-h-screen flex flex-col">
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
