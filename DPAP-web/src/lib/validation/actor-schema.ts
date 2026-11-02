/**
 * Actor form validation.
 *
 * The schema is built by a factory that receives the i18n dictionary, so every
 * validation message is localized and centralized — there are no hardcoded
 * strings here. Build it with the active dictionary:
 *
 *   const schema = buildActorSchema(dict);
 *   const result = schema.safeParse(input);
 */

import { z } from "zod";
import type { Dictionary } from "@/i18n/dictionary";
import { format } from "@/i18n/format";
import {
  ACTOR_TYPE_CODES,
  LEGAL_STATUS_CODES,
  SECTOR_CODES,
  FUNDING_TYPE_CODES,
  RESPONDENT_SEX_CODES,
  EDUCATION_CODES,
  SUBSECTOR_CODES,
  VALUE_CHAIN_LINK_CODES,
  OPERATION_LEVEL_CODES,
  LEGAL_FORMALITY_CODES,
  REGISTRATION_DOC_CODES,
  FUNDING_SOURCE_CODES,
} from "@/lib/domain/enums";

type Codes = readonly string[];
const asEnum = (codes: Codes) => codes as [string, ...string[]];

/** Mozambican mobile number: optional +258, leading 8, 9 digits total. */
const MZ_PHONE = /^(?:\+?258\s?)?8[2-7]\d{7}$/;

const NAME_MIN = 3;
const NAME_MAX = 160;

export function buildActorSchema(dict: Dictionary) {
  const v = dict.validation;

  const enumMessage = { message: v.invalidOption };

  return z.object({
    name: z
      .string()
      .trim()
      .min(NAME_MIN, { message: format(v.minLength, { min: NAME_MIN }) })
      .max(NAME_MAX, { message: format(v.maxLength, { max: NAME_MAX }) }),

    // Optional: not every actor has a registration number yet.
    registrationNumber: z
      .string()
      .trim()
      .max(60, { message: format(v.maxLength, { max: 60 }) })
      .optional()
      .or(z.literal("")),

    actorType: z.enum(
      ACTOR_TYPE_CODES as [string, ...string[]],
      enumMessage,
    ),
    legalStatus: z.enum(
      LEGAL_STATUS_CODES as [string, ...string[]],
      enumMessage,
    ),
    sector: z.enum(SECTOR_CODES as [string, ...string[]], enumMessage),

    districtCode: z.string().min(1, { message: v.required }),
    administrativePostCode: z.string().min(1, { message: v.required }),
    localityCode: z.string().trim().optional().or(z.literal("")),

    latitude: z
      .number({ message: v.latitude })
      .min(-90, { message: v.latitude })
      .max(90, { message: v.latitude }),
    longitude: z
      .number({ message: v.longitude })
      .min(-180, { message: v.longitude })
      .max(180, { message: v.longitude }),

    responsiblePerson: z
      .string()
      .trim()
      .max(160, { message: format(v.maxLength, { max: 160 }) })
      .optional()
      .or(z.literal("")),
    phone: z
      .string()
      .trim()
      .regex(MZ_PHONE, { message: v.phone })
      .optional()
      .or(z.literal("")),
    email: z
      .email({ message: v.email })
      .optional()
      .or(z.literal("")),
    address: z
      .string()
      .trim()
      .max(240, { message: format(v.maxLength, { max: 240 }) })
      .optional()
      .or(z.literal("")),

    // --- Activity detail (all optional) ---
    description: z
      .string()
      .trim()
      .max(4000, { message: format(v.maxLength, { max: 4000 }) })
      .optional()
      .or(z.literal("")),
    observations: z
      .string()
      .trim()
      .max(4000, { message: format(v.maxLength, { max: 4000 }) })
      .optional()
      .or(z.literal("")),
    // HTML date input emits YYYY-MM-DD.
    startDate: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/, { message: v.invalidOption })
      .optional()
      .or(z.literal("")),
    fundingType: z
      .enum(FUNDING_TYPE_CODES as [string, ...string[]], { message: v.invalidOption })
      .optional()
      .or(z.literal("")),
    imageUrl: z
      .url({ message: v.invalidOption })
      .max(512, { message: format(v.maxLength, { max: 512 }) })
      .optional()
      .or(z.literal("")),

    // --- BRD Module 0 / A / I general profile (all optional) ---
    acronym: z.string().trim().max(255).optional().or(z.literal("")),
    respondentSex: z.enum(asEnum(RESPONDENT_SEX_CODES)).optional().or(z.literal("")),
    respondentAge: z
      .number({ message: v.invalidOption })
      .int()
      .min(0)
      .max(130)
      .optional(),
    respondentEducation: z.enum(asEnum(EDUCATION_CODES)).optional().or(z.literal("")),
    phoneAlt: z.string().trim().max(32).optional().or(z.literal("")),
    website: z.string().trim().max(255).optional().or(z.literal("")),
    subsectors: z.array(z.enum(asEnum(SUBSECTOR_CODES))).optional(),
    valueChainLinks: z.array(z.enum(asEnum(VALUE_CHAIN_LINK_CODES))).optional(),
    operationLevel: z.enum(asEnum(OPERATION_LEVEL_CODES)).optional().or(z.literal("")),
    districtsOfOperation: z.array(z.string()).optional(),
    legalFormality: z.enum(asEnum(LEGAL_FORMALITY_CODES)).optional().or(z.literal("")),
    registrationDocs: z.array(z.enum(asEnum(REGISTRATION_DOC_CODES))).optional(),
    nuit: z
      .string()
      .trim()
      .regex(/^\d{9}$/, { message: v.invalidOption })
      .optional()
      .or(z.literal("")),
    consent: z.boolean().optional(),
    contactSharingConsent: z.boolean().optional(),
    fundingSources: z.array(z.enum(asEnum(FUNDING_SOURCE_CODES))).optional(),
    receivedCredit: z.boolean().optional(),
  });
}

export type ActorSchema = ReturnType<typeof buildActorSchema>;
export type ActorInput = z.infer<ActorSchema>;
