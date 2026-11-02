/**
 * Domain enumerations (codes). Codes are the stable identifiers stored and
 * exchanged with the backend; labels live in `i18n/pt.ts` under `domain.*`.
 * Lists are derived from the catalog so a code can never exist without a label.
 * These must stay identical to the DPAP-web / backend enum values.
 */

import { pt } from "@/i18n/pt";

export type ActorTypeCode = keyof typeof pt.domain.actorType;
export type SectorCode = keyof typeof pt.domain.sector;
export type LegalStatusCode = keyof typeof pt.domain.legalStatus;
export type FundingTypeCode = keyof typeof pt.domain.fundingType;
export type RoleCode = keyof typeof pt.roles;

export const ACTOR_TYPE_CODES = Object.keys(pt.domain.actorType) as ActorTypeCode[];
export const SECTOR_CODES = Object.keys(pt.domain.sector) as SectorCode[];
export const LEGAL_STATUS_CODES = Object.keys(
  pt.domain.legalStatus,
) as LegalStatusCode[];
export const FUNDING_TYPE_CODES = Object.keys(
  pt.domain.fundingType,
) as FundingTypeCode[];

// --- BRD Module 0 / A / I code lists ---
export const RESPONDENT_SEX_CODES = Object.keys(pt.domain.respondentSex);
export const EDUCATION_CODES = Object.keys(pt.domain.education);
export const SUBSECTOR_CODES = Object.keys(pt.domain.subsector);
export const VALUE_CHAIN_LINK_CODES = Object.keys(pt.domain.valueChainLink);
export const OPERATION_LEVEL_CODES = Object.keys(pt.domain.operationLevel);
export const LEGAL_FORMALITY_CODES = Object.keys(pt.domain.legalFormality);
export const REGISTRATION_DOC_CODES = Object.keys(pt.domain.registrationDoc);
export const FUNDING_SOURCE_CODES = Object.keys(pt.domain.fundingSource);
