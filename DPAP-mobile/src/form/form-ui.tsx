// VENDORED COPY of the shared schema-driven renderer. Canonical location is
// DPAP-mobile/src/form (edited here, then copied to DPAP-web/src/form). Keep in
// sync across the two apps.
"use client";

import { useRef, useState, type ReactNode } from "react";
import {
  optionsFor,
  codeList,
  type Field,
  type Module,
  type Option,
  type Roster,
  type Column,
} from "./schema-model";
import type { ExprValue } from "./expr";
import { useForm, type Answers, type RosterRow } from "./use-form";

/** Chrome strings supplied by each app's i18n (no hard-coded UI text here). */
export interface FormLabels {
  moduleWord: string; // "Módulo"
  previous: string;
  next: string;
  submit: string;
  review: string;
  addRow: string;
  removeRow: string;
  captureGps: string;
  capturing: string;
  accuracy: string; // "Precisão"
  gpsLowAccuracy: string; // warning when accuracy > threshold
  gpsReason: string; // "Motivo da baixa precisão"
  gpsManual: string; // "Ou insira as coordenadas manualmente"
  gpsLat: string; // "Latitude"
  gpsLon: string; // "Longitude"
  takePhoto: string;
  replacePhoto: string;
  removePhoto: string;
  choose: string; // select placeholder
  otherSpecify: string; // "Especificar"
  errorsTitle: string;
}

const GPS_ACCURACY_THRESHOLD_M = 10;
const PHOTO_MAX_BYTES = 2 * 1024 * 1024;

function specialLabel(code: number): string {
  return codeList("special")?.find((s) => s.code === code)?.label_pt ?? String(code);
}

/** A labelled wrapper for one field. */
function FieldShell({
  field,
  children,
}: {
  field: Field;
  children: ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <label className="block text-sm font-medium">
        <span className="text-zinc-400">{field.id} </span>
        {field.label_pt}
        {field.required === "Y" || field.required === "C" ? (
          <span className="text-red-600"> *</span>
        ) : null}
        {field.unit ? <span className="text-zinc-400"> ({field.unit})</span> : null}
      </label>
      {children}
    </div>
  );
}

const inputClass =
  "w-full min-h-11 rounded-lg border border-black/15 bg-white px-3 py-2 text-base outline-none " +
  "focus:border-emerald-600 dark:border-white/20 dark:bg-zinc-900";

// ---------------------------------------------------------------------------
// Scalar fields
// ---------------------------------------------------------------------------

function TextField({ value, onChange, type }: {
  value: ExprValue; onChange: (v: ExprValue) => void; type: string;
}) {
  const html = type === "integer" || type === "decimal" || type === "number"
    ? "number" : type === "email" ? "email" : type === "phone" ? "tel"
    : type === "date" ? "date" : type === "time" ? "time" : "text";
  return (
    <input
      className={inputClass}
      type={html}
      inputMode={html === "number" ? "decimal" : undefined}
      value={value == null ? "" : String(value)}
      onChange={(e) => {
        const raw = e.target.value;
        onChange(raw === "" ? "" : html === "number" ? Number(raw) : raw);
      }}
    />
  );
}

function SelectOne({ field, value, onChange, labels }: {
  field: Field; value: ExprValue; onChange: (v: ExprValue) => void; labels: FormLabels;
}) {
  const options = optionsFor(field);
  const useRadios = options.length <= 6 && !field.list;
  if (useRadios) {
    return (
      <div className="space-y-1.5">
        {options.map((o: Option) => (
          <label key={o.code} className="flex min-h-11 items-center gap-2 rounded-lg border border-black/10 px-3 dark:border-white/10">
            <input
              type="radio"
              name={field.var}
              className="h-4 w-4"
              checked={Number(value) === o.code}
              onChange={() => onChange(o.code)}
            />
            <span className="text-sm">{o.label_pt}</span>
          </label>
        ))}
      </div>
    );
  }
  return (
    <select
      className={inputClass}
      value={value == null ? "" : String(value)}
      onChange={(e) => onChange(e.target.value === "" ? "" : Number(e.target.value))}
    >
      <option value="">{labels.choose}</option>
      {options.map((o) => (
        <option key={o.code} value={o.code}>{o.label_pt}</option>
      ))}
    </select>
  );
}

