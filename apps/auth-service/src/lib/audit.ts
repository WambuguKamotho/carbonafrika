import type { Request } from "express";
import { prisma } from "@carbonafrika/db";

// Best-effort, non-blocking audit trail. Never throws — a logging failure must
// not break the action it's recording. Reads the actor from the authenticated
// request when available.
interface AuditInput {
  action: string;                 // "user.role_change" | "verification.issue" | "buffer.drawdown" | ...
  targetType?: string;
  targetId?: string;
  summary?: string;
  metadata?: Record<string, unknown>;
}

export function writeAudit(req: Request, input: AuditInput) {
  const actorId   = req.user?.sub ?? null;
  const actorRole = req.user?.role ?? null;
  const ip        = (req.headers["x-forwarded-for"] as string)?.split(",")[0]?.trim() || req.ip || null;

  // Fire-and-forget — swallow all errors.
  prisma.auditLog.create({
    data: {
      actorId,
      actorRole,
      action:     input.action,
      targetType: input.targetType ?? null,
      targetId:   input.targetId ?? null,
      summary:    input.summary ?? null,
      metadata:   (input.metadata ?? undefined) as never,
      ip,
    },
  }).catch((e) => console.warn("[audit] failed to write:", e instanceof Error ? e.message : e));
}
