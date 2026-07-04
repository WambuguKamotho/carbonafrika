import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Request Buyer Access",
  description:
    "Request access to buy verified African carbon credits directly from landowners and clean energy operators.",
  alternates: { canonical: "/request-access" },
};

export default function RequestAccessLayout({ children }: { children: React.ReactNode }) {
  return children;
}
