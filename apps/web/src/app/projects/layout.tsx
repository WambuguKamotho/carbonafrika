import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Verified Projects",
  description:
    "Browse active and verified carbon projects across Africa on Kabon.Africa's registry.",
  alternates: { canonical: "/projects" },
};

export default function ProjectsLayout({ children }: { children: React.ReactNode }) {
  return children;
}
