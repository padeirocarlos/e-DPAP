/**
 * Local interview (submission) store operations. Offline-first: drafts are
 * autosaved here; "submit" only flips the status to `pending` so the sync layer
 * pushes it to `POST /submissions` when connectivity returns (BRD FR-MOB-3/6).
 */

import { db, type LocalSubmission, type SubmissionSyncStatus } from "@/db/db";

function uuid(): string {
  return crypto.randomUUID();
}

export async function listSubmissions(): Promise<LocalSubmission[]> {
  return db.submissions.orderBy("updatedAt").reverse().toArray();
}

export async function getSubmission(localId: string): Promise<LocalSubmission | undefined> {
  return db.submissions.get(localId);
}

/** Create a fresh local draft. */
export async function createDraft(formVersion: string): Promise<LocalSubmission> {
  const now = new Date().toISOString();
  const draft: LocalSubmission = {
    localId: uuid(),
    clientUuid: uuid(),
    formVersion,
    status: "draft",
    answers: {},
    createdAt: now,
    updatedAt: now,
  };
  await db.submissions.put(draft);
  return draft;
}

/** Autosave the answer map (keeps draft/pending status unless told otherwise). */
export async function saveAnswers(
  localId: string,
  answers: Record<string, unknown>,
  status?: SubmissionSyncStatus,
): Promise<void> {
  const existing = await db.submissions.get(localId);
  if (!existing) return;
  await db.submissions.put({
    ...existing,
    answers,
    status: status ?? (existing.status === "synced" ? "pending" : existing.status),
    updatedAt: new Date().toISOString(),
    syncError: status === "pending" ? undefined : existing.syncError,
  });
}

/** Mark the draft ready to submit (queued for the next sync). */
export async function queueForSubmit(localId: string, answers: Record<string, unknown>): Promise<void> {
  await saveAnswers(localId, answers, "pending");
}

export async function deleteSubmission(localId: string): Promise<void> {
  await db.submissions.delete(localId);
}

export async function pendingCount(): Promise<number> {
  return db.submissions.where("status").equals("pending").count();
}
