import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Become a Community Partner",
  description:
    "Apply to become a Kabon Community Partner and help onboard African landowners into the carbon credit marketplace.",
  alternates: { canonical: "/partner-application" },
};

export default function PartnerApplicationLayout({ children }: { children: React.ReactNode }) {
  return children;
}