function SelectMultiple({ field, value, onToggle }: {
  field: Field; value: ExprValue; onToggle: (code: number) => void;
}) {
  const options = optionsFor(field);
  const selected = Array.isArray(value) ? (value as number[]) : [];
  return (
    <div className="space-y-1.5">
      {options.map((o) => (
        <label key={o.code} className="flex min-h-11 items-center gap-2 rounded-lg border border-black/10 px-3 dark:border-white/10">
          <input
            type="checkbox"
            className="h-4 w-4"
            checked={selected.includes(o.code)}
            onChange={() => onToggle(o.code)}
          />
          <span className="text-sm">{o.label_pt}</span>
        </label>
      ))}
    </div>
  );
}

function GeoPoint({ value, onChange, labels }: {
  value: ExprValue; onChange: (v: ExprValue) => void; labels: FormLabels;
}) {
  const [busy, setBusy] = useState(false);
  const point = (value && typeof value === "object" ? value : null) as
    | { lat?: number; lon?: number; accuracy?: number; altitude?: number; reason?: string }
    | null;

  const capture = () => {
    if (!("geolocation" in navigator)) return;
    setBusy(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        onChange({
          lat: Number(pos.coords.latitude.toFixed(6)),
          lon: Number(pos.coords.longitude.toFixed(6)),
          accuracy: pos.coords.accuracy != null ? Math.round(pos.coords.accuracy) : undefined,
          altitude: pos.coords.altitude ?? undefined,
        } as unknown as ExprValue);
        setBusy(false);
      },
      () => setBusy(false),
      { enableHighAccuracy: true, timeout: 20000 },
    );
  };

  const lowAccuracy = point?.accuracy != null && point.accuracy > GPS_ACCURACY_THRESHOLD_M;

  return (
    <div className="space-y-2">
      <button
        type="button"
        onClick={capture}
        disabled={busy}
        className="min-h-11 rounded-lg bg-emerald-700 px-4 text-sm font-medium text-white hover:bg-emerald-800 disabled:opacity-60"
      >
        {busy ? labels.capturing : labels.captureGps}
      </button>
      {point?.accuracy != null ? (
        <p className="text-sm tabular-nums text-zinc-600 dark:text-zinc-300">
          {labels.accuracy}: ±{point.accuracy} m
        </p>
      ) : null}
      {/* Manual entry — works when auto-capture is unavailable or denied. */}
      <div>
        <p className="mb-1 text-xs text-zinc-500">{labels.gpsManual}</p>
        <div className="grid grid-cols-2 gap-2">
          <input
            className={inputClass}
            type="number"
            inputMode="decimal"
            step="any"
            placeholder={labels.gpsLat}
            value={point?.lat ?? ""}
            onChange={(e) =>
              onChange({ ...point, lat: e.target.value === "" ? undefined : Number(e.target.value) } as unknown as ExprValue)
            }
          />
          <input
            className={inputClass}
            type="number"
            inputMode="decimal"
            step="any"
            placeholder={labels.gpsLon}
            value={point?.lon ?? ""}
            onChange={(e) =>
              onChange({ ...point, lon: e.target.value === "" ? undefined : Number(e.target.value) } as unknown as ExprValue)
            }
          />
        </div>
      </div>
      {lowAccuracy ? (
        <div className="space-y-1 rounded-lg border border-amber-500/40 bg-amber-50 p-2 dark:bg-amber-950/30">
          <p className="text-xs text-amber-700 dark:text-amber-300">{labels.gpsLowAccuracy}</p>
          <input
            className={inputClass}
            placeholder={labels.gpsReason}
            value={point?.reason ?? ""}
            onChange={(e) => onChange({ ...point, reason: e.target.value } as unknown as ExprValue)}
          />
        </div>
      ) : null}
    </div>
  );
}

