import type { Metadata } from "next";
import "./globals.css";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import { QueryProvider } from "@/components/providers/QueryProvider";
import { Toaster } from "@/components/ui/Toaster";

export const metadata: Metadata = {
  title: "CarbonAfrika — Restore Africa, Earn Carbon Credits",
  description:
    "CarbonAfrika connects African communities restoring indigenous forests, savannas, and grasslands with global carbon credit buyers. Earn by healing the land.",
  keywords: ["carbon credits", "Africa", "reforestation", "blockchain", "climate", "sustainability"],
  openGraph: {
    title: "CarbonAfrika",
    description: "Restore Africa. Earn Carbon Credits.",
    type: "website",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <QueryProvider>
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
