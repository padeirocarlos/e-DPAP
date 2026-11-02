// VENDORED COPY of /schema/src — canonical source of truth. Keep in sync (do not edit here).
/**
 * Typed accessors over form_schema.json (BRD Section 7). Every later phase —
 * DB migration generator, the form renderer (web + mobile), server-side
 * re-validation, exports and the data-dictionary — consumes the questionnaire
 * through this module, never by re-reading the BRD or hard-coding questions.
 */

import schemaJson from "./form_schema.json";
import { isRelevant, satisfiesConstraint, type EvalContext, type ExprValue } from "./expr";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type FieldType =
  | "text"
  | "integer"
  | "decimal"
  | "number"
  | "select_one"
  | "select_multiple"
  | "yes_no"
  | "date"
  | "time"
  | "geopoint"
  | "phone"
  | "email"
  | "image";

export type RequiredFlag = "Y" | "C" | "N";

export interface Option {
  code: number;
  label_pt: string;
  label_en?: string;
}

export interface CodeItem extends Option {
  active?: boolean;
  order?: number;
}

export interface Field {
  id: string;
  var: string;
  name: string;
  label_pt: string;
  label_en?: string;
  type: FieldType;
  required: RequiredFlag;
  relevance?: string;
  constraint?: string;
  constraint_message_pt?: string;
  options?: Option[];
  list?: string;
  other_code?: number;
  exclusive_code?: number;
  max_select?: number;
  unit?: string;
  subfields?: string[];
  validation?: string;
  system_generated?: boolean;
  contact?: boolean;
}

export interface Column {
  col: string;
  name: string;
  label_pt: string;
  label_en?: string;
  type: FieldType;
  options?: Option[];
  list?: string;
  role?: "row_key";
  readonly?: boolean;
  calc?: string;
  constraint?: string;
  constraint_message_pt?: string;
  validation?: string;
}

export interface Roster {
  id: string;
  var?: string;
  name: string;
  table: string;
  kind: "fixed" | "repeatable";
  label_pt: string;
  label_en?: string;
  paper_rows?: number;
  rows?: Array<{ code: number; label_pt: string }>;
  columns: Column[];
  network_source?: boolean;
  programme_source?: boolean;
}

export interface Module {
  key: string;
  order: number;
  title_pt: string;
  title_en?: string;
  applies_to: number[];
  relevance: string;
  fields: Field[];
  rosters: Roster[];
}

export interface FormSchema {
  meta: Record<string, unknown> & {
    version: string;
    locale_default: string;
    locales: string[];
  };
  code_lists: Record<string, CodeItem[]>;
  modules: Module[];
}

// ---------------------------------------------------------------------------
// The loaded schema
// ---------------------------------------------------------------------------

export const schema = schemaJson as unknown as FormSchema;

export function modules(): Module[] {
  return schema.modules;
}

export function moduleByKey(key: string): Module | undefined {
  return schema.modules.find((m) => m.key === key);
}

/** All scalar fields across all modules, in module/field order. */
export function allFields(): Field[] {
  return schema.modules.flatMap((m) => m.fields);
}

/** All rosters across all modules. */
export function allRosters(): Roster[] {
  return schema.modules.flatMap((m) => m.rosters);
}

export function fieldById(id: string): Field | undefined {
  return allFields().find((f) => f.id === id);
}

export function fieldByVar(variable: string): Field | undefined {
  return allFields().find((f) => f.var === variable);
}

export function codeList(id: string): CodeItem[] | undefined {
  return schema.code_lists[id];
}

/** Resolve a field's options, whether inline (`options`) or by reference (`list`). */
export function optionsFor(fieldOrColumn: Field | Column): Option[] {
  if (fieldOrColumn.options) return fieldOrColumn.options;
  if (fieldOrColumn.list) return schema.code_lists[fieldOrColumn.list] ?? [];
  return [];
}

/** Modules that apply to a given actor type (0.13 code). */
export function modulesForActorType(actorType: number): Module[] {
  return schema.modules.filter((m) => m.applies_to.includes(actorType));
}

// ---------------------------------------------------------------------------
// Relevance & validation helpers (wrap the expression engine)
// ---------------------------------------------------------------------------

export function moduleRelevant(m: Module, ctx: EvalContext): boolean {
  return isRelevant(m.relevance, ctx);
}

export function fieldRelevant(f: Field, ctx: EvalContext): boolean {
  return isRelevant(f.relevance, ctx);
}

export interface FieldError {
  id: string;
  var: string;
  code: "required" | "constraint" | "max_select" | "exclusive";
  message_pt: string;
}

const SPECIAL_CODES = new Set([96, 98, 99, -1]);

function isAnswered(v: ExprValue): boolean {
  if (v === undefined || v === null || v === "") return false;
  if (Array.isArray(v)) return v.length > 0;
  return true;
}

/**
 * Validate a single scalar field against an answer context. Honours the BRD
 * rules: required-when-relevant (Y always, C when its relevance is true),
 * special codes 98/99 satisfy "required", select_multiple cardinality
 * (`max_select`, BR-CN-9) and exclusive codes (BR-CN-10), and the field's own
 * `constraint` expression (BR-CN-*). Returns [] when the field is not relevant.
 */
export function validateField(f: Field, ctx: EvalContext): FieldError[] {
  if (!fieldRelevant(f, ctx)) return [];

  const errors: FieldError[] = [];
  const value = ctx[f.var];
  const required = f.required === "Y" || f.required === "C";

  if (required && !isAnswered(value) && !f.system_generated) {
    errors.push({
      id: f.id,
      var: f.var,
      code: "required",
      message_pt: `O campo "${f.label_pt}" é obrigatório.`,
    });
  }

  if (f.type === "select_multiple" && Array.isArray(value)) {
    const codes = value.map((v) => Number(v));
    if (f.max_select !== undefined && codes.filter((c) => !SPECIAL_CODES.has(c)).length > f.max_select) {
      errors.push({
        id: f.id,
        var: f.var,
        code: "max_select",
        message_pt: `Seleccione no máximo ${f.max_select} opções em "${f.label_pt}".`,
      });
    }
    if (f.exclusive_code !== undefined && codes.includes(f.exclusive_code) && codes.length > 1) {
      errors.push({
        id: f.id,
        var: f.var,
        code: "exclusive",
        message_pt: `A opção seleccionada é exclusiva em "${f.label_pt}".`,
      });
    }
  }

  if (f.constraint && isAnswered(value) && !satisfiesConstraint(f.constraint, ctx)) {
    errors.push({
      id: f.id,
      var: f.var,
      code: "constraint",
      message_pt: f.constraint_message_pt ?? `Valor inválido em "${f.label_pt}".`,
    });
  }

  return errors;
}

/** Validate every relevant field of a submission context. */
export function validateSubmission(ctx: EvalContext): FieldError[] {
  const errors: FieldError[] = [];
  for (const m of schema.modules) {
    if (!moduleRelevant(m, ctx)) continue;
    for (const f of m.fields) errors.push(...validateField(f, ctx));
  }
  return errors;
}