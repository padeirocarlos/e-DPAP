import { describe, it, expect } from "vitest";
import { validateField, validateSubmission, fieldById, type Field } from "../src/schema-model.js";

/**
 * AC-3 / BR-CN scaffold: the schema-driven field validator applies required,
 * cardinality (max 3), exclusive-code and constraint rules — and respects
 * relevance so irrelevant fields never block.
 */

describe("validateField — required when relevant", () => {
  it("flags a missing required (Y) field when relevant", () => {
    const f = fieldById("A.01") as Field; // actor_name, required Y
    const errs = validateField(f, { q0_12: 1 });
    expect(errs.some((e) => e.code === "required")).toBe(true);
  });

  it("does not flag a conditional (C) field whose relevance is false", () => {
    const f = fieldById("A.21") as Field; // NUIT, relevance: 4 IN qA_20
    expect(validateField(f, { q0_12: 1, qA_20: [1, 2] })).toEqual([]);
  });

  it("flags a conditional (C) field once its relevance holds", () => {
    const f = fieldById("A.21") as Field;
    const errs = validateField(f, { q0_12: 1, qA_20: [1, 4] });
    expect(errs.some((e) => e.code === "required")).toBe(true);
  });

  it("special code 99 (refused) satisfies required", () => {
    const f = fieldById("A.07") as Field; // education, required Y
    expect(validateField(f, { q0_12: 1, qA_07: 99 })).toEqual([]);
  });
});

describe("validateField — select_multiple cardinality & exclusivity", () => {
  it("rejects more than 3 options in an 'até 3' field (BR-CN-9)", () => {
    const f = fieldById("C.11") as Field; // crop_constraints, max_select 3
    const ok = validateField(f, { q0_12: 1, q0_13: 1, qA_15: [1], qC_11: [1, 2, 3] });
    expect(ok.some((e) => e.code === "max_select")).toBe(false);
    const bad = validateField(f, { q0_12: 1, q0_13: 1, qA_15: [1], qC_11: [1, 2, 3, 4] });
    expect(bad.some((e) => e.code === "max_select")).toBe(true);
  });

  it("rejects mixing the exclusive 'Nenhum' code with others (BR-CN-10)", () => {
    const f = fieldById("C.08") as Field; // inputs_used, exclusive_code 8
    const bad = validateField(f, { q0_12: 1, q0_13: 1, qA_15: [1], qC_08: [8, 1] });
    expect(bad.some((e) => e.code === "exclusive")).toBe(true);
    const ok = validateField(f, { q0_12: 1, q0_13: 1, qA_15: [1], qC_08: [8] });
    expect(ok.some((e) => e.code === "exclusive")).toBe(false);
  });
});

describe("validateField — constraint expressions (BR-CN)", () => {
  it("flags C.03 > C.02", () => {
    const f = fieldById("C.03") as Field;
    const ctx = { q0_12: 1, q0_13: 1, qA_15: [1], qC_02: 5, qC_03: 9 };
    expect(validateField(f, ctx).some((e) => e.code === "constraint")).toBe(true);
  });

  it("accepts an age within 15–110 and rejects outside", () => {
    const f = fieldById("A.06") as Field;
    expect(validateField(f, { q0_12: 1, qA_06: 40 }).some((e) => e.code === "constraint")).toBe(false);
    expect(validateField(f, { q0_12: 1, qA_06: 9 }).some((e) => e.code === "constraint")).toBe(true);
  });
});

describe("validateSubmission — module relevance gates whole modules", () => {
  it("a no-consent interview (0.12 = 2) raises no module A–O errors", () => {
    // Only module 0 applies; 0.13/0.14 are N/A, 0.15 required.
    const errs = validateSubmission({ q0_12: 2, q0_15: 3 });
    expect(errs.every((e) => e.id.startsWith("0."))).toBe(true);
  });

  it("an individual producer only triggers producer-relevant modules, not J/K/L/M", () => {
    const ctx = { q0_12: 1, q0_13: 1, qA_15: [1] };
    const errs = validateSubmission(ctx);
    const modulesHit = new Set(errs.map((e) => e.id[0]));
    expect(modulesHit.has("J")).toBe(false);
    expect(modulesHit.has("K")).toBe(false);
    expect(modulesHit.has("L")).toBe(false);
    expect(modulesHit.has("M")).toBe(false);
  });
});
