"use client";

/**
 * Actor registration form.
 *
 * Demonstrates the project's cross-cutting rules in one place:
 *  - no hardcoded text — every label/message comes from the dictionary;
 *  - validation via the localized zod schema (`buildActorSchema`);
 *  - duplicate avoidance — a debounced check blocks exact duplicates and warns
 *    on near-matches before the record can be saved.
 */

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useDictionary, useLocale } from "@/i18n/provider";
import { appConfig } from "@/config/app.config";
import { routes } from "@/config/routes";
import { Field, controlClass } from "@/components/ui/field";
import { buildActorSchema } from "@/lib/validation/actor-schema";
import type { DuplicateMatch } from "@/lib/validation/duplicate";
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
  type ActorTypeCode,
  type LegalStatusCode,
  type SectorCode,
  type FundingTypeCode,
} from "@/lib/domain/enums";
import { DISTRICTS, getDistrict } from "@/lib/domain/location";
import { format } from "@/i18n/format";
import {
  createActorAction,
  updateActorAction,
  checkActorDuplicatesAction,
} from "@/lib/actions/actors";
import type { ActorWriteModel } from "@/lib/api/types";

export type FormState = {
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

const EMPTY: FormState = {
  name: "",
  registrationNumber: "",
  actorType: "",
  legalStatus: "",
  sector: "",
  districtCode: "",
  administrativePostCode: "",
  localityCode: "",
  latitude: "",
  longitude: "",
  responsiblePerson: "",
  phone: "",
  email: "",
  address: "",
  description: "",
  observations: "",
  startDate: "",
  fundingType: "",
  imageUrl: "",
  acronym: "",
  respondentSex: "",
  respondentAge: "",
  respondentEducation: "",
  phoneAlt: "",
  website: "",
  subsectors: [],
  valueChainLinks: [],
  operationLevel: "",
  districtsOfOperation: [],
  legalFormality: "",
  registrationDocs: [],
  nuit: "",
  consent: false,
  contactSharingConsent: false,
  fundingSources: [],
  receivedCredit: false,
};

export type ActorFormProps =
  | { mode?: "create"; actorId?: undefined; version?: undefined; initial?: undefined }
  | { mode: "edit"; actorId: string; version: number; initial: FormState };

export function ActorForm({
  mode = "create",
  actorId,
  version,
  initial,
}: ActorFormProps = {}) {
  const dict = useDictionary();
  const locale = useLocale();
  const router = useRouter();
  const f = dict.actors.form;
  const schema = useMemo(() => buildActorSchema(dict), [dict]);
  const isEdit = mode === "edit";

  const [form, setForm] = useState<FormState>(initial ?? EMPTY);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [matches, setMatches] = useState<DuplicateMatch[]>([]);
  const [checking, setChecking] = useState(false);
  const [saved, setSaved] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const set = (key: keyof FormState, value: string) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    setSaved(false);
    setSubmitError(null);
  };

  type MultiKey =
    | "subsectors"
    | "valueChainLinks"
    | "districtsOfOperation"
    | "registrationDocs"
    | "fundingSources";
  const toggleMulti = (key: MultiKey, code: string) => {
    setForm((prev) => {
      const cur = prev[key];
      const next = cur.includes(code) ? cur.filter((c) => c !== code) : [...cur, code];
      return { ...prev, [key]: next };
    });
    setSaved(false);
    setSubmitError(null);
  };

  type BoolKey = "consent" | "contactSharingConsent" | "receivedCredit";
  const setBool = (key: BoolKey, value: boolean) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    setSaved(false);
    setSubmitError(null);
  };

  const districtName = (code: string) => getDistrict(code)?.name ?? code;
  const posts = getDistrict(form.districtCode)?.administrativePosts ?? [];

  // Debounced duplicate check keyed on the identity-defining fields. All state
  // updates run inside the timeout callback (never synchronously in the effect
  // body) so typing doesn't trigger cascading renders.
  useEffect(() => {
    const canCheck =
      form.name.trim().length >= 3 && form.districtCode && form.actorType;

    const handle = setTimeout(async () => {
      if (!canCheck) {
        setMatches([]);
        setChecking(false);
        return;
      }
      setChecking(true);
      try {
        const result = await checkActorDuplicatesAction(
          {
            name: form.name,
            districtCode: form.districtCode,
            actorType: form.actorType,
            registrationNumber: form.registrationNumber || undefined,
          },
          actorId, // exclude self when editing
        );
        setMatches(result);
      } catch {
        // Never block typing on a failed check; the server enforces uniqueness.
        setMatches([]);
      } finally {
        setChecking(false);
      }
    }, appConfig.duplicateCheckDebounceMs);

    return () => clearTimeout(handle);
  }, [
    form.name,
    form.districtCode,
    form.actorType,
    form.registrationNumber,
    actorId,
  ]);

  const exactMatch = matches.find((m) => m.exact);
  const similar = matches.filter((m) => !m.exact);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (exactMatch || submitting) return; // hard block on a known duplicate

    const candidate = {
      ...form,
      latitude: form.latitude === "" ? Number.NaN : Number(form.latitude),
      longitude: form.longitude === "" ? Number.NaN : Number(form.longitude),
      respondentAge:
        form.respondentAge === "" ? undefined : Number(form.respondentAge),
    };

    const result = schema.safeParse(candidate);
    if (!result.success) {
      const next: Record<string, string> = {};
      for (const issue of result.error.issues) {
        const key = String(issue.path[0]);
        if (!next[key]) next[key] = issue.message;
      }
      setErrors(next);
      return;
    }

    setErrors({});
    const d = result.data;
    // Validated against the code lists, so the enum casts are sound.
    const payload: ActorWriteModel = {
      name: d.name,
      registrationNumber: d.registrationNumber || undefined,
      actorType: d.actorType as ActorTypeCode,
      legalStatus: d.legalStatus as LegalStatusCode,
      sector: d.sector as SectorCode,
      districtCode: d.districtCode,
      administrativePostCode: d.administrativePostCode,
      localityCode: d.localityCode || undefined,
      latitude: d.latitude,
      longitude: d.longitude,
      responsiblePerson: d.responsiblePerson || undefined,
      phone: d.phone || undefined,
      email: d.email || undefined,
      address: d.address || undefined,
      description: d.description || undefined,
      observations: d.observations || undefined,
      startDate: d.startDate || undefined,
      fundingType: (d.fundingType || undefined) as FundingTypeCode | undefined,
      imageUrl: d.imageUrl || undefined,
      acronym: d.acronym || undefined,
      respondentSex: d.respondentSex || undefined,
      respondentAge: typeof d.respondentAge === "number" ? d.respondentAge : undefined,
      respondentEducation: d.respondentEducation || undefined,
      phoneAlt: d.phoneAlt || undefined,
      website: d.website || undefined,
      subsectors: d.subsectors?.length ? d.subsectors : undefined,
      valueChainLinks: d.valueChainLinks?.length ? d.valueChainLinks : undefined,
      operationLevel: d.operationLevel || undefined,
      districtsOfOperation: d.districtsOfOperation?.length ? d.districtsOfOperation : undefined,
      legalFormality: d.legalFormality || undefined,
      registrationDocs: d.registrationDocs?.length ? d.registrationDocs : undefined,
      nuit: d.nuit || undefined,
      consent: d.consent,
      contactSharingConsent: d.contactSharingConsent,
      fundingSources: d.fundingSources?.length ? d.fundingSources : undefined,
      receivedCredit: d.receivedCredit,
    };

    setSubmitting(true);
    setSubmitError(null);
    try {
      const res =
        isEdit && actorId !== undefined && version !== undefined
          ? await updateActorAction(actorId, version, payload)
          : await createActorAction(payload);

      if (res.ok) {
        setSaved(true);
        setMatches([]);
        if (isEdit) {
          // Return to the list and refresh the server data.
          router.push(routes.actors(locale));
          router.refresh();
        } else {
          setForm(EMPTY);
        }
      } else if (res.code === "CONFLICT") {
        setSubmitError(f.conflictError);
      } else if (res.code === "STALE") {
        setSubmitError(f.conflictStale);
      } else {
        // Surface the backend's own reason (e.g. a validation detail) when it
        // sent one; fall back to the generic connectivity message otherwise.
        setSubmitError(res.message ?? f.saveError);
      }
    } catch {
      setSubmitError(f.saveError);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} noValidate className="space-y-8">
      {/* Identification */}
      <fieldset className="space-y-4">
        <legend className="text-sm font-semibold text-emerald-700 dark:text-emerald-400">
          {f.sections.identification}
        </legend>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field
            id="name"
            label={f.fields.name}
            required
            error={errors.name}
          >
            <input
              id="name"
              className={controlClass}
              value={form.name}
              onChange={(e) => set("name", e.target.value)}
              aria-invalid={!!errors.name}
            />
          </Field>

          <Field
            id="registrationNumber"
            label={f.fields.registrationNumber}
            hint={f.hints.registrationNumber}
            error={errors.registrationNumber}
          >
            <input
              id="registrationNumber"
              className={controlClass}
              value={form.registrationNumber}
              onChange={(e) => set("registrationNumber", e.target.value)}
            />
          </Field>

          <Field
            id="actorType"
            label={f.fields.actorType}
            required
            error={errors.actorType}
          >
            <select
              id="actorType"
              className={controlClass}
              value={form.actorType}
              onChange={(e) => set("actorType", e.target.value)}
              aria-invalid={!!errors.actorType}
            >
              <option value="">—</option>
              {ACTOR_TYPE_CODES.map((code) => (
                <option key={code} value={code}>
                  {dict.domain.actorType[code]}
                </option>
              ))}
            </select>
          </Field>

          <Field
            id="legalStatus"
            label={f.fields.legalStatus}
            required
            error={errors.legalStatus}
          >
            <select
              id="legalStatus"
              className={controlClass}
              value={form.legalStatus}
              onChange={(e) => set("legalStatus", e.target.value)}
              aria-invalid={!!errors.legalStatus}
            >
              <option value="">—</option>
              {LEGAL_STATUS_CODES.map((code) => (
                <option key={code} value={code}>
                  {dict.domain.legalStatus[code]}
                </option>
              ))}
            </select>
          </Field>

          <Field
            id="sector"
            label={f.fields.sector}
            required
            error={errors.sector}
          >
            <select
              id="sector"
              className={controlClass}
              value={form.sector}
              onChange={(e) => set("sector", e.target.value)}
              aria-invalid={!!errors.sector}
            >
              <option value="">—</option>
              {SECTOR_CODES.map((code) => (
                <option key={code} value={code}>
                  {dict.domain.sector[code]}
                </option>
              ))}
            </select>
          </Field>
        </div>
      </fieldset>

      {/* Duplicate feedback */}
      <DuplicateNotice
        checking={checking}
        exactMatch={exactMatch}
        similar={similar}
        districtName={districtName}
        name={form.name}
      />

      {/* Location */}
      <fieldset className="space-y-4">
        <legend className="text-sm font-semibold text-emerald-700 dark:text-emerald-400">
          {f.sections.location}
        </legend>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field
            id="districtCode"
            label={f.fields.district}
            required
            error={errors.districtCode}
          >
            <select
              id="districtCode"
              className={controlClass}
              value={form.districtCode}
              onChange={(e) => {
                set("districtCode", e.target.value);
                set("administrativePostCode", "");
              }}
              aria-invalid={!!errors.districtCode}
            >
              <option value="">—</option>
              {DISTRICTS.map((d) => (
                <option key={d.code} value={d.code}>
                  {d.name}
                </option>
              ))}
            </select>
          </Field>

          <Field
            id="administrativePostCode"
            label={f.fields.administrativePost}
            required
            error={errors.administrativePostCode}
          >
            <select
              id="administrativePostCode"
              className={controlClass}
              value={form.administrativePostCode}
              onChange={(e) => set("administrativePostCode", e.target.value)}
              disabled={!form.districtCode}
              aria-invalid={!!errors.administrativePostCode}
            >
              <option value="">—</option>
              {posts.map((p) => (
                <option key={p.code} value={p.code}>
                  {p.name}
                </option>
              ))}
            </select>
          </Field>

          <Field
            id="localityCode"
            label={f.fields.locality}
            error={errors.localityCode}
          >
            <input
              id="localityCode"
              className={controlClass}
              value={form.localityCode}
              onChange={(e) => set("localityCode", e.target.value)}
            />
          </Field>

          <div className="grid grid-cols-2 gap-4">
            <Field
              id="latitude"
              label={f.fields.latitude}
              required
              hint={f.hints.coordinates}
              error={errors.latitude}
            >
              <input
                id="latitude"
                inputMode="decimal"
                className={controlClass}
                value={form.latitude}
                onChange={(e) => set("latitude", e.target.value)}
                aria-invalid={!!errors.latitude}
              />
            </Field>
            <Field
              id="longitude"
              label={f.fields.longitude}
              required
              error={errors.longitude}
            >
              <input
                id="longitude"
                inputMode="decimal"
                className={controlClass}
                value={form.longitude}
                onChange={(e) => set("longitude", e.target.value)}
                aria-invalid={!!errors.longitude}
              />
            </Field>
          </div>
        </div>
      </fieldset>

      {/* Contacts */}
      <fieldset className="space-y-4">
        <legend className="text-sm font-semibold text-emerald-700 dark:text-emerald-400">
          {f.sections.contacts}
        </legend>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field
            id="responsiblePerson"
            label={f.fields.responsiblePerson}
            error={errors.responsiblePerson}
          >
            <input
              id="responsiblePerson"
              className={controlClass}
              value={form.responsiblePerson}
              onChange={(e) => set("responsiblePerson", e.target.value)}
            />
          </Field>
          <Field id="phone" label={f.fields.phone} error={errors.phone}>
            <input
              id="phone"
              inputMode="tel"
              className={controlClass}
              value={form.phone}
              onChange={(e) => set("phone", e.target.value)}
              aria-invalid={!!errors.phone}
            />
          </Field>
          <Field id="email" label={f.fields.email} error={errors.email}>
            <input
              id="email"
              type="email"
              className={controlClass}
              value={form.email}
              onChange={(e) => set("email", e.target.value)}
              aria-invalid={!!errors.email}
            />
          </Field>
          <Field id="phoneAlt" label={f.fields.phoneAlt} error={errors.phoneAlt}>
            <input
              id="phoneAlt"
              inputMode="tel"
              className={controlClass}
              value={form.phoneAlt}
              onChange={(e) => set("phoneAlt", e.target.value)}
            />
          </Field>
          <Field id="address" label={f.fields.address} error={errors.address}>
            <input
              id="address"
              className={controlClass}
              value={form.address}
              onChange={(e) => set("address", e.target.value)}
            />
          </Field>
          <Field id="website" label={f.fields.website} error={errors.website}>
            <input
              id="website"
              className={controlClass}
              value={form.website}
              onChange={(e) => set("website", e.target.value)}
            />
          </Field>
        </div>
      </fieldset>

      {/* Activity detail */}
      <fieldset className="space-y-4">
        <legend className="text-sm font-semibold text-emerald-700 dark:text-emerald-400">
          {f.sections.activity}
        </legend>
        <Field
          id="description"
          label={f.fields.description}
          hint={f.hints.description}
          error={errors.description}
        >
          <textarea
            id="description"
            rows={4}
            className={controlClass}
            value={form.description}
            onChange={(e) => set("description", e.target.value)}
          />
        </Field>
        <Field id="observations" label={f.fields.observations} error={errors.observations}>
          <textarea
            id="observations"
            rows={3}
            className={controlClass}
            value={form.observations}
            onChange={(e) => set("observations", e.target.value)}
          />
        </Field>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field id="startDate" label={f.fields.startDate} error={errors.startDate}>
            <input
              id="startDate"
              type="date"
              className={controlClass}
              value={form.startDate}
              onChange={(e) => set("startDate", e.target.value)}
            />
          </Field>
          <Field id="fundingType" label={f.fields.fundingType} error={errors.fundingType}>
            <select
              id="fundingType"
              className={controlClass}
              value={form.fundingType}
              onChange={(e) => set("fundingType", e.target.value)}
            >
              <option value="">{f.selectOption}</option>
              {FUNDING_TYPE_CODES.map((code) => (
                <option key={code} value={code}>
                  {dict.domain.fundingType[code]}
                </option>
              ))}
            </select>
          </Field>
        </div>
        <Field
          id="imageUrl"
          label={f.fields.imageUrl}
          hint={f.hints.imageUrl}
          error={errors.imageUrl}
        >
          <input
            id="imageUrl"
            type="url"
            inputMode="url"
            placeholder="https://…"
            className={controlClass}
            value={form.imageUrl}
            onChange={(e) => set("imageUrl", e.target.value)}
          />
        </Field>
        {/* Live preview when a valid-looking URL is present. */}
        {/^https?:\/\//.test(form.imageUrl) ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={form.imageUrl}
            alt=""
            className="max-h-40 rounded-md border border-black/10 object-cover dark:border-white/15"
          />
        ) : null}
      </fieldset>

      {/* Respondent profile */}
      <fieldset className="space-y-4">
        <legend className="text-sm font-semibold text-emerald-700 dark:text-emerald-400">
          {f.sections.profile}
        </legend>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field id="acronym" label={f.fields.acronym}>
            <input id="acronym" className={controlClass} value={form.acronym} onChange={(e) => set("acronym", e.target.value)} />
          </Field>
          <Field id="respondentSex" label={f.fields.respondentSex}>
            <select id="respondentSex" className={controlClass} value={form.respondentSex} onChange={(e) => set("respondentSex", e.target.value)}>
              <option value="">{f.selectOption}</option>
              {RESPONDENT_SEX_CODES.map((c) => (
                <option key={c} value={c}>{dict.domain.respondentSex[c]}</option>
              ))}
            </select>
          </Field>
          <Field id="respondentAge" label={f.fields.respondentAge} error={errors.respondentAge}>
            <input id="respondentAge" type="number" inputMode="numeric" min={0} max={130} className={controlClass} value={form.respondentAge} onChange={(e) => set("respondentAge", e.target.value)} />
          </Field>
          <Field id="respondentEducation" label={f.fields.respondentEducation}>
            <select id="respondentEducation" className={controlClass} value={form.respondentEducation} onChange={(e) => set("respondentEducation", e.target.value)}>
              <option value="">{f.selectOption}</option>
              {EDUCATION_CODES.map((c) => (
                <option key={c} value={c}>{dict.domain.education[c]}</option>
              ))}
            </select>
          </Field>
        </div>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={form.consent} onChange={(e) => setBool("consent", e.target.checked)} />
          {f.fields.consent}
        </label>
      </fieldset>

      {/* Scope of operation */}
      <fieldset className="space-y-4">
        <legend className="text-sm font-semibold text-emerald-700 dark:text-emerald-400">
          {f.sections.scope}
        </legend>
        <MultiSelect label={f.fields.subsectors} codes={SUBSECTOR_CODES} labels={dict.domain.subsector} selected={form.subsectors} onToggle={(c) => toggleMulti("subsectors", c)} />
        <MultiSelect label={f.fields.valueChainLinks} codes={VALUE_CHAIN_LINK_CODES} labels={dict.domain.valueChainLink} selected={form.valueChainLinks} onToggle={(c) => toggleMulti("valueChainLinks", c)} />
        <Field id="operationLevel" label={f.fields.operationLevel}>
          <select id="operationLevel" className={controlClass} value={form.operationLevel} onChange={(e) => set("operationLevel", e.target.value)}>
            <option value="">{f.selectOption}</option>
            {OPERATION_LEVEL_CODES.map((c) => (
              <option key={c} value={c}>{dict.domain.operationLevel[c]}</option>
            ))}
          </select>
        </Field>
        <MultiSelect label={f.fields.districtsOfOperation} codes={DISTRICTS.map((d) => d.code)} labels={Object.fromEntries(DISTRICTS.map((d) => [d.code, d.name]))} selected={form.districtsOfOperation} onToggle={(c) => toggleMulti("districtsOfOperation", c)} />
      </fieldset>

      {/* Legal status */}
      <fieldset className="space-y-4">
        <legend className="text-sm font-semibold text-emerald-700 dark:text-emerald-400">
          {f.sections.legal}
        </legend>
        <Field id="legalFormality" label={f.fields.legalFormality}>
          <select id="legalFormality" className={controlClass} value={form.legalFormality} onChange={(e) => set("legalFormality", e.target.value)}>
            <option value="">{f.selectOption}</option>
            {LEGAL_FORMALITY_CODES.map((c) => (
              <option key={c} value={c}>{dict.domain.legalFormality[c]}</option>
            ))}
          </select>
        </Field>
        <MultiSelect label={f.fields.registrationDocs} codes={REGISTRATION_DOC_CODES} labels={dict.domain.registrationDoc} selected={form.registrationDocs} onToggle={(c) => toggleMulti("registrationDocs", c)} />
        <Field id="nuit" label={f.fields.nuit} error={errors.nuit}>
          <input id="nuit" inputMode="numeric" className={controlClass} value={form.nuit} onChange={(e) => set("nuit", e.target.value)} />
        </Field>
      </fieldset>

      {/* Financing */}
      <fieldset className="space-y-4">
        <legend className="text-sm font-semibold text-emerald-700 dark:text-emerald-400">
          {f.sections.financing}
        </legend>
        <MultiSelect label={f.fields.fundingSources} codes={FUNDING_SOURCE_CODES} labels={dict.domain.fundingSource} selected={form.fundingSources} onToggle={(c) => toggleMulti("fundingSources", c)} />
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={form.receivedCredit} onChange={(e) => setBool("receivedCredit", e.target.checked)} />
          {f.fields.receivedCredit}
        </label>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={form.contactSharingConsent} onChange={(e) => setBool("contactSharingConsent", e.target.checked)} />
          {f.fields.contactSharingConsent}
        </label>
      </fieldset>

      <div className="flex items-center gap-3">
        <button
          type="submit"
          disabled={!!exactMatch || submitting}
          className="rounded-md bg-emerald-700 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-800 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {submitting ? dict.common.states.saving : dict.common.actions.save}
        </button>
        {!isEdit ? (
          <button
            type="button"
            disabled={submitting}
            onClick={() => {
              if (!window.confirm(f.restartConfirm)) return;
              setForm(EMPTY);
              setErrors({});
              setMatches([]);
              setSubmitError(null);
              setSaved(false);
            }}
            className="rounded-md border border-black/15 px-4 py-2 text-sm font-medium disabled:opacity-50 dark:border-white/20"
          >
            {f.restart}
          </button>
        ) : null}
        {saved ? (
          <span role="status" className="text-sm text-emerald-700 dark:text-emerald-400">
            {isEdit ? f.updated : f.saved}
          </span>
        ) : null}
        {submitError ? (
          <span role="alert" className="text-sm text-red-600">
            {submitError}
          </span>
        ) : null}
      </div>
    </form>
  );
}