function ImageField({ value, onChange, labels }: {
  value: ExprValue; onChange: (v: ExprValue) => void; labels: FormLabels;
}) {
  const ref = useRef<HTMLInputElement>(null);
  const src = typeof value === "string" ? value : "";

  const onPick = async (file: File | undefined) => {
    if (!file) return;
    const dataUrl = await compressImage(file, PHOTO_MAX_BYTES);
    onChange(dataUrl);
  };

  return (
    <div className="space-y-2">
      <input
        ref={ref}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={(e) => onPick(e.target.files?.[0])}
      />
      {src ? (
        <div
          role="img"
          aria-label=""
          className="h-40 rounded-lg border border-black/10 bg-cover bg-center"
          style={{ backgroundImage: `url(${src})` }}
        />
      ) : null}
      <div className="flex gap-2">
        <button type="button" onClick={() => ref.current?.click()}
          className="min-h-11 rounded-lg border border-black/15 px-4 text-sm font-medium dark:border-white/20">
          {src ? labels.replacePhoto : labels.takePhoto}
        </button>
        {src ? (
          <button type="button" onClick={() => onChange("")}
            className="min-h-11 rounded-lg px-3 text-sm text-red-600">
            {labels.removePhoto}
          </button>
        ) : null}
      </div>
    </div>
  );
}

/** Downscale/recompress a JPEG until it is under maxBytes. */
async function compressImage(file: File, maxBytes: number): Promise<string> {
  const bitmap = await createImageBitmap(file);
  let width = bitmap.width;
  let height = bitmap.height;
  const maxDim = 1600;
  if (Math.max(width, height) > maxDim) {
    const scale = maxDim / Math.max(width, height);
    width = Math.round(width * scale);
    height = Math.round(height * scale);
  }
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  canvas.getContext("2d")?.drawImage(bitmap, 0, 0, width, height);
  let quality = 0.8;
  let dataUrl = canvas.toDataURL("image/jpeg", quality);
  while (dataUrl.length * 0.75 > maxBytes && quality > 0.3) {
    quality -= 0.1;
    dataUrl = canvas.toDataURL("image/jpeg", quality);
  }
  return dataUrl;
}

// ---------------------------------------------------------------------------
// Rosters
// ---------------------------------------------------------------------------

function cellInput(col: Column, value: ExprValue, onChange: (v: ExprValue) => void, choose: string) {
  if (col.type === "select_one" || col.type === "yes_no") {
    const options = optionsFor(col);
    return (
      <select className={inputClass} value={value == null ? "" : String(value)}
        onChange={(e) => onChange(e.target.value === "" ? "" : Number(e.target.value))}>
        <option value="">{choose}</option>
        {options.map((o) => <option key={o.code} value={o.code}>{o.label_pt}</option>)}
      </select>
    );
  }
  const isNum = col.type === "number";
  return (
    <input className={inputClass} type={isNum ? "number" : "text"}
      value={value == null ? "" : String(value)}
      onChange={(e) => onChange(e.target.value === "" ? "" : isNum ? Number(e.target.value) : e.target.value)} />
  );
}

function evalCalc(calc: string, row: RosterRow): number {
  // Only "a + b" style sums appear in the schema; sum the referenced columns.
  return calc.split("+").reduce((sum, name) => sum + (Number(row[name.trim()]) || 0), 0);
}

