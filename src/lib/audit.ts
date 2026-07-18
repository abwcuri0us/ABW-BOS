/**
 * ABW-BOS Audit Log Helper
 *
 * Every business-relevant mutation must be audited (Volume 1 §14, Volume 2 §2.2.3).
 * In the full implementation, entries are hash-chained and Ed25519-signed for
 * tamper-evidence. For the MVP, entries are persisted with full context (who,
 * what, when, before, after, diff) but without the cryptographic chain.
 *
 * Usage in API routes:
 *   await audit({
 *     actorId: session.uid,
 *     module: "contacts",
 *     entityType: "party",
 *     entityId: party.id,
 *     action: "create",
 *     afterState: party,
 *     source: "ui",
 *     sourceIp: req.headers.get("x-forwarded-for") ?? undefined,
 *   });
 */

import { db } from "@/lib/db";
import type { SessionPayload } from "@/lib/auth";

export interface AuditInput {
  actorId: string;
  actorKind?: "user" | "system" | "plugin" | "sync";
  module: string;
  entityType: string;
  entityId: string;
  action:
    | "create"
    | "update"
    | "delete"
    | "transition"
    | "read"
    | "export"
    | "print"
    | "login"
    | "logout";
  beforeState?: unknown;
  afterState?: unknown;
  diff?: unknown;
  reason?: string;
  source?: "ui" | "api" | "sync" | "plugin" | "system" | "scheduled";
  sourceIp?: string;
  traceId?: string;
}

export async function audit(input: AuditInput): Promise<void> {
  try {
    await db.auditLog.create({
      data: {
        userId: input.actorKind === "user" ? input.actorId : null,
        actorKind: input.actorKind ?? "user",
        actorId: input.actorId,
        module: input.module,
        entityType: input.entityType,
        entityId: input.entityId,
        action: input.action,
        beforeState: input.beforeState
          ? JSON.stringify(input.beforeState)
          : null,
        afterState: input.afterState ? JSON.stringify(input.afterState) : null,
        diff: input.diff ? JSON.stringify(input.diff) : null,
        reason: input.reason,
        source: input.source ?? "ui",
        sourceIp: input.sourceIp,
        traceId: input.traceId,
      },
    });
  } catch (err) {
    // Audit failures must not break the user flow, but must be logged.
    console.error("[audit] failed to write audit entry:", err);
  }
}

/**
 * Helper: compute a shallow diff between two objects for the audit log.
 */
export function computeDiff(
  before: Record<string, unknown> | null,
  after: Record<string, unknown> | null,
): Record<string, [unknown, unknown]> {
  if (!before || !after) return {};
  const diff: Record<string, [unknown, unknown]> = {};
  const keys = new Set([...Object.keys(before), ...Object.keys(after)]);
  for (const k of keys) {
    const b = before[k];
    const a = after[k];
    if (JSON.stringify(b) !== JSON.stringify(a)) {
      diff[k] = [b, a];
    }
  }
  return diff;
}

/**
 * Convenience: audit from a session.
 */
export async function auditFromSession(
  session: SessionPayload,
  input: Omit<AuditInput, "actorId" | "actorKind">,
): Promise<void> {
  await audit({
    ...input,
    actorId: session.uid,
    actorKind: "user",
  });
}
