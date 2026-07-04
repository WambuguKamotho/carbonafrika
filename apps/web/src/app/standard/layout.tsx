import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "The Kabon Standard",
  description:
    "A boutique African carbon registry. Learn about Kabon.Africa's methodology, verification standards, and credit issuance process.",
  alternates: { canonical: "/standard" },
};

export default function StandardLayout({ children }: { children: React.ReactNode }) {
  return children;
}
