import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Carbon Credit Marketplace",
  description:
    "Browse verified African carbon credits. 1 credit = 1 tonne CO₂ sequestered. Buy directly from vetted landowners and clean energy operators.",
  alternates: { canonical: "/marketplace" },
};

export default function MarketplaceLayout({ children }: { children: React.ReactNode }) {
  return children;
}
