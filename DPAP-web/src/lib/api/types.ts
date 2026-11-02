/**
 * API contract types shared between the web app and (eventually) the offline
 * PWA. These mirror the backend DTOs.
 *
 * Every persisted entity carries the sync envelope (`version`, `createdAt`,
 * `updatedAt`, `syncStatus`) because conflict resolution is last-updated-wins +
 * server versioning — both clients depend on these fields being first-class.
 */

import type {
  ActorTypeCode,
  SectorCode,
  LegalStatusCode,
  FundingTypeCode,
} from "@/lib/domain/enums";

export type SyncStatus = "SYNCED" | "PENDING" | "CONFLICT";

/** Fields present on every server-persisted record. */
export type SyncEnvelope = {
  id: string;
  version: number;
  createdAt: string; // ISO 8601
  updatedAt: string; // ISO 8601 — authoritative for conflict resolution
  syncStatus: SyncStatus;
};

/** Minimal actor shape for lists, tables, and map markers. */
export type ActorSummary = {
  id: string;
  name: string;
  actorType: ActorTypeCode;
  sector: SectorCode;
  districtCode: string;
  latitude: number;
  longitude: number;
  updatedAt: string;
};

/** Full actor record. */
export type Actor = SyncEnvelope & {
  name: string;
  registrationNumber?: string;
  actorType: ActorTypeCode;
  legalStatus: LegalStatusCode;
  sector: SectorCode;
  districtCode: string;
  administrativePostCode: string;
  localityCode?: string;
  latitude: number;
  longitude: number;
  responsiblePerson?: string;
  phone?: string;
  email?: string;
  address?: string;
  /** Activity detail (all optional). */
  description?: string;
  observations?: string;
  /** ISO date (YYYY-MM-DD) the activity began. */
  startDate?: string;
  fundingType?: FundingTypeCode;
  /** Reference (URL) to a photo of the actor/activity. */
  imageUrl?: string;
  // --- BRD Module 0 / A / I general profile (all optional) ---
  acronym?: string;
  respondentSex?: string;
  respondentAge?: number;
  respondentEducation?: string;
  phoneAlt?: string;
  website?: string;
  subsectors?: string[];
  valueChainLinks?: string[];
  operationLevel?: string;
  districtsOfOperation?: string[];
  legalFormality?: string;
  registrationDocs?: string[];
  nuit?: string;
  consent?: boolean;
  contactSharingConsent?: boolean;
  fundingSources?: string[];
  receivedCredit?: boolean;
};

/** Payload for creating/updating an actor (no server-managed fields). */
export type ActorWriteModel = Omit<Actor, keyof SyncEnvelope>;

export type ActorFilters = {
  q?: string;
  districtCode?: string;
  localityCode?: string;
  sector?: SectorCode;
  actorType?: ActorTypeCode;
  legalStatus?: LegalStatusCode;
  page?: number;
  pageSize?: number;
};

/** Standard paginated envelope returned by list endpoints. */
export type Paginated<T> = {
  items: T[];
  page: number;
  pageSize: number;
  total: number;
};

/** Role as sent on the wire by the backend (uppercase enum names, BRD §3.3). */
export type UserRole =
  | "SYS_ADMIN"
  | "DATA_MANAGER"
  | "SUPERVISOR"
  | "ENUMERATOR"
  | "ANALYST"
  | "PARTNER";

export type UserAdmin = {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  enabled: boolean;
  createdAt: string;
};

export type UserCreateInput = {
  name: string;
  email: string;
  role: UserRole;
  password: string;
};

export type UserUpdateInput = {
  name: string;
  role: UserRole;
  enabled: boolean;
  /** Only sent to reset the password. */
  password?: string;
};

/** Audit trail ------------------------------------------------------------- */

/** Action recorded on a data mutation (matches the backend enum). */
export type AuditAction = "CREATE" | "UPDATE" | "DELETE";

/** A single immutable audit-trail entry. */
export type AuditLog = {
  id: string;
  at: string; // ISO 8601
  actorEmail: string;
  action: AuditAction;
  /** Entity type, uppercase on the wire: "ACTOR" | "USER". */
  entityType: string;
  entityId: string;
  summary?: string;
};

