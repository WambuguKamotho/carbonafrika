"use client";
import { useEffect, useState } from "react";
import {
  X, CheckCircle, XCircle, User as UserIcon, MapPin, Leaf, Layers,
  ScrollText, Loader2, ExternalLink,
} from "lucide-react";
import { getToken, getUser, isReadOnly } from "@/lib/auth";
import { api } from "@/lib/api";
import ProjectCommentThread from "@/components/projects/ProjectCommentThread";

interface ProjectDetail {
  id: string; title: string; description: string;
  status: string; projectType: string;
  landType: string | null; energyType: string | null;
  country: string; region: string | null;
  hectares: number; estimatedTons: number;
  ipfsDocumentHash: string | null;
  mediaUrls: string[] | null;
  rejectionReason: string | null;
  createdAt: string;
  owner: { id: string; name: string; country: string | null };
}

export default function ProjectApprovalDrawer({
  projectId,
  onClose,
  onResolved,
}: {
  projectId: string;
  onClose: () => void;
  /** Called after approve/reject so the parent can refresh its list. */
  onResolved?: () => void;
}) {
  const [project, setProject] = useState<ProjectDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState<string | null>(null);
  const [pending, setPending] = useState<null | "approve" | "reject">(null);
  const [approveNote, setApproveNote] = useState("");
  const [rejectReason, setRejectReason] = useState("");
  const [showApprove, setShowApprove] = useState(false);
  const [showReject,  setShowReject]  = useState(false);
  const [commentBump, setCommentBump] = useState(0);
  const user = getUser();
  const readOnly = isReadOnly(user?.role);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const r = await fetch(`/api/projects/${projectId}`, {
          headers: { Authorization: `Bearer ${getToken()}` },
        });
        const d = await r.json();
        if (cancelled) return;
        if (d.success) setProject(d.data);
        else setError(d.error ?? "Failed to load project");
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : "Network error");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [projectId]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  async function approve() {
    setPending("approve");
    try {
      await api.post(`/api/projects/admin/${projectId}/approve`, { note: approveNote.trim() || undefined });
      setProject(p => p ? { ...p, status: "UNDER_REVIEW" } : p);
      setShowApprove(false);
      setApproveNote("");
      setCommentBump(x => x + 1);
      onResolved?.();
    } catch (e) {
      // api.post already logs to console + normalises Zod errors to a readable string.
      setError(e instanceof Error ? e.message : "Approve failed");
    } finally {
      setPending(null);
    }
  }

  async function reject() {
    if (rejectReason.trim().length < 5) {
      setError("Rejection reason must be at least 5 characters.");
      return;
    }
    setPending("reject");
    try {
      await api.post(`/api/projects/admin/${projectId}/reject`, { reason: rejectReason.trim() });
      setProject(p => p ? { ...p, status: "REJECTED", rejectionReason: rejectReason.trim() } : p);
      setShowReject(false);
      setRejectReason("");
      setCommentBump(x => x + 1);
      onResolved?.();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Reject failed");
    } finally {
      setPending(null);
    }
  }

  const isPending = project?.status === "PENDING";

  return (
    <>
      <div className="fixed inset-0 bg-black/50 z-40" onClick={onClose} />
      <div className="fixed inset-y-0 right-0 z-50 w-full max-w-2xl bg-white shadow-2xl overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-gray-100 px-6 py-4 flex items-center justify-between z-10">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-purple-100 text-purple-700 flex items-center justify-center flex-shrink-0">
              <ScrollText className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <h2 className="text-lg font-black text-gray-900 truncate">Project Review</h2>
              <p className="text-xs text-gray-400 font-mono truncate">{projectId}</p>
            </div>
          </div>
          <button onClick={onClose} aria-label="Close"
            className="p-2 rounded-lg text-gray-400 hover:bg-gray-100 hover:text-gray-700 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-5">
          {loading && (
            <div className="py-20 text-center text-gray-400 text-sm">Loading project…</div>
          )}

          {error && !loading && (
            <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-3 text-sm">
              {error}
            </div>
          )}

          {project && (
            <>
              <div>
                <div className="flex items-start justify-between gap-3 mb-2">
                  <h1 className="text-xl font-black text-gray-900 leading-tight">{project.title}</h1>
                  <span className={`badge ${
                    project.status === "PENDING" ? "badge-yellow" :
                    project.status === "UNDER_REVIEW" ? "badge-blue" :
                    project.status === "REJECTED" ? "badge-red" :
                    "badge-green"
                  } flex-shrink-0`}>
                    {project.status.replace("_", " ")}
                  </span>
                </div>
                <div className="flex items-center gap-3 text-sm text-gray-500">
                  <span className="flex items-center gap-1"><MapPin className="w-3.5 h-3.5" />{project.country}{project.region && ` · ${project.region}`}</span>
                  <span>·</span>
                  <span>{project.hectares.toLocaleString()} ha</span>
                  <span>·</span>
                  <span>{project.estimatedTons.toLocaleString()} t CO₂e est.</span>
                </div>
              </div>

              {/* Owner */}
              <div className="bg-gray-50/70 border border-gray-100 rounded-2xl p-4">
                <div className="text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-1">Submitted by</div>
                <div className="flex items-center gap-2">
                  <UserIcon className="w-4 h-4 text-gray-400" />
                  <div>
                    <div className="font-semibold text-gray-900 text-sm">{project.owner.name}</div>
                    <div className="text-xs text-gray-400">
                      {project.owner.country ?? "—"}
                    </div>
                  </div>
                </div>
              </div>

              {/* Description */}
              <div>
                <div className="text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-2">Description</div>
                <p className="text-sm text-gray-800 whitespace-pre-wrap leading-relaxed">{project.description}</p>
              </div>

              {/* Type */}
              <div className="flex items-center gap-2 text-sm">
                <Layers className="w-4 h-4 text-gray-400" />
                <span className="text-gray-600">
                  {project.projectType}
                  {project.landType   && ` · ${project.landType}`}
                  {project.energyType && ` · ${project.energyType}`}
                </span>
              </div>

              {/* Docs / media */}
              {(project.ipfsDocumentHash || (project.mediaUrls && project.mediaUrls.length > 0)) && (
                <div className="bg-gray-50/70 border border-gray-100 rounded-2xl p-4 space-y-2">
                  <div className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Supporting documents</div>
                  {project.ipfsDocumentHash && (
                    <a href={`https://ipfs.io/ipfs/${project.ipfsDocumentHash}`}
                       target="_blank" rel="noopener noreferrer"
                       className="flex items-center gap-1 text-sm text-forest-700 hover:underline">
                      IPFS document <ExternalLink className="w-3 h-3" />
                    </a>
                  )}
                  {project.mediaUrls?.map((u, i) => (
                    <a key={u} href={u} target="_blank" rel="noopener noreferrer"
                       className="flex items-center gap-1 text-sm text-forest-700 hover:underline">
                      Media #{i + 1} <ExternalLink className="w-3 h-3" />
                    </a>
                  ))}
                </div>
              )}

              {/* Rejection banner */}
              {project.status === "REJECTED" && project.rejectionReason && (
                <div className="bg-red-50 border border-red-200 rounded-2xl p-4">
                  <div className="text-xs font-bold uppercase tracking-wider text-red-700 mb-1">Rejection reason</div>
                  <p className="text-sm text-red-900 whitespace-pre-wrap">{project.rejectionReason}</p>
                </div>
              )}

              {/* Action panel — only while PENDING + not viewer */}
              {isPending && !showApprove && !showReject && !readOnly && (
                <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4">
                  <div className="text-xs font-bold uppercase tracking-wider text-amber-700 mb-2">
                    Awaiting your decision
                  </div>
                  <p className="text-sm text-amber-900 mb-3 leading-relaxed">
                    If approved, the project moves to <strong>UNDER_REVIEW</strong> and our verifier team begins
                    carbon assessment. Use comments below to ask for missing documents before deciding.
                  </p>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setShowApprove(true)}
                      className="flex-1 flex items-center justify-center gap-2 bg-forest-700 hover:bg-forest-800 text-white rounded-xl py-2.5 text-sm font-semibold transition-colors"
                    >
                      <CheckCircle className="w-4 h-4" /> Approve
                    </button>
                    <button
                      onClick={() => setShowReject(true)}
                      className="flex-1 flex items-center justify-center gap-2 bg-white border border-red-300 hover:bg-red-50 text-red-700 rounded-xl py-2.5 text-sm font-semibold transition-colors"
                    >
                      <XCircle className="w-4 h-4" /> Reject
                    </button>
                  </div>
                </div>
              )}

              {showApprove && (
                <div className="bg-forest-50 border border-forest-200 rounded-2xl p-4 space-y-3">
                  <div className="text-xs font-bold uppercase tracking-wider text-forest-700">Approve project</div>
                  <textarea
                    rows={2}
                    className="input text-sm resize-none"
                    placeholder="Optional note (visible to owner)…"
                    value={approveNote}
                    onChange={e => setApproveNote(e.target.value)}
                  />
                  <div className="flex gap-2 justify-end">
                    <button onClick={() => { setShowApprove(false); setApproveNote(""); }}
                      className="text-xs px-3 py-1.5 rounded-lg text-gray-600 hover:bg-white">Cancel</button>
                    <button onClick={approve} disabled={pending != null}
                      className="flex items-center gap-1.5 bg-forest-700 hover:bg-forest-800 disabled:opacity-50 text-white rounded-lg px-4 py-1.5 text-xs font-semibold">
                      {pending === "approve" ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle className="w-3.5 h-3.5" />}
                      Confirm approval
                    </button>
                  </div>
                </div>
              )}

              {showReject && (
                <div className="bg-red-50 border border-red-200 rounded-2xl p-4 space-y-3">
                  <div className="text-xs font-bold uppercase tracking-wider text-red-700">Reject project</div>
                  <textarea
                    rows={3}
                    className="input text-sm resize-none"
                    placeholder="Reason (shared with the owner). Minimum 5 characters."
                    value={rejectReason}
                    onChange={e => setRejectReason(e.target.value)}
                  />
                  <div className="flex gap-2 justify-end">
                    <button onClick={() => { setShowReject(false); setRejectReason(""); }}
                      className="text-xs px-3 py-1.5 rounded-lg text-gray-600 hover:bg-white">Cancel</button>
                    <button onClick={reject} disabled={pending != null || rejectReason.trim().length < 5}
                      className="flex items-center gap-1.5 bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white rounded-lg px-4 py-1.5 text-xs font-semibold">
                      {pending === "reject" ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <XCircle className="w-3.5 h-3.5" />}
                      Confirm rejection
                    </button>
                  </div>
                </div>
              )}

              {/* Comment thread */}
              <div className="bg-white border border-gray-100 rounded-2xl p-4">
                <div className="flex items-center gap-2 mb-3">
                  <Leaf className="w-4 h-4 text-forest-600" />
                  <h3 className="font-bold text-gray-900 text-sm">Review comments</h3>
                </div>
                <ProjectCommentThread
                  projectId={project.id}
                  currentUserId={user?.id ?? ""}
                  refreshKey={commentBump}
                />
              </div>
            </>
          )}
        </div>
      </div>
    </>
  );
}
