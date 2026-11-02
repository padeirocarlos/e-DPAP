/**
 * Push locally-captured interviews (submissions) to the backend. Idempotent via
 * `clientUuid` (NFR-9): re-sending the same draft updates it server-side rather
 * than duplicating. Never throws — offline leaves the row `pending`; a server
 * rejection (422/409) marks it `error` with the message for the enumerator.
 */

import { http, ApiError } from "@/api/http";
import { db, type LocalSubmission } from "@/db/db";

type ServerSubmission = {
  id: string;
  questionnaireNumber?: number;
};

export type SubmissionsSyncSummary = {
  pushed: number;
  failed: number;
  unauthorized: boolean;
};

export async function syncSubmissions(token?: string): Promise<SubmissionsSyncSummary> {
  const summary: SubmissionsSyncSummary = { pushed: 0, failed: 0, unauthorized: false };
  const pending: LocalSubmission[] = await db.submissions.where("status").equals("pending").toArray();

  for (const s of pending) {
    try {
      const saved = await http.post<ServerSubmission>(
        "/submissions",
        {
          clientUuid: s.clientUuid,
          formVersion: s.formVersion,
          answers: s.answers,
          submit: true,
        },
        token ? { token } : undefined,
      );

      // Upload the photo (0.11) separately so it doesn't bloat the submission
      // payload (NFR-3), then drop it from the local answers (FR-MOB-5).
      const photo = s.answers.q0_11;
      let answers = s.answers;
      if (typeof photo === "string" && photo.startsWith("data:")) {
        try {
          await http.post(
            `/submissions/${saved.id}/attachments`,
            { field: "0.11", dataUrl: photo },
            token ? { token } : undefined,
          );
          const { q0_11: _omit, ...rest } = s.answers;
          void _omit;
          answers = rest;
        } catch {
          // Leave the photo in place to retry next sync; the submission is saved.
        }
      }

      await db.submissions.put({
        ...s,
        answers,
        serverId: saved.id,
        questionnaireNumber: saved.questionnaireNumber,
        status: "synced",
        syncError: undefined,
        updatedAt: new Date().toISOString(),
      });
      summary.pushed++;
    } catch (err) {
      if (err instanceof ApiError && err.isOffline) {
        return summary; // stay pending; retry next sync
      }
      if (err instanceof ApiError && err.code === "UNAUTHORIZED") {
        summary.unauthorized = true;
        return summary;
      }
      const message = err instanceof ApiError ? err.message : "Erro ao sincronizar";
      await db.submissions.put({ ...s, status: "error", syncError: message });
      summary.failed++;
    }
  }
  return summary;
}
