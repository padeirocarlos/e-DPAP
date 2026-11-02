/**
 * In-memory mock of the submissions store (DEV-ONLY). Mirrors the backend
 * contract: create (idempotent via clientUuid), list, get, and the §4.2 workflow
 * transitions. Kept on globalThis to survive HMR; resets on restart.
 */

import type {
  Paginated,
  Submission,
  SubmissionAction,
  SubmissionFilters,
  SubmissionRequest,
  SubmissionStatus,
} from "@/lib/api/types";
import { modules } from "@/form/schema-model";

type MockQcFlag = { id: string; ruleId: string; severity: "LOW" | "MEDIUM" | "HIGH"; message: string; resolved: boolean };
type MockComment = { id: string; field: string | null; comment: string; author: string; status: string | null; createdAt: string };

type Store = {
  items: Submission[];
  seq: number;
  comments: Record<string, MockComment[]>;
};

const g = globalThis as unknown as { __dpapSubmissions?: Store };
const store: Store = (g.__dpapSubmissions ??= { items: [], seq: 0, comments: {} });

function num(v: unknown): number | null {
  return typeof v === "number" ? v : typeof v === "string" && v.trim() !== "" ? Number(v) : null;
}

function deriveKeys(answers: Record<string, unknown>) {
  return {
    actorName: (answers.qA_01 as string) ?? null,
    actorType: num(answers.q0_13),
    districtCode: (answers.districtCode as string) ?? null,
    consent: answers.q0_12 != null ? Number(answers.q0_12) === 1 : null,
  };
}

export function createSubmission(input: SubmissionRequest, email: string): Submission {
  const now = new Date().toISOString();
  const existing = input.clientUuid
    ? store.items.find((s) => s.clientUuid === input.clientUuid)
    : undefined;
  const keys = deriveKeys(input.answers ?? {});
  const status: SubmissionStatus = input.submit ? "SUBMITTED" : "DRAFT";

  if (existing) {
    Object.assign(existing, {
      answers: input.answers ?? {},
      status,
      ...keys,
      districtCode: input.districtCode ?? keys.districtCode,
      submittedAt: input.submit ? now : existing.submittedAt,
      updatedAt: now,
      version: existing.version + 1,
    });
    return existing;
  }

  const submission: Submission = {
    id: crypto.randomUUID(),
    questionnaireNumber: ++store.seq,
    clientUuid: input.clientUuid ?? null,
    status,
    actorId: null,
    roundId: input.roundId ?? null,
    formVersion: input.formVersion ?? "1.0",
    enumeratorId: email,
    supervisorId: null,
    districtCode: input.districtCode ?? keys.districtCode,
    actorType: keys.actorType,
    actorName: keys.actorName,
    consent: keys.consent,
    answers: input.answers ?? {},
    submittedAt: input.submit ? now : null,
    reviewedAt: null,
    publishedAt: null,
    syncStatus: "SYNCED",
    qcFlagCount: 0,
    version: 0,
    createdAt: now,
    updatedAt: now,
  };
  store.items.unshift(submission);
  return submission;
}

export function getSubmission(id: string): Submission | undefined {
  return store.items.find((s) => s.id === id);
}

export function listSubmissions(filters: SubmissionFilters = {}): Paginated<Submission> {
  let items = store.items;
  if (filters.status) items = items.filter((s) => s.status === filters.status);
  if (filters.districtCode) items = items.filter((s) => s.districtCode === filters.districtCode);
  if (filters.actorType != null) items = items.filter((s) => s.actorType === filters.actorType);
  const page = filters.page && filters.page > 0 ? filters.page : 1;
  const pageSize = filters.pageSize && filters.pageSize > 0 ? Math.min(filters.pageSize, 200) : 25;
  const total = items.length;
  const start = (page - 1) * pageSize;
  // Enrich with the current QC-flag count (computed from answers) for the
  // Conformance review queue — mirrors the backend's SubmissionDto field.
  const slice = items
    .slice(start, start + pageSize)
    .map((s) => ({ ...s, qcFlagCount: qcFlags(s.id).length }));
  return { items: slice, page, pageSize, total };
}

