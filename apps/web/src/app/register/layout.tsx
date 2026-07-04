import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Create Your Account",
  description:
    "Join thousands of African land stewards. Register as a landowner or verifier on Kabon.Africa.",
  alternates: { canonical: "/register" },
};

export default function RegisterLayout({ children }: { children: React.ReactNode }) {
  return children;
}