export type AuditFilters = {
  entityType?: string;
  action?: AuditAction;
  page?: number;
  pageSize?: number;
};

export type CountByCode = { code: string; count: number };

/** Aggregates backing the dashboard. */
export type DashboardStats = {
  totalActors: number;
  byDistrict: CountByCode[];
  bySector: CountByCode[];
  byType: CountByCode[];
  registrationTrend: { period: string; count: number }[];
  /** 0..1 — share of records with all key fields populated. */
  completeness: number;
  sync: { pending: number; conflicts: number; lastSyncAt: string | null };
};

// --- Submissions (BRD interview workflow) ---------------------------------

export type SubmissionStatus =
  | "DRAFT"
  | "SUBMITTED"
  | "UNDER_REVIEW"
  | "RETURNED"
  | "APPROVED"
  | "PUBLISHED"
  | "REJECTED";

export type SubmissionAction =
  | "SUBMIT"
  | "OPEN_REVIEW"
  | "RETURN"
  | "APPROVE"
  | "REJECT"
  | "PUBLISH";

/** Full submission as returned by the backend. */
export type Submission = {
  id: string;
  questionnaireNumber: number | null;
  clientUuid: string | null;
  status: SubmissionStatus;
  actorId: string | null;
  roundId: string | null;
  formVersion: string;
  enumeratorId: string | null;
  supervisorId: string | null;
  districtCode: string | null;
  actorType: number | null;
  actorName: string | null;
  consent: boolean | null;
  answers: Record<string, unknown>;
  submittedAt: string | null;
  reviewedAt: string | null;
  publishedAt: string | null;
  syncStatus: string;
  /** Number of open QC flags raised against this submission (review queue). */
  qcFlagCount: number;
  version: number;
  createdAt: string;
  updatedAt: string;
};

export type SubmissionRequest = {
  clientUuid?: string;
  roundId?: string;
  formVersion?: string;
  districtCode?: string;
  answers: Record<string, unknown>;
  deviceId?: string;
  submit?: boolean;
};

export type SubmissionFilters = {
  status?: SubmissionStatus;
  districtCode?: string;
  actorType?: number;
  mine?: boolean;
  page?: number;
  pageSize?: number;
};

// --- QC / review / registry (Phase 4) -------------------------------------

export type QcFlag = {
  id: string;
  ruleId: string;
  severity: "LOW" | "MEDIUM" | "HIGH";
  message: string;
  resolved: boolean;
};

export type ReviewComment = {
  id: string;
  field: string | null;
  comment: string;
  author: string;
  status: string | null;
  createdAt: string;
};

export type DuplicateCandidate = {
  id: string;
  actorUid: string | null;
  name: string;
  districtCode: string | null;
  phone: string | null;
  nuit: string | null;
  reason: string;
};

// --- Network + indicators (Phase 5) ---------------------------------------

export type NetworkNode = {
  id: string;
  label: string;
  actorType: number | null;
  level: number | null;
  registered: boolean;
  actorUid: string | null;
  degree: number;
};

export type NetworkEdge = {
  source: string;
  target: string;
  relationTypes: string | null;
  originField: string;
};

export type Network = {
  nodes: NetworkNode[];
  edges: NetworkEdge[];
  metrics: {
    nodeCount: number;
    edgeCount: number;
    registeredCount: number;
    isolatedCount: number;
    mostConnected: { id: string; label: string; degree: number }[];
  };
};

export type CodeCount = { code: string; count: number };

/** Per-questionnaire-module response statistics (data conformance). */
export type ModuleStat = {
  key: string;
  title: string;
  fieldCount: number;
  applicableSubmissions: number;
  completenessPct: number;
};

export type Indicators = {
  publishedActors: number;
  actorsByLevel: CodeCount[];
  respondentsBySex: CodeCount[];
  byModule: ModuleStat[];
  programmes: {
    count: number;
    beneficiariesMen: number;
    beneficiariesWomen: number;
    byThematicArea: CodeCount[];
    byDistrict: CodeCount[];
  };
  coordination: {
    knowsGovPlans: CodeCount[];
    participatesPlanning: CodeCount[];
    networkNodes: number;
    networkEdges: number;
  };
};