function RosterView({ roster, rows, setRows, labels }: {
  roster: Roster; rows: RosterRow[]; setRows: (r: RosterRow[]) => void; labels: FormLabels;
}) {
  const dataCols = roster.columns.filter((c) => c.role !== "row_key");

  if (roster.kind === "fixed") {
    const fixedRows: RosterRow[] = (roster.rows ?? []).map((rk) => {
      const existing = rows.find((r) => Number(r.__row) === rk.code);
      return existing ?? { __row: rk.code };
    });
    const update = (rowCode: number, col: string, v: ExprValue) => {
      const next = fixedRows.map((r) =>
        Number(r.__row) === rowCode ? { ...r, [col]: v } : r);
      setRows(next);
    };
    return (
      <div className="space-y-3">
        {(roster.rows ?? []).map((rk) => {
          const row = fixedRows.find((r) => Number(r.__row) === rk.code) ?? { __row: rk.code };
          return (
            <div key={rk.code} className="rounded-lg border border-black/10 p-2 dark:border-white/10">
              <p className="mb-1.5 text-sm font-medium">{rk.label_pt}</p>
              <div className="grid grid-cols-2 gap-2">
                {dataCols.map((c) => (
                  <div key={c.col} className="space-y-0.5">
                    <span className="text-xs text-zinc-500">{c.label_pt}</span>
                    {c.calc
                      ? <div className={inputClass + " bg-black/5 dark:bg-white/5"}>{evalCalc(c.calc, row)}</div>
                      : cellInput(c, row[c.name], (v) => update(rk.code, c.name, v), labels.choose)}
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    );
  }

  // repeatable
  const addRow = () => setRows([...rows, {}]);
  const removeRow = (i: number) => setRows(rows.filter((_, idx) => idx !== i));
  const update = (i: number, col: string, v: ExprValue) =>
    setRows(rows.map((r, idx) => (idx === i ? { ...r, [col]: v } : r)));
  return (
    <div className="space-y-3">
      {rows.map((row, i) => (
        <div key={i} className="rounded-lg border border-black/10 p-2 dark:border-white/10">
          <div className="mb-1 flex justify-end">
            <button type="button" onClick={() => removeRow(i)} className="text-xs text-red-600">
              {labels.removeRow}
            </button>
          </div>
          <div className="grid grid-cols-2 gap-2">
            {roster.columns.map((c) => (
              <div key={c.col} className="space-y-0.5">
                <span className="text-xs text-zinc-500">{c.label_pt}</span>
                {cellInput(c, row[c.name], (v) => update(i, c.name, v), labels.choose)}
              </div>
            ))}
          </div>
        </div>
      ))}
      <button type="button" onClick={addRow}
        className="min-h-11 w-full rounded-lg border border-dashed border-emerald-600/50 text-sm font-medium text-emerald-700 dark:text-emerald-400">
        + {labels.addRow}
      </button>
    </div>
  );
}

// ---------------------------------------------------------------------------
// One field dispatcher
// ---------------------------------------------------------------------------

function FieldView({ field, form, labels, error }: {
  field: Field; form: ReturnType<typeof useForm>; labels: FormLabels; error?: string;
}) {
  const value = form.answers[field.var];
  const set = (v: ExprValue) => form.setAnswer(field.var, v);
  const special = field.required === "Y" || field.required === "C";

  let control: ReactNode;
  switch (field.type) {
    case "select_one":
      control = <SelectOne field={field} value={value} onChange={set} labels={labels} />;
      break;
    case "yes_no":
      control = <SelectOne field={field} value={value} onChange={set} labels={labels} />;
      break;
    case "select_multiple":
      control = <SelectMultiple field={field} value={value} onToggle={(c) => form.toggleMulti(field, c)} />;
      break;
    case "geopoint":
      control = <GeoPoint value={value} onChange={set} labels={labels} />;
      break;
    case "image":
      control = <ImageField value={value} onChange={set} labels={labels} />;
      break;
    default:
      control = <TextField value={value} onChange={set} type={field.type} />;
  }

  return (
    <FieldShell field={field}>
      {control}
      {/* Outro (96) → free-text */}
      {field.other_code !== undefined &&
      (Number(value) === field.other_code ||
        (Array.isArray(value) && (value as number[]).includes(field.other_code))) ? (
        <input
          className={inputClass}
          placeholder={labels.otherSpecify}
          value={(form.answers[`${field.var}_other`] as string) ?? ""}
          onChange={(e) => form.setAnswer(`${field.var}_other`, e.target.value)}
        />
      ) : null}
      {/* 98 / 99 quick actions for required scalar/select_one fields */}
      {special && field.type !== "select_multiple" && field.type !== "geopoint" && field.type !== "image" ? (
        <div className="flex gap-2">
          {[98, 99].map((c) => (
            <button key={c} type="button" onClick={() => set(c)}
              className={"rounded-full border px-2.5 py-1 text-xs " +
                (Number(value) === c
                  ? "border-zinc-700 bg-zinc-700 text-white"
                  : "border-black/15 text-zinc-500 dark:border-white/20")}>
              {specialLabel(c)}
            </button>
          ))}
        </div>
      ) : null}
      {error ? <p role="alert" className="text-sm text-red-600">{error}</p> : null}
    </FieldShell>
  );
}

// ---------------------------------------------------------------------------
// The questionnaire (module-by-module)
// ---------------------------------------------------------------------------

export function Questionnaire({
  form,
  labels,
  step,
  onStepChange,
  onSubmit,
  footer,
}: {
  form: ReturnType<typeof useForm>;
  labels: FormLabels;
  step: number;
  onStepChange: (step: number) => void;
  onSubmit?: () => void;
  footer?: ReactNode;
}) {
  const [attemptedSteps, setAttemptedSteps] = useState<Set<number>>(() => new Set());

  const mods = form.visibleModules;
  const total = mods.length;
  const current: Module | undefined = mods[Math.min(step, total - 1)];
  if (!current) return null;

  const fields = current.fields.filter(form.isFieldRelevant);
  const atEnd = step >= total - 1;

  // Validation scoped to this tab (module): the errors whose field belongs to
  // the current module. `form.errors` already excludes irrelevant fields.
  const moduleVars = new Set(current.fields.map((f) => f.var));
  const errorsByVar = new Map(
    form.errors.filter((e) => moduleVars.has(e.var)).map((e) => [e.var, e.message_pt]),
  );
  const showErrors = attemptedSteps.has(step);

  // "Seguinte": validate the current module first; only advance when it is clean.
  const goNext = () => {
    if (errorsByVar.size > 0) {
      setAttemptedSteps((prev) => new Set(prev).add(step));
      return;
    }
    onStepChange(step + 1);
  };

  return (
    <div className="space-y-4">
      <div>
        <div className="flex items-center justify-between text-xs text-zinc-500">
          <span>{labels.moduleWord} {step + 1} / {total}</span>
          <span>{current.title_pt}</span>
        </div>
        <div className="mt-1 h-1.5 w-full overflow-hidden rounded bg-black/10 dark:bg-white/10">
          <div className="h-full bg-emerald-600" style={{ width: `${((step + 1) / total) * 100}%` }} />
        </div>
      </div>

      <h2 className="text-base font-semibold text-emerald-700 dark:text-emerald-400">{current.title_pt}</h2>

      {showErrors && errorsByVar.size > 0 ? (
        <p role="alert" className="rounded-lg border border-red-500/40 bg-red-50 px-3 py-2 text-sm font-medium text-red-700 dark:bg-red-950/30 dark:text-red-300">
          {labels.errorsTitle}
        </p>
      ) : null}

      <div className="space-y-5">
        {fields.map((f) => (
          <FieldView
            key={f.var}
            field={f}
            form={form}
            labels={labels}
            error={showErrors ? errorsByVar.get(f.var) : undefined}
          />
        ))}
        {current.rosters.map((r) => (
          <div key={r.id} className="space-y-1.5">
            <p className="text-sm font-medium">
              <span className="text-zinc-400">{r.id} </span>{r.label_pt}
            </p>
            <RosterView
              roster={r}
              rows={form.rosterRows(r.var ?? r.id)}
              setRows={(rows) => form.setRosterRows(r.var ?? r.id, rows)}
              labels={labels}
            />
          </div>
        ))}
      </div>

      <div className="flex items-center justify-between gap-2 pt-2">
        <button
          type="button"
          disabled={step === 0}
          onClick={() => onStepChange(step - 1)}
          className="min-h-11 rounded-lg border border-black/15 px-4 text-sm font-medium disabled:opacity-40 dark:border-white/20"
        >
          {labels.previous}
        </button>
        {atEnd ? (
          onSubmit ? (
            <button type="button" onClick={onSubmit}
              className="min-h-11 rounded-lg bg-emerald-700 px-5 text-sm font-medium text-white hover:bg-emerald-800">
              {labels.submit}
            </button>
          ) : null
        ) : (
          <button type="button" onClick={goNext}
            className="min-h-11 rounded-lg bg-emerald-700 px-5 text-sm font-medium text-white hover:bg-emerald-800">
            {labels.next}
          </button>
        )}
      </div>
      {footer}
    </div>
  );
}

export type { Answers };
