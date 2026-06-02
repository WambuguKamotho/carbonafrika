"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { ArrowLeft, Calendar, Loader2, User as UserIcon, Leaf } from "lucide-react";
import { api } from "@/lib/api";

interface BlogPost {
  id: string;
  slug: string;
  title: string;
  excerpt: string;
  body: string;
  coverUrl: string | null;
  tags: string[];
  authorName: string;
  authorRole: string | null;
  publishedAt: string | null;
}

function formatDate(iso: string | null) {
  if (!iso) return "";
  return new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" });
}

// Minimal markdown → React. Handles **bold**, paragraphs, lists,
// [links](url) and ## headings. Good enough for our editorial style;
// upgrade later if we adopt MDX.
function renderMarkdown(md: string) {
  const lines = md.split("\n");
  const blocks: React.ReactNode[] = [];
  let i = 0;
  let key = 0;
  while (i < lines.length) {
    const line = lines[i];
    if (!line.trim()) { i++; continue; }
    if (line.startsWith("## ")) {
      blocks.push(<h2 key={key++} className="text-2xl font-black text-gray-900 mt-10 mb-3">{line.slice(3)}</h2>);
      i++;
    } else if (line.startsWith("- ")) {
      const items: string[] = [];
      while (i < lines.length && lines[i].startsWith("- ")) {
        items.push(lines[i].slice(2));
        i++;
      }
      blocks.push(
        <ul key={key++} className="list-disc pl-6 my-4 space-y-1.5 text-gray-700 leading-relaxed">
          {items.map((it, j) => <li key={j} dangerouslySetInnerHTML={{ __html: inlineMarkdown(it) }} />)}
        </ul>,
      );
    } else {
      blocks.push(
        <p key={key++} className="text-gray-700 leading-relaxed my-4"
           dangerouslySetInnerHTML={{ __html: inlineMarkdown(line) }} />,
      );
      i++;
    }
  }
  return blocks;
}

function inlineMarkdown(text: string): string {
  // Sanitise: escape angle brackets first so our generated HTML is the only HTML.
  let s = text.replace(/[&<>]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" }[c]!));
  s = s.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");
  s = s.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" class="text-forest-700 underline hover:text-forest-800">$1</a>');
  return s;
}

export default function BlogPostPage() {
  const params = useParams();
  const slug = (params?.slug as string) ?? "";
  const [post, setPost] = useState<BlogPost | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!slug) return;
    api.get<{ data: BlogPost }>(`/api/blog/${encodeURIComponent(slug)}`)
      .then((r) => setPost(r.data))
      .catch((e) => setError(e instanceof Error ? e.message : "Not found"))
      .finally(() => setLoading(false));
  }, [slug]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-6 h-6 text-forest-600 animate-spin" />
      </div>
    );
  }

  if (error || !post) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4 py-12">
        <div className="bg-white rounded-3xl shadow-card border border-gray-100 p-8 max-w-md text-center">
          <h1 className="text-xl font-black text-gray-900 mb-2">Article not found</h1>
          <p className="text-sm text-gray-500 mb-5">{error ?? "This post may have been moved or unpublished."}</p>
          <Link href="/blog" className="btn-secondary">Back to blog</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <article>
        {/* Cover */}
        {post.coverUrl && (
          <div className="bg-forest-950 relative h-72 md:h-96 overflow-hidden">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={post.coverUrl} alt="" className="absolute inset-0 w-full h-full object-cover opacity-60" />
            <div className="absolute inset-0 bg-gradient-to-t from-forest-950/90 via-forest-950/30 to-transparent" />
          </div>
        )}

        <div className="max-w-3xl mx-auto px-4 -mt-24 md:-mt-32 relative">
          <Link href="/blog" className="inline-flex items-center gap-1.5 text-white/80 hover:text-white text-sm mb-6">
            <ArrowLeft className="w-4 h-4" /> All articles
          </Link>

          <div className="bg-white rounded-3xl border border-gray-100 shadow-card p-8 md:p-12">
            <div className="flex flex-wrap items-center gap-1.5 mb-4">
              {post.tags.map(t => (
                <span key={t} className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-forest-100 text-forest-700">
                  {t}
                </span>
              ))}
            </div>

            <h1 className="text-3xl md:text-4xl font-black text-gray-900 leading-tight mb-4">{post.title}</h1>
            <p className="text-lg text-gray-600 leading-relaxed mb-6">{post.excerpt}</p>

            <div className="flex items-center gap-4 pb-6 border-b border-gray-100 text-sm text-gray-500">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-forest-100 text-forest-700 flex items-center justify-center">
                  <UserIcon className="w-4 h-4" />
                </div>
                <div>
                  <div className="font-semibold text-gray-900 text-sm">{post.authorName}</div>
                  {post.authorRole && <div className="text-xs text-gray-400">{post.authorRole}</div>}
                </div>
              </div>
              <span>·</span>
              <span className="flex items-center gap-1.5 text-xs">
                <Calendar className="w-3.5 h-3.5" /> {formatDate(post.publishedAt)}
              </span>
            </div>

            <div className="prose-like mt-2">
              {renderMarkdown(post.body)}
            </div>
          </div>

          <div className="my-12 bg-gradient-to-br from-forest-700 to-forest-900 rounded-3xl p-8 text-white text-center">
            <Leaf className="w-6 h-6 mx-auto mb-2 text-forest-300" />
            <h3 className="font-black text-xl mb-2">Want to bring a project to Kabon?</h3>
            <p className="text-sm text-forest-200 mb-5 max-w-md mx-auto">
              We're actively onboarding landowners and community partners across East Africa.
            </p>
            <div className="flex gap-3 justify-center flex-wrap">
              <Link href="/partner-application" className="bg-white text-forest-900 font-bold px-5 py-2 rounded-xl hover:bg-forest-50 text-sm">
                Become a Partner
              </Link>
              <Link href="/register" className="border border-white/30 text-white px-5 py-2 rounded-xl hover:bg-white/10 text-sm font-semibold">
                Register your land
              </Link>
            </div>
          </div>
        </div>
      </article>
    </div>
  );
}
