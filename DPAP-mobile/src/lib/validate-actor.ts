/**
 * Centralized, localized actor validation (no inline messages in components).
 * Returns a map of field → error message; an empty map means valid.
 */

import { dict } from "@/i18n";
import {
  ACTOR_TYPE_CODES,
  SECTOR_CODES,
  LEGAL_STATUS_CODES,
  FUNDING_TYPE_CODES,
} from "@/domain/enums";

/** The raw form draft (strings as entered; coordinates parsed separately). */
export type ActorDraft = {
  name: string;
  registrationNumber: string;
  actorType: string;
  legalStatus: string;
  sector: string;
  districtCode: string;
  administrativePostCode: string;
  localityCode: string;
  latitude: string;
  longitude: string;
  responsiblePerson: string;
  phone: string;
  email: string;
  address: string;
  description: string;
  observations: string;
  startDate: string;
  fundingType: string;
  imageUrl: string;
  // --- BRD profile ---
  acronym: string;
  respondentSex: string;
  respondentAge: string;
  respondentEducation: string;
  phoneAlt: string;
  website: string;
  subsectors: string[];
  valueChainLinks: string[];
  operationLevel: string;
  districtsOfOperation: string[];
  legalFormality: string;
  registrationDocs: string[];
  nuit: string;
  consent: boolean;
  contactSharingConsent: boolean;
  fundingSources: string[];
  receivedCredit: boolean;
};

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
// Mozambique mobile: optional +258 then a 9-digit number starting 8.
const PHONE_RE = /^(\+?258)?\s?8[0-9]{8}$/;
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const URL_RE = /^https?:\/\/\S+$/i;

export type ActorErrors = Partial<Record<keyof ActorDraft, string>>;

export function validateActorDraft(d: ActorDraft): ActorErrors {
  const v = dict.validation;
  const errors: ActorErrors = {};

  if (d.name.trim().length < 2) errors.name = v.minLength.replace("{min}", "2");
  if (!(ACTOR_TYPE_CODES as string[]).includes(d.actorType))
    errors.actorType = v.invalidOption;
  if (!(LEGAL_STATUS_CODES as string[]).includes(d.legalStatus))
    errors.legalStatus = v.invalidOption;
  if (!(SECTOR_CODES as string[]).includes(d.sector)) errors.sector = v.invalidOption;
  if (!d.districtCode) errors.districtCode = v.required;
  if (!d.administrativePostCode) errors.administrativePostCode = v.required;

  const lat = Number(d.latitude);
  if (d.latitude.trim() === "" || Number.isNaN(lat) || lat < -90 || lat > 90)
    errors.latitude = v.latitude;
  const lon = Number(d.longitude);
  if (d.longitude.trim() === "" || Number.isNaN(lon) || lon < -180 || lon > 180)
    errors.longitude = v.longitude;

  if (d.email.trim() && !EMAIL_RE.test(d.email.trim())) errors.email = v.email;
  if (d.phone.trim() && !PHONE_RE.test(d.phone.trim())) errors.phone = v.phone;

  if (d.startDate.trim() && !DATE_RE.test(d.startDate.trim()))
    errors.startDate = v.invalidOption;
  if (d.fundingType && !(FUNDING_TYPE_CODES as string[]).includes(d.fundingType))
    errors.fundingType = v.invalidOption;
  if (d.imageUrl.trim() && !URL_RE.test(d.imageUrl.trim()))
    errors.imageUrl = v.invalidOption;

  if (d.respondentAge.trim()) {
    const age = Number(d.respondentAge);
    if (!Number.isInteger(age) || age < 0 || age > 130) errors.respondentAge = v.invalidOption;
  }
  if (d.nuit.trim() && !/^\d{9}$/.test(d.nuit.trim())) errors.nuit = v.invalidOption;

  return errors;
}
