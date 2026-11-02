import { describe, it, expect } from "vitest";
import {
  schema,
  modules,
  allFields,
  allRosters,
  fieldById,
  optionsFor,
  type Field,
  type Column,
} from "../src/schema-model.js";
import { parse } from "../src/expr.js";

/**
 * AC-1 scaffold: assert that EVERY field ID and roster in BRD Section 7 is
 * present in form_schema.json, with a Portuguese label, a resolvable option set
 * for choice fields, and parseable relevance/constraint expressions. If the BRD
 * changes, this list is the checklist to update alongside the schema.
 */

// --- Authoritative ID lists transcribed from BRD Section 7 -----------------

const EXPECTED_FIELD_IDS: Record<string, string[]> = {
  "0": ["0.01", "0.02", "0.03", "0.04", "0.05", "0.06", "0.07", "0.08", "0.09", "0.10", "0.11", "0.12", "0.13", "0.14", "0.15"],
  A: ["A.01", "A.02", "A.03", "A.04", "A.05", "A.06", "A.07", "A.08", "A.09", "A.10", "A.11", "A.12", "A.13", "A.14", "A.15", "A.16", "A.17", "A.18", "A.19", "A.20", "A.21", "A.23"],
  B: ["B.01", "B.03", "B.04", "B.05", "B.06", "B.07", "B.08", "B.09"],
  C: ["C.01", "C.02", "C.03", "C.04", "C.06", "C.07", "C.08", "C.09", "C.10", "C.11"],
  D: ["D.02", "D.04", "D.05", "D.06", "D.07", "D.08", "D.10", "D.11", "D.12", "D.13"],
  E: ["E.01", "E.02", "E.03", "E.04", "E.06", "E.07", "E.08", "E.09", "E.10", "E.11", "E.12", "E.13"],
  F: ["F.01", "F.03", "F.04", "F.05", "F.06", "F.07", "F.08", "F.09", "F.10", "F.11"],
  G: ["G.02", "G.03"],
  H: ["H.01", "H.02", "H.03", "H.04", "H.05", "H.06", "H.07", "H.08"],
  I: ["I.01", "I.02", "I.03", "I.04", "I.05", "I.06", "I.07", "I.08"],
  J: ["J.01", "J.02", "J.03", "J.04", "J.05", "J.07", "J.10", "J.11", "J.12", "J.14", "J.15"],
  K: ["K.01", "K.02", "K.03", "K.04", "K.05", "K.06", "K.09"],
  L: ["L.01", "L.02", "L.03", "L.04", "L.05", "L.06", "L.07", "L.09", "L.10", "L.12"],
  M: ["M.01", "M.02", "M.03", "M.04", "M.06", "M.08", "M.09"],
  N: ["N.01", "N.02", "N.04", "N.05", "N.06"],
  O: ["O.01", "O.02", "O.03", "O.04", "O.05"],
};

const EXPECTED_ROSTER_IDS = [
  "A.22", "B.02", "C.05", "D.01", "D.03", "D.09", "E.05", "F.02", "G.01",
  "J.06", "J.08", "J.09", "J.13", "K.07", "K.08", "L.08", "L.11", "M.05", "M.07", "N.03",
];

const MODULE_KEYS = ["0", "A", "B", "C", "D", "E", "F", "G", "H", "I", "J", "K", "L", "M", "N", "O"];

const SELECT_TYPES = new Set(["select_one", "select_multiple", "yes_no"]);

// ---------------------------------------------------------------------------

describe("form schema — module structure", () => {
  it("has all 16 modules (0–O) in order", () => {
    expect(modules().map((m) => m.key)).toEqual(MODULE_KEYS);
  });

  it("every module has a Portuguese title and a parseable relevance expression", () => {
    for (const m of modules()) {
      expect(m.title_pt.length).toBeGreaterThan(0);
      expect(() => parse(m.relevance === "always" ? "1 = 1" : m.relevance)).not.toThrow();
      expect(Array.isArray(m.applies_to)).toBe(true);
    }
  });
});

