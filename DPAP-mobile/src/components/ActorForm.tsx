import { useEffect, useRef, useState } from "react";
import { dict, format } from "@/i18n";
import { appConfig } from "@/config/app";
import { Field, controlClass } from "@/components/Field";
import {
  ACTOR_TYPE_CODES,
  SECTOR_CODES,
  LEGAL_STATUS_CODES,
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
  type SectorCode,
  type LegalStatusCode,
} from "@/domain/enums";
import { DISTRICTS, getPosts } from "@/domain/location";
import { capturePosition, GpsError, type GpsFix } from "@/lib/gps";
import { validateActorDraft, type ActorDraft, type ActorErrors } from "@/lib/validate-actor";
import {
  saveNewActor,
  updateLocalActor,
  deleteLocalActor,
  getLocalActor,
  findLocalDuplicates,
} from "@/db/actors-repo";
import { formatTime } from "@/lib/format-date";
import type { ActorWriteModel } from "@/api/types";
import type { DuplicateMatch } from "@/lib/duplicate";

const EMPTY: ActorDraft = {
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

function toWriteModel(d: ActorDraft): ActorWriteModel {
  const opt = (s: string) => (s.trim() ? s.trim() : undefined);
  const multi = (a: string[]) => (a.length ? a : undefined);
  return {
    name: d.name.trim(),
    registrationNumber: opt(d.registrationNumber),
    actorType: d.actorType as ActorTypeCode,
    legalStatus: d.legalStatus as LegalStatusCode,
    sector: d.sector as SectorCode,
    districtCode: d.districtCode,
    administrativePostCode: d.administrativePostCode,
    localityCode: opt(d.localityCode),
    latitude: Number(d.latitude),
    longitude: Number(d.longitude),
    responsiblePerson: opt(d.responsiblePerson),
    phone: opt(d.phone),
    email: opt(d.email),
    address: opt(d.address),
    description: opt(d.description),
    observations: opt(d.observations),
    startDate: opt(d.startDate),
    fundingType: (opt(d.fundingType) as ActorWriteModel["fundingType"]) ?? undefined,
    imageUrl: opt(d.imageUrl),
    acronym: opt(d.acronym),
    respondentSex: opt(d.respondentSex),
    respondentAge: d.respondentAge.trim() ? Number(d.respondentAge) : undefined,
    respondentEducation: opt(d.respondentEducation),
    phoneAlt: opt(d.phoneAlt),
    website: opt(d.website),
    subsectors: multi(d.subsectors),
    valueChainLinks: multi(d.valueChainLinks),
    operationLevel: opt(d.operationLevel),
    districtsOfOperation: multi(d.districtsOfOperation),
    legalFormality: opt(d.legalFormality),
    registrationDocs: multi(d.registrationDocs),
    nuit: opt(d.nuit),
    consent: d.consent,
    contactSharingConsent: d.contactSharingConsent,
    fundingSources: multi(d.fundingSources),
    receivedCredit: d.receivedCredit,
  };
}

export function ActorForm({
  localId,
  onDone,
}: {
  localId?: string;
  onDone: () => void;
}) {
  const t = dict.actors.form;
  const isEdit = Boolean(localId);

  const [draft, setDraft] = useState<ActorDraft>(EMPTY);
  const [errors, setErrors] = useState<ActorErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  // Conflict review: populated in edit mode when the loaded record failed sync.
  const [conflict, setConflict] = useState<{ isConflict: boolean; detail?: string } | null>(null);

  // GPS
  const [gps, setGps] = useState<GpsFix | null>(null);
  const [gpsBusy, setGpsBusy] = useState(false);
  const [gpsError, setGpsError] = useState<string | null>(null);

  // Duplicates
  const [dupes, setDupes] = useState<DuplicateMatch[]>([]);
  const [checkingDupes, setCheckingDupes] = useState(false);
  const [overrideExact, setOverrideExact] = useState(false);

  const loadedRef = useRef(false);

  // Load the existing record once in edit mode.
  useEffect(() => {
    if (!localId || loadedRef.current) return;
    loadedRef.current = true;
    void getLocalActor(localId).then((a) => {
      if (!a) return;
      setDraft({
        name: a.name,
        registrationNumber: a.registrationNumber ?? "",
        actorType: a.actorType,
        legalStatus: a.legalStatus,
        sector: a.sector,
        districtCode: a.districtCode,
        administrativePostCode: a.administrativePostCode,
        localityCode: a.localityCode ?? "",
        latitude: String(a.latitude),
        longitude: String(a.longitude),
        responsiblePerson: a.responsiblePerson ?? "",
        phone: a.phone ?? "",
        email: a.email ?? "",
        address: a.address ?? "",
        description: a.description ?? "",
        observations: a.observations ?? "",
        startDate: a.startDate ?? "",
        fundingType: a.fundingType ?? "",
        imageUrl: a.imageUrl ?? "",
        acronym: a.acronym ?? "",
        respondentSex: a.respondentSex ?? "",
        respondentAge: a.respondentAge != null ? String(a.respondentAge) : "",
        respondentEducation: a.respondentEducation ?? "",
        phoneAlt: a.phoneAlt ?? "",
        website: a.website ?? "",
        subsectors: a.subsectors ?? [],
        valueChainLinks: a.valueChainLinks ?? [],
        operationLevel: a.operationLevel ?? "",
        districtsOfOperation: a.districtsOfOperation ?? [],
        legalFormality: a.legalFormality ?? "",
        registrationDocs: a.registrationDocs ?? [],
        nuit: a.nuit ?? "",
        consent: a.consent ?? false,
        contactSharingConsent: a.contactSharingConsent ?? false,
        fundingSources: a.fundingSources ?? [],
        receivedCredit: a.receivedCredit ?? false,
      });
      if (a.gpsCapturedAt) {
        setGps({
          latitude: a.latitude,
          longitude: a.longitude,
          accuracy: a.gpsAccuracy ?? 0,
          capturedAt: a.gpsCapturedAt,
        });
      }
      // Flag a record that needs conflict review (failed/duplicate sync).
      if (a.syncStatus === "CONFLICT" || a.syncError) {
        setConflict({ isConflict: a.syncStatus === "CONFLICT", detail: a.syncError });
      }
    });
  }, [localId]);

  const set = (key: keyof ActorDraft, value: string) => {
    setDraft((d) => {
      const next = { ...d, [key]: value };
      // Reset the admin post when the district changes.
      if (key === "districtCode") next.administrativePostCode = "";
      return next;
    });
    setOverrideExact(false);
  };

  type MultiKey =
    | "subsectors"
    | "valueChainLinks"
    | "districtsOfOperation"
    | "registrationDocs"
    | "fundingSources";
  const toggleMulti = (key: MultiKey, code: string) => {
    setDraft((d) => {
      const cur = d[key];
      const next = cur.includes(code) ? cur.filter((c) => c !== code) : [...cur, code];
      return { ...d, [key]: next };
    });
  };

  type BoolKey = "consent" | "contactSharingConsent" | "receivedCredit";
  const setBool = (key: BoolKey, value: boolean) => {
    setDraft((d) => ({ ...d, [key]: value }));
  };

  // Debounced on-device duplicate check.
  useEffect(() => {
    if (draft.name.trim().length < 2 || !draft.districtCode || !draft.actorType) {
      setDupes([]);
      return;
    }
    setCheckingDupes(true);
    const handle = setTimeout(async () => {
      const matches = await findLocalDuplicates(
        {
          name: draft.name,
          districtCode: draft.districtCode,
          actorType: draft.actorType,
          registrationNumber: draft.registrationNumber || undefined,
        },
        localId,
      );
      setDupes(matches);
      setCheckingDupes(false);
    }, appConfig.duplicateCheckDebounceMs);
    return () => clearTimeout(handle);
  }, [draft.name, draft.districtCode, draft.actorType, draft.registrationNumber, localId]);

  const exactMatch = dupes.find((m) => m.exact);

  const captureGps = async () => {
    setGpsBusy(true);
    setGpsError(null);
    try {
      const fix = await capturePosition();
      setGps(fix);
      setDraft((d) => ({
        ...d,
        latitude: fix.latitude.toFixed(6),
        longitude: fix.longitude.toFixed(6),
      }));
    } catch (err) {
      const g = dict.actors.gps;
      if (err instanceof GpsError) {
        setGpsError(
          err.code === "DENIED" ? g.denied : err.code === "UNSUPPORTED" ? g.unavailable : g.error,
        );
      } else {
        setGpsError(g.error);
      }
    } finally {
      setGpsBusy(false);
    }
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (saving) return;
    const found = validateActorDraft(draft);
    setErrors(found);
    if (Object.keys(found).length > 0) {
      setFormError(dict.validation.fixErrors);
      return;
    }
    if (exactMatch && !overrideExact) {
      setFormError(null);
      return; // exact-duplicate block is shown inline with an override
    }
    setFormError(null);
    setSaving(true);
    try {
      const model = toWriteModel(draft);
      if (isEdit && localId) await updateLocalActor(localId, model, gps ?? undefined);
      else await saveNewActor(model, gps ?? undefined);
      onDone();
    } catch {
      setFormError(dict.errors.generic);
      setSaving(false);
    }
  };

  const remove = async () => {
    if (!localId) return;
    await deleteLocalActor(localId);
    onDone();
  };

  const posts = getPosts(draft.districtCode);
  const g = dict.actors.gps;

  return (
    <form onSubmit={submit} className="space-y-6">
      <h2 className="text-lg font-semibold">{isEdit ? t.editTitle : t.createTitle}</h2>

      {conflict ? (
        <div className="rounded-lg border border-red-300 bg-red-50 p-3 text-sm text-red-800 dark:border-red-900 dark:bg-red-950/40 dark:text-red-300">
          <p className="font-semibold">{dict.actors.conflict.title}</p>
          <p className="mt-1">
            {conflict.isConflict
              ? dict.actors.conflict.duplicate
              : dict.actors.conflict.generic}
          </p>
          {conflict.detail ? (
            <p className="mt-1 text-xs opacity-80">
              {format(dict.actors.conflict.detail, { detail: conflict.detail })}
            </p>
          ) : null}
        </div>
      ) : null}

      {/* Identification */}
      <fieldset className="space-y-3">
        <legend className="mb-1 text-sm font-semibold text-emerald-700 dark:text-emerald-400">
          {t.sections.identification}
        </legend>
        <Field id="name" label={t.fields.name} required error={errors.name}>
          <input id="name" className={controlClass} value={draft.name} onChange={(e) => set("name", e.target.value)} />
        </Field>
        <Field id="regno" label={t.fields.registrationNumber}>
          <input id="regno" className={controlClass} value={draft.registrationNumber} onChange={(e) => set("registrationNumber", e.target.value)} />
        </Field>
        <Field id="atype" label={t.fields.actorType} required error={errors.actorType}>
          <select id="atype" className={controlClass} value={draft.actorType} onChange={(e) => set("actorType", e.target.value)}>
            <option value="">{t.select}</option>
            {ACTOR_TYPE_CODES.map((c) => (
              <option key={c} value={c}>{dict.domain.actorType[c]}</option>
            ))}
          </select>
        </Field>
        <Field id="legal" label={t.fields.legalStatus} required error={errors.legalStatus}>
          <select id="legal" className={controlClass} value={draft.legalStatus} onChange={(e) => set("legalStatus", e.target.value)}>
            <option value="">{t.select}</option>
            {LEGAL_STATUS_CODES.map((c) => (
              <option key={c} value={c}>{dict.domain.legalStatus[c]}</option>
            ))}
          </select>
        </Field>
        <Field id="sector" label={t.fields.sector} required error={errors.sector}>
          <select id="sector" className={controlClass} value={draft.sector} onChange={(e) => set("sector", e.target.value)}>
            <option value="">{t.select}</option>
            {SECTOR_CODES.map((c) => (
              <option key={c} value={c}>{dict.domain.sector[c]}</option>
            ))}
          </select>
        </Field>
      </fieldset>

      {/* Duplicate warnings */}
      {checkingDupes ? (
        <p className="text-xs text-zinc-500">{dict.duplicates.checking}</p>
      ) : exactMatch ? (
        <div className="rounded-lg bg-red-50 p-3 text-sm text-red-800 dark:bg-red-950/40 dark:text-red-300">
          <p>{format(dict.duplicates.exact, { name: exactMatch.name, district: draft.districtCode })}</p>
          <label className="mt-2 flex items-center gap-2 text-xs">
            <input type="checkbox" checked={overrideExact} onChange={(e) => setOverrideExact(e.target.checked)} />
            {dict.duplicates.saveAnyway}
          </label>
        </div>
      ) : dupes.length > 0 ? (
        <p className="rounded-lg bg-amber-50 p-3 text-sm text-amber-800 dark:bg-amber-950/40 dark:text-amber-300">
          {format(dict.duplicates.found, { count: dupes.length })}
        </p>
      ) : null}

      {/* Location */}
      <fieldset className="space-y-3">
        <legend className="mb-1 text-sm font-semibold text-emerald-700 dark:text-emerald-400">
          {t.sections.location}
        </legend>
        <Field id="district" label={t.fields.district} required error={errors.districtCode}>
          <select id="district" className={controlClass} value={draft.districtCode} onChange={(e) => set("districtCode", e.target.value)}>
            <option value="">{t.select}</option>
            {DISTRICTS.map((d) => (
              <option key={d.code} value={d.code}>{d.name}</option>
            ))}
          </select>
        </Field>
        <Field id="post" label={t.fields.administrativePost} required error={errors.administrativePostCode}>
          <select id="post" className={controlClass} value={draft.administrativePostCode} disabled={!draft.districtCode} onChange={(e) => set("administrativePostCode", e.target.value)}>
            <option value="">{t.select}</option>
            {posts.map((p) => (
              <option key={p.code} value={p.code}>{p.name}</option>
            ))}
          </select>
        </Field>
      </fieldset>

      {/* GPS */}
      <fieldset className="space-y-3">
        <legend className="mb-1 text-sm font-semibold text-emerald-700 dark:text-emerald-400">
          {t.sections.gps}
        </legend>
        <button
          type="button"
          onClick={() => void captureGps()}
          disabled={gpsBusy}
          className="w-full rounded-lg border border-emerald-700 px-4 py-2.5 text-base font-medium text-emerald-700 hover:bg-emerald-50 disabled:opacity-50 dark:text-emerald-400 dark:hover:bg-emerald-950/40"
        >
          {gpsBusy ? g.capturing : g.capture}
        </button>
        {gps ? (
          <p className="text-xs text-zinc-500 dark:text-zinc-400">
            {format(g.accuracy, { accuracy: gps.accuracy })} · {format(g.capturedAt, { at: formatTime(gps.capturedAt) })}
          </p>
        ) : (
          <p className="text-xs text-zinc-400">{g.manualHint}</p>
        )}
        {gpsError ? <p role="alert" className="text-xs text-red-600">{gpsError}</p> : null}
        <div className="grid grid-cols-2 gap-3">
          <Field id="lat" label={t.fields.latitude} required error={errors.latitude}>
            <input id="lat" inputMode="decimal" className={controlClass} value={draft.latitude} onChange={(e) => set("latitude", e.target.value)} />
          </Field>
          <Field id="lon" label={t.fields.longitude} required error={errors.longitude}>
            <input id="lon" inputMode="decimal" className={controlClass} value={draft.longitude} onChange={(e) => set("longitude", e.target.value)} />
          </Field>
        </div>
      </fieldset>

      {/* Contacts */}
      <fieldset className="space-y-3">
        <legend className="mb-1 text-sm font-semibold text-emerald-700 dark:text-emerald-400">
          {t.sections.contacts}
        </legend>
        <Field id="resp" label={t.fields.responsiblePerson}>
          <input id="resp" className={controlClass} value={draft.responsiblePerson} onChange={(e) => set("responsiblePerson", e.target.value)} />
        </Field>
        <Field id="phone" label={t.fields.phone} error={errors.phone}>
          <input id="phone" inputMode="tel" className={controlClass} value={draft.phone} onChange={(e) => set("phone", e.target.value)} />
        </Field>
        <Field id="email" label={t.fields.email} error={errors.email}>
          <input id="email" type="email" inputMode="email" className={controlClass} value={draft.email} onChange={(e) => set("email", e.target.value)} />
        </Field>
        <Field id="address" label={t.fields.address}>
          <input id="address" className={controlClass} value={draft.address} onChange={(e) => set("address", e.target.value)} />
        </Field>
      </fieldset>

      {/* Activity detail */}
      <fieldset className="space-y-3">
        <legend className="mb-1 text-sm font-semibold text-emerald-700 dark:text-emerald-400">
          {t.sections.activity}
        </legend>
        <Field id="description" label={t.fields.description} hint={t.activityHint}>
          <textarea id="description" rows={4} className={controlClass} value={draft.description} onChange={(e) => set("description", e.target.value)} />
        </Field>
        <Field id="observations" label={t.fields.observations}>
          <textarea id="observations" rows={3} className={controlClass} value={draft.observations} onChange={(e) => set("observations", e.target.value)} />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field id="startDate" label={t.fields.startDate} error={errors.startDate}>
            <input id="startDate" type="date" className={controlClass} value={draft.startDate} onChange={(e) => set("startDate", e.target.value)} />
          </Field>
          <Field id="fundingType" label={t.fields.fundingType} error={errors.fundingType}>
            <select id="fundingType" className={controlClass} value={draft.fundingType} onChange={(e) => set("fundingType", e.target.value)}>
              <option value="">{t.select}</option>
              {FUNDING_TYPE_CODES.map((c) => (
                <option key={c} value={c}>{dict.domain.fundingType[c]}</option>
              ))}
            </select>
          </Field>
        </div>
        <Field id="imageUrl" label={t.fields.imageUrl} error={errors.imageUrl}>
          <input id="imageUrl" type="url" inputMode="url" placeholder="https://…" className={controlClass} value={draft.imageUrl} onChange={(e) => set("imageUrl", e.target.value)} />
        </Field>
        {/^https?:\/\//.test(draft.imageUrl) ? (
          <img src={draft.imageUrl} alt="" className="max-h-40 rounded-md border border-black/10 object-cover dark:border-white/15" />
        ) : null}
      </fieldset>

      {/* Respondent profile */}
      <fieldset className="space-y-3">
        <legend className="mb-1 text-sm font-semibold text-emerald-700 dark:text-emerald-400">
          {t.sections.profile}
        </legend>
        <Field id="acronym" label={t.fields.acronym}>
          <input id="acronym" className={controlClass} value={draft.acronym} onChange={(e) => set("acronym", e.target.value)} />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field id="rsex" label={t.fields.respondentSex}>
            <select id="rsex" className={controlClass} value={draft.respondentSex} onChange={(e) => set("respondentSex", e.target.value)}>
              <option value="">{t.select}</option>
              {RESPONDENT_SEX_CODES.map((c) => (<option key={c} value={c}>{dict.domain.respondentSex[c as keyof typeof dict.domain.respondentSex]}</option>))}
            </select>
          </Field>
          <Field id="rage" label={t.fields.respondentAge} error={errors.respondentAge}>
            <input id="rage" type="number" inputMode="numeric" className={controlClass} value={draft.respondentAge} onChange={(e) => set("respondentAge", e.target.value)} />
          </Field>
        </div>
        <Field id="redu" label={t.fields.respondentEducation}>
          <select id="redu" className={controlClass} value={draft.respondentEducation} onChange={(e) => set("respondentEducation", e.target.value)}>
            <option value="">{t.select}</option>
            {EDUCATION_CODES.map((c) => (<option key={c} value={c}>{dict.domain.education[c as keyof typeof dict.domain.education]}</option>))}
          </select>
        </Field>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={draft.consent} onChange={(e) => setBool("consent", e.target.checked)} />
          {t.fields.consent}
        </label>
      </fieldset>

      {/* Scope */}
      <fieldset className="space-y-3">
        <legend className="mb-1 text-sm font-semibold text-emerald-700 dark:text-emerald-400">
          {t.sections.scope}
        </legend>
        <MultiSelect label={t.fields.subsectors} codes={SUBSECTOR_CODES} labels={dict.domain.subsector} selected={draft.subsectors} onToggle={(c) => toggleMulti("subsectors", c)} />
        <MultiSelect label={t.fields.valueChainLinks} codes={VALUE_CHAIN_LINK_CODES} labels={dict.domain.valueChainLink} selected={draft.valueChainLinks} onToggle={(c) => toggleMulti("valueChainLinks", c)} />
        <Field id="oplevel" label={t.fields.operationLevel}>
          <select id="oplevel" className={controlClass} value={draft.operationLevel} onChange={(e) => set("operationLevel", e.target.value)}>
            <option value="">{t.select}</option>
            {OPERATION_LEVEL_CODES.map((c) => (<option key={c} value={c}>{dict.domain.operationLevel[c as keyof typeof dict.domain.operationLevel]}</option>))}
          </select>
        </Field>
        <MultiSelect label={t.fields.districtsOfOperation} codes={DISTRICTS.map((d) => d.code)} labels={Object.fromEntries(DISTRICTS.map((d) => [d.code, d.name]))} selected={draft.districtsOfOperation} onToggle={(c) => toggleMulti("districtsOfOperation", c)} />
      </fieldset>

      {/* Legal */}
      <fieldset className="space-y-3">
        <legend className="mb-1 text-sm font-semibold text-emerald-700 dark:text-emerald-400">
          {t.sections.legal}
        </legend>
        <Field id="legalf" label={t.fields.legalFormality}>
          <select id="legalf" className={controlClass} value={draft.legalFormality} onChange={(e) => set("legalFormality", e.target.value)}>
            <option value="">{t.select}</option>
            {LEGAL_FORMALITY_CODES.map((c) => (<option key={c} value={c}>{dict.domain.legalFormality[c as keyof typeof dict.domain.legalFormality]}</option>))}
          </select>
        </Field>
        <MultiSelect label={t.fields.registrationDocs} codes={REGISTRATION_DOC_CODES} labels={dict.domain.registrationDoc} selected={draft.registrationDocs} onToggle={(c) => toggleMulti("registrationDocs", c)} />
        <Field id="nuit" label={t.fields.nuit} error={errors.nuit}>
          <input id="nuit" inputMode="numeric" className={controlClass} value={draft.nuit} onChange={(e) => set("nuit", e.target.value)} />
        </Field>
      </fieldset>

      {/* Financing */}
      <fieldset className="space-y-3">
        <legend className="mb-1 text-sm font-semibold text-emerald-700 dark:text-emerald-400">
          {t.sections.financing}
        </legend>
        <MultiSelect label={t.fields.fundingSources} codes={FUNDING_SOURCE_CODES} labels={dict.domain.fundingSource} selected={draft.fundingSources} onToggle={(c) => toggleMulti("fundingSources", c)} />
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={draft.receivedCredit} onChange={(e) => setBool("receivedCredit", e.target.checked)} />
          {t.fields.receivedCredit}
        </label>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={draft.contactSharingConsent} onChange={(e) => setBool("contactSharingConsent", e.target.checked)} />
          {t.fields.contactSharingConsent}
        </label>
      </fieldset>

      {/* Alt phone + website */}
      <fieldset className="space-y-3">
        <legend className="mb-1 text-sm font-semibold text-emerald-700 dark:text-emerald-400">
          {t.sections.contacts}
        </legend>
        <Field id="phoneAlt" label={t.fields.phoneAlt}>
          <input id="phoneAlt" inputMode="tel" className={controlClass} value={draft.phoneAlt} onChange={(e) => set("phoneAlt", e.target.value)} />
        </Field>
        <Field id="website" label={t.fields.website}>
          <input id="website" className={controlClass} value={draft.website} onChange={(e) => set("website", e.target.value)} />
        </Field>
      </fieldset>

      {formError ? <p role="alert" className="text-sm text-red-600">{formError}</p> : null}

      <div className="flex flex-wrap items-center gap-3">
        <button type="submit" disabled={saving} className="rounded-lg bg-emerald-700 px-5 py-2.5 text-base font-medium text-white hover:bg-emerald-800 disabled:opacity-50">
          {saving ? dict.common.states.saving : dict.common.actions.save}
        </button>
        <button type="button" onClick={onDone} className="rounded-lg border border-black/15 px-5 py-2.5 text-base font-medium hover:bg-black/5 dark:border-white/20 dark:hover:bg-white/10">
          {dict.common.actions.cancel}
        </button>
        {!isEdit ? (
          <button
            type="button"
            disabled={saving}
            onClick={() => {
              if (!window.confirm(dict.actors.restartConfirm)) return;
              setDraft(EMPTY);
              setErrors({});
              setFormError(null);
              setConflict(null);
              setDupes([]);
              setOverrideExact(false);
              setGps(null);
              setGpsError(null);
            }}
            className="rounded-lg border border-black/15 px-5 py-2.5 text-base font-medium disabled:opacity-50 dark:border-white/20"
          >
            {dict.actors.restart}
          </button>
        ) : null}
        {isEdit ? (
          confirmDelete ? (
            <span className="ml-auto flex items-center gap-2">
              <span className="text-sm text-red-700">{t.deleteConfirm}</span>
              <button type="button" onClick={() => void remove()} className="rounded-lg bg-red-700 px-3 py-2 text-sm font-medium text-white hover:bg-red-800">
                {dict.common.actions.confirm}
              </button>
              <button type="button" onClick={() => setConfirmDelete(false)} className="rounded-lg px-3 py-2 text-sm font-medium hover:bg-black/5 dark:hover:bg-white/10">
                {dict.common.actions.cancel}
              </button>
            </span>
          ) : (
            <button type="button" onClick={() => setConfirmDelete(true)} className="ml-auto rounded-lg px-3 py-2 text-sm font-medium text-red-700 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950/40">
              {dict.common.actions.delete}
            </button>
          )
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
                "rounded-full border px-3 py-1.5 text-sm " +
                (on
                  ? "border-emerald-600 bg-emerald-600 text-white"
                  : "border-black/15 text-zinc-700 dark:border-white/20 dark:text-zinc-300")
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
