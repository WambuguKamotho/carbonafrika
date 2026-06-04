"use client";
import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { getUser, getToken, isAdminLike, isReadOnly } from "@/lib/auth";
import {
  RefreshCw, Plus, Search, Edit3, Trash2, Loader2, X,
  FileText, CheckCircle, Eye,
} from "lucide-react";
import ReadOnlyBanner from "@/components/admin/ReadOnlyBanner";

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
  status: "DRAFT" | "PUBLISHED";
  publishedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export default function AdminBlogPage() {
  const router = useRouter();
  const [user, setUser] = useState<ReturnType<typeof getUser>>(null);
  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [editing, setEditing] = useState<BlogPost | "new" | null>(null);

  useEffect(() => {
    const u = getUser();
    if (!u || !isAdminLike(u.role)) { router.replace("/login"); return; }
    setUser(u);
  }, [router]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const qs = new URLSearchParams();
      if (search.trim()) qs.set("search", search.trim());
      const r = await fetch(`/api/blog/admin?${qs}`, {
        headers: { Authorization: `Bearer ${getToken()}` },
      });
      const d = await r.json();
      setPosts(d.data ?? []);
    } finally { setLoading(false); }
  }, [search]);

  useEffect(() => { if (user) load(); }, [user, load]);

  async function remove(id: string) {
    if (!confirm("Delete this post permanently?")) return;
    await fetch(`/api/blog/admin/${id}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${getToken()}` },
    });
    load();
  }

  if (!user) return null;
  const readOnly = isReadOnly(user.role);

  return (
    <div className="min-h-screen bg-gray-50">
      {readOnly && <ReadOnlyBanner />}
      <div className="bg-white border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-4 py-5 flex items-center justify-between">
          <div>
            <h1 className="text-xl font-black text-gray-900">Blog</h1>
            <p className="text-sm text-gray-500 mt-0.5">{posts.length} post{posts.length === 1 ? "" : "s"}</p>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={load}
              className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700 px-3 py-2 rounded-lg hover:bg-gray-100 transition-colors">
              <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} /> Refresh
            </button>
            {!readOnly && (
              <button onClick={() => setEditing("new")} className="btn-primary text-sm py-2 px-4 flex items-center gap-1.5">
                <Plus className="w-4 h-4" /> New Post
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-6">
        <div className="flex gap-3 mb-6 max-w-sm">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              className="input pl-9 text-sm"
              placeholder="Search title or excerpt…"
              value={search} onChange={e => setSearch(e.target.value)}
            />
          </div>
        </div>

        {loading ? (
          <div className="text-center py-20 text-gray-400">Loading…</div>
        ) : posts.length === 0 ? (
          <div className="text-center py-20 text-gray-400">
            <FileText className="w-10 h-10 mx-auto mb-3 opacity-30" />
            <p className="text-sm">No posts yet. Create your first one.</p>
          </div>
        ) : (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-card overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50">
                  <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Title</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide hidden md:table-cell">Author</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Status</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide hidden md:table-cell">Updated</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {posts.map(p => (
                  <tr key={p.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-5 py-4">
                      <div className="font-semibold text-gray-900 truncate max-w-md">{p.title}</div>
                      <div className="text-xs text-gray-400 mt-0.5 font-mono">/{p.slug}</div>
                    </td>
                    <td className="px-4 py-4 hidden md:table-cell text-gray-700">
                      {p.authorName}
                      {p.authorRole && <div className="text-xs text-gray-400">{p.authorRole}</div>}
                    </td>
                    <td className="px-4 py-4">
                      <span className={`badge ${p.status === "PUBLISHED" ? "badge-green" : "badge-yellow"}`}>
                        {p.status}
                      </span>
                    </td>
                    <td className="px-4 py-4 text-xs text-gray-400 hidden md:table-cell">
                      {new Date(p.updatedAt).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "2-digit" })}
                    </td>
                    <td className="px-4 py-4">
                      <div className="flex items-center gap-1.5">
                        {p.status === "PUBLISHED" && (
                          <Link href={`/blog/${p.slug}`} target="_blank"
                            className="p-1.5 rounded-lg text-gray-400 hover:bg-gray-100 hover:text-gray-700"
                            aria-label="View live">
                            <Eye className="w-3.5 h-3.5" />
                          </Link>
                        )}
                        {!readOnly && (
                          <button onClick={() => setEditing(p)}
                            className="p-1.5 rounded-lg text-gray-400 hover:bg-gray-100 hover:text-gray-700" aria-label="Edit">
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>
                        )}
                        {!readOnly && (
                          <button onClick={() => remove(p.id)}
                            className="p-1.5 rounded-lg text-gray-400 hover:bg-red-100 hover:text-red-600" aria-label="Delete">
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {editing && (
        <PostEditor
          post={editing === "new" ? null : editing}
          onClose={() => setEditing(null)}
          onSaved={() => { setEditing(null); load(); }}
        />
      )}
    </div>
  );
}

function PostEditor({ post, onClose, onSaved }: { post: BlogPost | null; onClose: () => void; onSaved: () => void }) {
  const [form, setForm] = useState({
    slug:       post?.slug ?? "",
    title:      post?.title ?? "",
    excerpt:    post?.excerpt ?? "",
    body:       post?.body ?? "",
    coverUrl:   post?.coverUrl ?? "",
    tags:       (post?.tags ?? []).join(", "),
    authorName: post?.authorName ?? "",
    authorRole: post?.authorRole ?? "",
    status:     post?.status ?? "DRAFT",
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  async function save(status?: "DRAFT" | "PUBLISHED") {
    setSaving(true);
    setError(null);
    try {
      const body = {
        slug:       form.slug.trim(),
        title:      form.title.trim(),
        excerpt:    form.excerpt.trim(),
        body:       form.body.trim(),
        coverUrl:   form.coverUrl.trim() || undefined,
        tags:       form.tags.split(",").map(s => s.trim()).filter(Boolean),
        authorName: form.authorName.trim(),
        authorRole: form.authorRole.trim() || undefined,
        status:     status ?? form.status,
      };
      const url = post ? `/api/blog/admin/${post.id}` : "/api/blog/admin";
      const method = post ? "PATCH" : "POST";
      const r = await fetch(url, {
        method,
        headers: { Authorization: `Bearer ${getToken()}`, "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const d = await r.json();
      if (!d.success) throw new Error(d.error?.message || d.error || "Save failed");
      onSaved();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Save failed");
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <div className="fixed inset-0 bg-black/50 z-40" onClick={onClose} />
      <div className="fixed inset-y-0 right-0 z-50 w-full max-w-3xl bg-white shadow-2xl overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-gray-100 px-6 py-4 flex items-center justify-between z-10">
          <h2 className="text-lg font-black text-gray-900">{post ? "Edit post" : "New post"}</h2>
          <button onClick={onClose} aria-label="Close"
            className="p-2 rounded-lg text-gray-400 hover:bg-gray-100 hover:text-gray-700 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-5">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-3 text-sm">
              {error}
            </div>
          )}

          <div>
            <label className="label">Title</label>
            <input className="input" value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} />
          </div>
          <div>
            <label className="label">Slug <span className="text-gray-400 font-normal">(lowercase letters, digits, hyphens)</span></label>
            <input className="input font-mono text-sm" value={form.slug} onChange={e => setForm(f => ({ ...f, slug: e.target.value }))} />
          </div>
          <div>
            <label className="label">Excerpt</label>
            <textarea rows={2} className="input resize-none" value={form.excerpt} onChange={e => setForm(f => ({ ...f, excerpt: e.target.value }))} />
          </div>
          <div>
            <label className="label">Body <span className="text-gray-400 font-normal">(markdown: **bold**, ## heading, - list, [link](url))</span></label>
            <textarea rows={16} className="input resize-y font-mono text-sm" value={form.body} onChange={e => setForm(f => ({ ...f, body: e.target.value }))} />
          </div>
          <div>
            <label className="label">Cover image URL</label>
            <input className="input" placeholder="https://..." value={form.coverUrl} onChange={e => setForm(f => ({ ...f, coverUrl: e.target.value }))} />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="label">Author name</label>
              <input className="input" value={form.authorName} onChange={e => setForm(f => ({ ...f, authorName: e.target.value }))} />
            </div>
            <div>
              <label className="label">Author role <span className="text-gray-400 font-normal">(optional)</span></label>
              <input className="input" value={form.authorRole} onChange={e => setForm(f => ({ ...f, authorRole: e.target.value }))} />
            </div>
          </div>
          <div>
            <label className="label">Tags <span className="text-gray-400 font-normal">(comma-separated)</span></label>
            <input className="input" placeholder="standard, permanence, mangroves"
              value={form.tags} onChange={e => setForm(f => ({ ...f, tags: e.target.value }))} />
          </div>

          <div className="flex items-center justify-end gap-2 pt-4 border-t border-gray-100">
            <button onClick={onClose} className="btn-secondary text-sm py-2 px-4">Cancel</button>
            <button onClick={() => save("DRAFT")} disabled={saving}
              className="flex items-center gap-1.5 bg-white border border-gray-200 hover:bg-gray-50 disabled:opacity-50 text-gray-700 rounded-xl py-2 px-4 text-sm font-semibold">
              {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <FileText className="w-3.5 h-3.5" />}
              Save draft
            </button>
            <button onClick={() => save("PUBLISHED")} disabled={saving}
              className="flex items-center gap-1.5 bg-forest-700 hover:bg-forest-800 disabled:opacity-50 text-white rounded-xl py-2 px-4 text-sm font-semibold">
              {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle className="w-3.5 h-3.5" />}
              {form.status === "PUBLISHED" ? "Update & keep published" : "Publish"}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