describe("form schema — every Section-7 field is present (AC-1)", () => {
  for (const [moduleKey, ids] of Object.entries(EXPECTED_FIELD_IDS)) {
    it(`module ${moduleKey} has exactly its ${ids.length} fields`, () => {
      const m = modules().find((x) => x.key === moduleKey)!;
      expect(m).toBeDefined();
      expect(m.fields.map((f) => f.id).sort()).toEqual([...ids].sort());
    });
  }

  it("every field has a non-empty PT label, a stable var key and a valid type", () => {
    for (const f of allFields()) {
      expect(f.label_pt.length, f.id).toBeGreaterThan(0);
      expect(f.var, f.id).toMatch(/^q[0-9A-O]+_[0-9]{2}$/);
      expect(["Y", "C", "N"], f.id).toContain(f.required);
    }
  });

  it("every choice field resolves to a non-empty option set", () => {
    for (const f of allFields()) {
      if (SELECT_TYPES.has(f.type)) {
        expect(optionsFor(f).length, `${f.id} options`).toBeGreaterThan(0);
        if (f.list) expect(schema.code_lists[f.list], `${f.id} list ${f.list}`).toBeDefined();
      }
    }
  });

  it("every relevance and constraint expression parses", () => {
    for (const f of allFields()) {
      if (f.relevance) expect(() => parse(f.relevance!), `${f.id} relevance`).not.toThrow();
      if (f.constraint) expect(() => parse(f.constraint!), `${f.id} constraint`).not.toThrow();
    }
  });

  it("'Outro' fields carry other_code 96 and the 96 option", () => {
    for (const f of allFields()) {
      if (f.other_code !== undefined) {
        expect(f.other_code).toBe(96);
        expect(optionsFor(f).some((o) => o.code === 96), `${f.id} has option 96`).toBe(true);
      }
    }
  });
});

describe("form schema — every Section-7 roster is present (AC-1)", () => {
  it("has exactly the expected rosters", () => {
    expect(allRosters().map((r) => r.id).sort()).toEqual([...EXPECTED_ROSTER_IDS].sort());
  });

  it("every roster has a table name, a PT label and columns; fixed rosters have rows", () => {
    for (const r of allRosters()) {
      expect(r.table, r.id).toMatch(/^roster_[a-z0-9_]+$/);
      expect(r.label_pt.length, r.id).toBeGreaterThan(0);
      expect(r.columns.length, r.id).toBeGreaterThan(0);
      if (r.kind === "fixed") expect((r.rows ?? []).length, `${r.id} rows`).toBeGreaterThan(0);
      for (const c of r.columns as Column[]) {
        expect(c.label_pt.length, `${r.id}.${c.col}`).toBeGreaterThan(0);
        if (c.list) expect(schema.code_lists[c.list], `${r.id}.${c.col} list`).toBeDefined();
      }
    }
  });

  it("roster calc columns reference parseable expressions", () => {
    for (const r of allRosters()) {
      for (const c of r.columns) {
        if (c.calc) expect(() => parse(c.calc!), `${r.id}.${c.col} calc`).not.toThrow();
      }
    }
  });
});

describe("form schema — shared code lists (Appendix A)", () => {
  it("districts list has the 8 Maputo districts", () => {
    expect(schema.code_lists.districts.map((d) => d.label_pt)).toEqual([
      "Boane", "Magude", "Manhiça", "Marracuene", "Matola", "Matutuíne", "Moamba", "Namaacha",
    ]);
  });

  it("special codes list has 96 / 98 / 99 / -1", () => {
    expect(schema.code_lists.special.map((s) => s.code).sort((a, b) => a - b)).toEqual([-1, 96, 98, 99]);
  });

  it("crops list has 28 crops + 'Outra' (96)", () => {
    expect(schema.code_lists.crops).toHaveLength(29);
    expect(schema.code_lists.crops.some((c) => c.code === 96)).toBe(true);
  });

  it("the routing field 0.13 uses the shared actor_type list (5 types)", () => {
    const f = fieldById("0.13") as Field;
    expect(f.list).toBe("actor_type");
    expect(schema.code_lists.actor_type).toHaveLength(5);
  });
});
