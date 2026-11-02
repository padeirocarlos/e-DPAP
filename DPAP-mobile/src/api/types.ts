/**
 * API contract types — mirror the backend DTOs and DPAP-web's `api/types.ts`.
 * The sync-relevant fields (`version`, `updatedAt`) are first-class because
 * conflict resolution is last-updated-wins + server versioning.
 */

import type {
  ActorTypeCode,
  SectorCode,
  LegalStatusCode,
  FundingTypeCode,
  RoleCode,
} from "@/domain/enums";

export type SyncStatus = "SYNCED" | "PENDING" | "CONFLICT";

/** Payload sent to the backend to create/update an actor (no server fields). */
export type ActorWriteModel = {
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

/** Full actor record as returned by the backend. */
export type Actor = ActorWriteModel & {
  id: string;
  version: number;
  createdAt: string;
  updatedAt: string;
};

export type Paginated<T> = {
  items: T[];
  page: number;
  pageSize: number;
  total: number;
};

export type AuthUser = {
  id: string;
  name: string;
  email: string;
  role: RoleCode | string;
};

export type LoginResponse = { token: string; user: AuthUser };
