/**
 * Domain enumerations (codes).
 *
 * Codes are stable identifiers stored in the database and exchanged with the
 * API; their human labels live in the i18n dictionaries under `domain.*`. The
 * code lists are derived from the Portuguese catalog so a code can never exist
 * without a label, nor a label without a code.
 */

import { pt } from "@/i18n/locales/pt";

export type ActorTypeCode = keyof typeof pt.domain.actorType;
export type SectorCode = keyof typeof pt.domain.sector;
export type LegalStatusCode = keyof typeof pt.domain.legalStatus;
export type FundingTypeCode = keyof typeof pt.domain.fundingType;
export type RoleCode = keyof typeof pt.roles;

export const ACTOR_TYPE_CODES = Object.keys(
  pt.domain.actorType,
) as ActorTypeCode[];

export const SECTOR_CODES = Object.keys(pt.domain.sector) as SectorCode[];

export const FUNDING_TYPE_CODES = Object.keys(
  pt.domain.fundingType,
) as FundingTypeCode[];

// --- BRD Module 0 / A / I code lists ---
export type RespondentSexCode = keyof typeof pt.domain.respondentSex;
export type EducationCode = keyof typeof pt.domain.education;
export type SubsectorCode = keyof typeof pt.domain.subsector;
export type ValueChainLinkCode = keyof typeof pt.domain.valueChainLink;
export type OperationLevelCode = keyof typeof pt.domain.operationLevel;
export type LegalFormalityCode = keyof typeof pt.domain.legalFormality;
export type RegistrationDocCode = keyof typeof pt.domain.registrationDoc;
export type FundingSourceCode = keyof typeof pt.domain.fundingSource;

export const RESPONDENT_SEX_CODES = Object.keys(pt.domain.respondentSex) as RespondentSexCode[];
export const EDUCATION_CODES = Object.keys(pt.domain.education) as EducationCode[];
export const SUBSECTOR_CODES = Object.keys(pt.domain.subsector) as SubsectorCode[];
export const VALUE_CHAIN_LINK_CODES = Object.keys(pt.domain.valueChainLink) as ValueChainLinkCode[];
export const OPERATION_LEVEL_CODES = Object.keys(pt.domain.operationLevel) as OperationLevelCode[];
export const LEGAL_FORMALITY_CODES = Object.keys(pt.domain.legalFormality) as LegalFormalityCode[];
export const REGISTRATION_DOC_CODES = Object.keys(pt.domain.registrationDoc) as RegistrationDocCode[];
export const FUNDING_SOURCE_CODES = Object.keys(pt.domain.fundingSource) as FundingSourceCode[];

export const LEGAL_STATUS_CODES = Object.keys(
  pt.domain.legalStatus,
) as LegalStatusCode[];

export const ROLE_CODES = Object.keys(pt.roles) as RoleCode[];
