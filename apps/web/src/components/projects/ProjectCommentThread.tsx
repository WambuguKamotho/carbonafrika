"use client";
import { useEffect, useState } from "react";
import { Send, ShieldCheck, User as UserIcon, CheckCircle, XCircle, MessageSquare, Loader2 } from "lucide-react";
import { getToken } from "@/lib/auth";

interface Comment {
  id: string;
  body: string;
  kind: string;
  createdAt: string;
  author: { id: string; name: string; role: string };
}

const KIND_META: Record<string, { icon: React.ElementType; tint: string; label?: string }> = {
  comment:                { icon: MessageSquare, tint: "text-gray-400" },
  approval:               { icon: CheckCircle,   tint: "text-forest-600", label: "Approved" },
  rejection:              { icon: XCircle,       tint: "text-red-500",    label: "Rejected" },
  verification_approved:  { icon: CheckCircle,   tint: "text-forest-700", label: "Verified" },
  verification_rejected:  { icon: XCircle,       tint: "text-red-600",    label: "Verification rejected" },
};

function timeShort(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1)  return "just now";
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h`;
  return new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short" });
}

export default function ProjectCommentThread({
  projectId,
  currentUserId,
  refreshKey,
}: {
  projectId: string;
  currentUserId: string;
  /** Bump this number to force the thread to re-fetch (e.g. after an approve action). */
  refreshKey?: number;
}) {
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading,  setLoading]  = useState(true);
  const [error,    setError]    = useState<string | null>(null);
  const [body,     setBody]     = useState("");
  const [sending,  setSending]  = useState(false);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const r = await fetch(`/api/projects/${projectId}/comments`, {
        headers: { Authorization: `Bearer ${getToken()}` },
      });
      const d = await r.json();
      if (!d.success) throw new Error(d.error || "Failed to load comments");
      setComments(d.data ?? []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load comments");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [projectId, refreshKey]);

  async function send() {
    const trimmed = body.trim();
    if (!trimmed) return;
    setSending(true);
    setError(null);
    try {
      const r = await fetch(`/api/projects/${projectId}/comments`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${getToken()}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ body: trimmed }),
      });
      const d = await r.json();
      if (!d.success) throw new Error(d.error || "Failed to send");
      setComments(prev => [...prev, d.data]);
      setBody("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to send");
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="space-y-3">
      {loading ? (
        <div className="text-center py-6 text-gray-400 text-sm">Loading comments…</div>
      ) : comments.length === 0 ? (
        <div className="text-center py-6 text-gray-400 text-sm italic">
          No comments yet. Use the box below to leave a note.
        </div>
      ) : (
        <div className="space-y-3 max-h-80 overflow-y-auto pr-1">
          {comments.map(c => {
            const mine   = c.author.id === currentUserId;
            const meta   = KIND_META[c.kind] ?? KIND_META.comment;
            const Icon   = meta.icon;
            const isAdmin = c.author.role === "ADMIN";
            return (
              <div
                key={c.id}
                className={`flex gap-3 ${mine ? "flex-row-reverse" : ""}`}
              >
                <div className={`w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 ${
                  isAdmin ? "bg-purple-100 text-purple-700" : "bg-forest-100 text-forest-700"
                }`}>
                  {isAdmin ? <ShieldCheck className="w-3.5 h-3.5" /> : <UserIcon className="w-3.5 h-3.5" />}
                </div>
                <div className={`max-w-[78%] ${mine ? "items-end" : "items-start"} flex flex-col`}>
                  <div className={`flex items-center gap-1.5 text-[10px] text-gray-400 mb-0.5 ${mine ? "flex-row-reverse" : ""}`}>
                    <span className="font-semibold text-gray-600">{c.author.name}</span>
                    <span>·</span>
                    <span>{timeShort(c.createdAt)}</span>
                    {c.kind !== "comment" && (
                      <span className={`inline-flex items-center gap-0.5 ${meta.tint}`}>
                        <Icon className="w-3 h-3" />
                        {meta.label ?? c.kind}
                      </span>
                    )}
                  </div>
                  <div className={`rounded-2xl px-3.5 py-2 text-sm whitespace-pre-wrap ${
                    (c.kind === "approval" || c.kind === "verification_approved") ? "bg-forest-50 border border-forest-100 text-forest-900" :
                    (c.kind === "rejection" || c.kind === "verification_rejected") ? "bg-red-50 border border-red-100 text-red-900" :
                    mine                   ? "bg-gray-900 text-white" :
                                             "bg-gray-100 text-gray-800"
                  }`}>
                    {c.body}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {error && (
        <div className="text-xs bg-red-50 border border-red-200 text-red-700 rounded-lg px-3 py-2">
          {error}
        </div>
      )}

      <div className="flex items-end gap-2 pt-3 border-t border-gray-100">
        <textarea
          rows={2}
          className="input resize-none text-sm flex-1"
          placeholder="Write a note…"
          value={body}
          onChange={(e) => setBody(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) { e.preventDefault(); send(); }
          }}
        />
        <button
          onClick={send}
          disabled={sending || !body.trim()}
          className="flex items-center gap-1.5 bg-forest-700 hover:bg-forest-800 disabled:opacity-50 text-white rounded-xl px-4 py-2.5 text-sm font-semibold transition-colors flex-shrink-0"
          aria-label="Send comment"
        >
          {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
          Send
        </button>
      </div>
    </div>
  );
}
