import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Register a Project",
  description:
    "List your land or clean energy project on Kabon.Africa and start earning verified carbon credits from indigenous forests, savannas, farmland, and clean energy technologies.",
  alternates: { canonical: "/projects/new" },
};

export default function ProjectsNewLayout({ children }: { children: React.ReactNode }) {
  return children;
}
