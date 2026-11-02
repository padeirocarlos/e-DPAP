// VENDORED COPY of the shared schema-driven form logic. Canonical location is
// DPAP-mobile/src/form (edited here, then copied to DPAP-web/src/form). Keep in
// sync across the two apps.
//
// Headless controller for the schema-driven questionnaire (BRD FR-FORM-*). It
// holds the answer map, derives the relevant modules/fields via the shared
// engine, and exposes typed setters (incl. select_multiple exclusivity/max and
// roster rows). Presentation lives in form-ui.tsx; the data layer (offline
// Dexie vs API) is the caller's.

import { useMemo, useState } from "react";
import {
  modules,
  moduleRelevant,
  fieldRelevant,
  validateSubmission,
  type Field,
  type Module,
} from "./schema-model";
import type { EvalContext, ExprValue } from "./expr";

export type Answers = Record<string, ExprValue>;
export type RosterRow = Record<string, ExprValue>;

const SPECIAL = new Set([96, 98, 99, -1]);

export function useForm(initial?: Answers) {
  const [answers, setAnswers] = useState<Answers>(initial ?? {});

  const api = useMemo(() => {
    const setAnswer = (variable: string, value: ExprValue) =>
      setAnswers((a) => ({ ...a, [variable]: value }));

    const clearAnswer = (variable: string) =>
      setAnswers((a) => {
        const next = { ...a };
        delete next[variable];
        return next;
      });

    /** Toggle one code in a select_multiple, honouring exclusive + max_select. */
    const toggleMulti = (field: Field, code: number) =>
      setAnswers((a) => {
        const current = Array.isArray(a[field.var]) ? [...(a[field.var] as number[])] : [];
        const has = current.includes(code);
        let next: number[];
        if (has) {
          next = current.filter((c) => c !== code);
        } else if (field.exclusive_code !== undefined && code === field.exclusive_code) {
          next = [code]; // exclusive option clears the rest
        } else {
          next = current.filter((c) => c !== field.exclusive_code).concat(code);
          // enforce max_select over non-special codes
          if (field.max_select !== undefined) {
            const special = next.filter((c) => SPECIAL.has(c));
            const normal = next.filter((c) => !SPECIAL.has(c));
            if (normal.length > field.max_select) return a; // ignore the extra pick
            next = normal.concat(special);
          }
        }
        return { ...a, [field.var]: next };
      });

    const rosterRows = (rosterVar: string): RosterRow[] =>
      Array.isArray(answers[rosterVar]) ? (answers[rosterVar] as unknown as RosterRow[]) : [];

    const setRosterRows = (rosterVar: string, rows: RosterRow[]) =>
      setAnswer(rosterVar, rows as unknown as ExprValue);

    return { setAnswer, clearAnswer, toggleMulti, rosterRows, setRosterRows };
  }, [answers]);

  const ctx = answers as EvalContext;
  const visibleModules: Module[] = modules().filter((m) => moduleRelevant(m, ctx));
  const isFieldRelevant = (f: Field) => fieldRelevant(f, ctx);
  const errors = validateSubmission(ctx);

  return {
    answers,
    setAnswers,
    ...api,
    visibleModules,
    isFieldRelevant,
    errors,
  };
}
