import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Blog",
  description:
    "Field notes, technical posts, and honest reflections on building a registry for the next generation of African climate finance.",
  alternates: { canonical: "/blog" },
};

export default function BlogLayout({ children }: { children: React.ReactNode }) {
  return children;
}