/** A labelled set of toggle "pills" for a select_multiple field. */
function MultiSelect({
  label,
  codes,
  labels,
  selected,
  onToggle,
}: {
  label: string;
  codes: readonly string[];
  labels: Record<string, string>;
  selected: string[];
  onToggle: (code: string) => void;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <span className="text-sm font-medium">{label}</span>
      <div className="flex flex-wrap gap-2">
        {codes.map((code) => {
          const on = selected.includes(code);
          return (
            <button
              key={code}
              type="button"
              aria-pressed={on}
              onClick={() => onToggle(code)}
              className={
                "rounded-full border px-3 py-1 text-sm transition-colors " +
                (on
                  ? "border-emerald-600 bg-emerald-600 text-white"
                  : "border-black/15 text-zinc-700 hover:bg-black/5 dark:border-white/20 dark:text-zinc-300 dark:hover:bg-white/10")
              }
            >
              {labels[code] ?? code}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function DuplicateNotice({
  checking,
  exactMatch,
  similar,
  districtName,
  name,
}: {
  checking: boolean;
  exactMatch?: DuplicateMatch;
  similar: DuplicateMatch[];
  districtName: (code: string) => string;
  name: string;
}) {
  const dict = useDictionary();
  const d = dict.duplicates;

  if (checking) {
    return <p className="text-sm text-zinc-500">{d.checking}</p>;
  }

  if (exactMatch) {
    return (
      <p
        role="alert"
        className="rounded-md border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-800 dark:border-red-900 dark:bg-red-950 dark:text-red-200"
      >
        {format(d.exact, {
          name: exactMatch.name || name,
          district: districtName(exactMatch.districtCode),
        })}
      </p>
    );
  }

  if (similar.length > 0) {
    return (
      <div className="rounded-md border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-900 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-200">
        <p>{format(d.found, { count: similar.length })}</p>
        <ul className="mt-1 list-disc pl-5">
          {similar.map((m) => (
            <li key={m.id}>
              {m.name} — {districtName(m.districtCode)}
            </li>
          ))}
        </ul>
      </div>
    );
  }

  return null;
}
