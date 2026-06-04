"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { Leaf, ArrowRight, Calendar, Loader2 } from "lucide-react";
import { api } from "@/lib/api";

interface BlogCard {
  id: string;
  slug: string;
  title: string;
  excerpt: string;
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

export default function BlogIndexPage() {
  const [items, setItems] = useState<BlogCard[]>([]);
  const [loading, setLoading] = useState(true);
  const [tag, setTag] = useState<string | null>(null);

  useEffect(() => {
    api.get<{ data: { items: BlogCard[] } }>(`/api/blog${tag ? `?tag=${encodeURIComponent(tag)}` : ""}`)
      .then((r) => setItems(r.data.items ?? []))
      .finally(() => setLoading(false));
  }, [tag]);

  const allTags = Array.from(new Set(items.flatMap(i => i.tags))).sort();
  const [featured, ...rest] = items;

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-forest-950 text-white relative overflow-hidden">
        <div className="absolute inset-0 opacity-20"
          style={{ backgroundImage: "radial-gradient(ellipse at 80% 20%, rgb(22 101 52) 0%, transparent 60%)" }} />
        <div className="max-w-5xl mx-auto px-4 py-16 relative">
          <div className="flex items-center gap-2 text-forest-300 text-xs font-bold uppercase tracking-widest mb-3">
            <Leaf className="w-3.5 h-3.5" /> Kabon Journal
          </div>
          <h1 className="text-4xl md:text-5xl font-black leading-tight mb-4">Stories from the<br />African carbon market.</h1>
          <p className="text-forest-200 text-lg max-w-2xl leading-relaxed">
            Field notes, technical posts, and honest reflections on building a registry for the next generation of African climate finance.
          </p>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 py-12">
        {loading ? (
          <div className="text-center py-20">
            <Loader2 className="w-6 h-6 text-forest-600 animate-spin mx-auto" />
          </div>
        ) : items.length === 0 ? (
          <div className="text-center py-20 text-gray-400">No articles yet. Check back soon.</div>
        ) : (
          <>
            {/* Tag filter */}
            {allTags.length > 0 && (
              <div className="flex flex-wrap items-center gap-2 mb-8 text-sm">
                <button
                  onClick={() => setTag(null)}
                  className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-colors ${
                    !tag ? "bg-gray-900 text-white" : "bg-white border border-gray-200 text-gray-600 hover:border-gray-300"
                  }`}
                >
                  All
                </button>
                {allTags.map(t => (
                  <button
                    key={t}
                    onClick={() => setTag(t)}
                    className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-colors ${
                      tag === t ? "bg-gray-900 text-white" : "bg-white border border-gray-200 text-gray-600 hover:border-gray-300"
                    }`}
                  >
                    {t}
                  </button>
                ))}
              </div>
            )}

            {/* Featured */}
            {featured && (
              <Link href={`/blog/${featured.slug}`}
                className="block bg-white rounded-3xl border border-gray-100 shadow-card overflow-hidden mb-10 group">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-0">
                  {featured.coverUrl && (
                    /* eslint-disable-next-line @next/next/no-img-element */
                    <img src={featured.coverUrl} alt="" className="w-full h-72 md:h-full object-cover" />
                  )}
                  <div className="p-8 flex flex-col justify-center">
                    <div className="text-xs text-forest-700 font-bold uppercase tracking-wider mb-3">Latest</div>
                    <h2 className="text-2xl md:text-3xl font-black text-gray-900 leading-tight mb-3 group-hover:text-forest-800 transition-colors">
                      {featured.title}
                    </h2>
                    <p className="text-gray-600 leading-relaxed mb-4">{featured.excerpt}</p>
                    <div className="flex items-center gap-2 text-xs text-gray-400">
                      <span className="font-semibold text-gray-700">{featured.authorName}</span>
                      {featured.authorRole && <><span>·</span><span>{featured.authorRole}</span></>}
                      <span>·</span>
                      <span className="flex items-center gap-1"><Calendar className="w-3 h-3" /> {formatDate(featured.publishedAt)}</span>
                    </div>
                    <span className="flex items-center gap-1 mt-5 text-sm text-forest-700 font-semibold">
                      Read article <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
                    </span>
                  </div>
                </div>
              </Link>
            )}

            {/* Rest */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {rest.map(p => (
                <Link key={p.id} href={`/blog/${p.slug}`}
                  className="bg-white rounded-2xl border border-gray-100 shadow-card overflow-hidden group">
                  {p.coverUrl && (
                    /* eslint-disable-next-line @next/next/no-img-element */
                    <img src={p.coverUrl} alt="" className="w-full h-44 object-cover" />
                  )}
                  <div className="p-5">
                    <div className="flex flex-wrap items-center gap-1.5 mb-2">
                      {p.tags.slice(0, 2).map(t => (
                        <span key={t} className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-forest-100 text-forest-700">
                          {t}
                        </span>
                      ))}
                    </div>
                    <h3 className="font-black text-gray-900 leading-snug mb-2 group-hover:text-forest-800 transition-colors line-clamp-2">
                      {p.title}
                    </h3>
                    <p className="text-sm text-gray-600 leading-relaxed line-clamp-3 mb-3">{p.excerpt}</p>
                    <div className="flex items-center gap-2 text-xs text-gray-400">
                      <span className="font-semibold text-gray-700">{p.authorName}</span>
                      <span>·</span>
                      <span>{formatDate(p.publishedAt)}</span>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