const NEXT: Record<SubmissionStatus, Partial<Record<SubmissionAction, SubmissionStatus>>> = {
  DRAFT: { SUBMIT: "SUBMITTED" },
  SUBMITTED: { OPEN_REVIEW: "UNDER_REVIEW" },
  UNDER_REVIEW: { APPROVE: "APPROVED", RETURN: "RETURNED", REJECT: "REJECTED" },
  RETURNED: { SUBMIT: "SUBMITTED" },
  APPROVED: { PUBLISH: "PUBLISHED" },
  PUBLISHED: {},
  REJECTED: {},
};

export type TransitionResult =
  | { ok: true; submission: Submission }
  | { ok: false; code: "NOT_FOUND" | "CONFLICT" };

export function transition(
  id: string,
  action: SubmissionAction,
  version: number | undefined,
): TransitionResult {
  const s = getSubmission(id);
  if (!s) return { ok: false, code: "NOT_FOUND" };
  if (version != null && version !== s.version) return { ok: false, code: "CONFLICT" };
  const target = NEXT[s.status][action];
  if (!target) return { ok: false, code: "CONFLICT" };
  const now = new Date().toISOString();
  s.status = target;
  s.version += 1;
  s.updatedAt = now;
  if (action === "SUBMIT") s.submittedAt = now;
  if (action === "APPROVE" || action === "RETURN" || action === "REJECT") s.reviewedAt = now;
  if (action === "PUBLISH") s.publishedAt = now;
  return { ok: true, submission: s };
}

// --- QC + comments (DEV-ONLY mock of the Phase 4 review surface) ------------

function minutes(v: unknown): number | null {
  if (typeof v !== "string" || !v.includes(":")) return null;
  const [h, m] = v.split(":");
  const n = Number(h) * 60 + Number(m);
  return Number.isFinite(n) ? n : null;
}

/** Compute QC flags from the submission's answers (mirrors the backend rules). */
export function qcFlags(id: string): MockQcFlag[] {
  const s = getSubmission(id);
  if (!s) return [];
  const a = s.answers as Record<string, unknown>;
  const flags: MockQcFlag[] = [];
  const add = (ruleId: string, severity: MockQcFlag["severity"], message: string) =>
    flags.push({ id: crypto.randomUUID(), ruleId, severity, message, resolved: false });

  const gps = a.q0_10 as { lat?: number; lon?: number; accuracy?: number } | undefined;
  if (!gps || gps.lat == null || gps.lon == null) {
    add("BR-QC-1", "HIGH", "Coordenadas GPS em falta.");
  } else {
    if (gps.lat < -27 || gps.lat > -24 || gps.lon < 31.8 || gps.lon > 33.2) {
      add("BR-QC-1", "HIGH", "O ponto GPS está fora dos limites da Província de Maputo.");
    }
    if (gps.accuracy != null && gps.accuracy > 10) {
      add("BR-QC-1", "HIGH", "Precisão do GPS acima de 10 m.");
    }
  }
  const start = minutes(a.q0_03);
  const end = minutes(a.q0_14);
  if (start != null && end != null) {
    const d = end - start;
    if (d < 10 || d > 180) add("BR-QC-3", "MEDIUM", "Duração da entrevista fora do intervalo esperado.");
  }
  return flags;
}

export function listComments(id: string): MockComment[] {
  return store.comments[id] ?? [];
}

export function addComment(id: string, field: string | null, comment: string, author: string): MockComment {
  const c: MockComment = {
    id: crypto.randomUUID(),
    field,
    comment,
    author,
    status: null,
    createdAt: new Date().toISOString(),
  };
  (store.comments[id] ??= []).push(c);
  return c;
}

// --- Network + indicators (DEV-ONLY mock of the Phase 5 analytics) ---------

type NetNode = { id: string; label: string; actorType: number | null; level: number | null; registered: boolean; actorUid: string | null; degree: number };
type NetEdge = { source: string; target: string; relationTypes: string | null; originField: string };

function rows(v: unknown): Record<string, unknown>[] {
  return Array.isArray(v) ? (v.filter((r) => r && typeof r === "object") as Record<string, unknown>[]) : [];
}
function toInt(v: unknown): number | null {
  return typeof v === "number" ? v : typeof v === "string" && v.trim() !== "" ? Number(v) : null;
}

export function network(relationType?: number) {
  const published = store.items.filter((s) => s.status === "PUBLISHED");
  const nodes = new Map<string, NetNode>();
  const degree = new Map<string, number>();
  const edges: NetEdge[] = [];

  for (const s of published) {
    const srcId = s.actorId ?? s.id;
    if (!nodes.has(srcId)) {
      nodes.set(srcId, { id: srcId, label: s.actorName ?? srcId, actorType: s.actorType, level: null, registered: true, actorUid: null, degree: 0 });
    }
    const a = s.answers as Record<string, unknown>;
    for (const [field, v] of [["N.03", a.qN_03], ["J.13", a.qJ_13]] as const) {
      for (const r of rows(v)) {
        const name = typeof r.partner_name === "string" ? r.partner_name.trim() : "";
        if (!name) continue;
        const types = Array.isArray(r.relation_types) ? r.relation_types.map(String) : [];
        if (relationType != null && !types.includes(String(relationType))) continue;
        const tid = "u:" + name.toLowerCase();
        if (!nodes.has(tid)) {
          nodes.set(tid, { id: tid, label: name, actorType: toInt(r.partner_actor_type ?? r.actor_type), level: toInt(r.partner_level), registered: false, actorUid: null, degree: 0 });
        }
        edges.push({ source: srcId, target: tid, relationTypes: types.join(","), originField: field });
        degree.set(srcId, (degree.get(srcId) ?? 0) + 1);
        degree.set(tid, (degree.get(tid) ?? 0) + 1);
      }
    }
  }
  const nodeList = [...nodes.values()].map((n) => ({ ...n, degree: degree.get(n.id) ?? 0 }))
    .sort((a, b) => b.degree - a.degree);
  const registered = nodeList.filter((n) => n.registered).length;
  return {
    nodes: nodeList,
    edges,
    metrics: {
      nodeCount: nodeList.length,
      edgeCount: edges.length,
      registeredCount: registered,
      isolatedCount: Math.max(0, published.length - registered),
      mostConnected: nodeList.filter((n) => n.registered).slice(0, 5).map((n) => ({ id: n.id, label: n.label, degree: n.degree })),
    },
  };
}

export function indicators() {
  const published = store.items.filter((s) => s.status === "PUBLISHED");
  const count = (items: Record<string, unknown>[], key: (r: Record<string, unknown>) => unknown) => {
    const m = new Map<string, number>();
    for (const r of items) {
      const k = key(r);
      if (k != null && k !== "") m.set(String(k), (m.get(String(k)) ?? 0) + 1);
    }
    return [...m.entries()].map(([code, c]) => ({ code, count: c })).sort((a, b) => b.count - a.count);
  };
  const ans = published.map((s) => s.answers as Record<string, unknown>);
  const net = network();
  const answered = (v: unknown) =>
    v != null && v !== "" && !(Array.isArray(v) && v.length === 0);
  const byModule = modules().map((m) => {
    const relevant = ans.length * m.fields.length;
    let got = 0;
    for (const a of ans) {
      for (const f of m.fields) {
        if (answered(a[f.var])) got++;
      }
    }
    return {
      key: m.key,
      title: m.title_pt,
      fieldCount: m.fields.length,
      applicableSubmissions: ans.length,
      completenessPct: relevant === 0 ? 0 : Math.round((100 * got) / relevant),
    };
  });
  return {
    publishedActors: published.length,
    actorsByLevel: count(ans, (r) => r.qA_17),
    respondentsBySex: count(ans, (r) => r.qA_05),
    byModule,
    programmes: { count: 0, beneficiariesMen: 0, beneficiariesWomen: 0, byThematicArea: [], byDistrict: [] },
    coordination: {
      knowsGovPlans: count(ans, (r) => r.qN_01),
      participatesPlanning: count(ans, (r) => r.qN_02),
      networkNodes: net.metrics.nodeCount,
      networkEdges: net.metrics.edgeCount,
    },
  };
}
