import { describe, it, expect } from "vitest";
import {
  evaluate,
  evaluateBool,
  isRelevant,
  satisfiesConstraint,
  parse,
  ExprError,
} from "../src/expr.js";

describe("expression engine — operators", () => {
  it("evaluates equality (loose numeric/string)", () => {
    expect(evaluateBool("q0_12 = 1", { q0_12: 1 })).toBe(true);
    expect(evaluateBool("q0_12 = 1", { q0_12: "1" })).toBe(true);
    expect(evaluateBool("q0_12 = 1", { q0_12: 2 })).toBe(false);
  });

  it("evaluates inequality (!= and ≠)", () => {
    expect(evaluateBool("q0_13 != 1", { q0_13: 2 })).toBe(true);
    expect(evaluateBool("q0_13 ≠ 1", { q0_13: 1 })).toBe(false);
  });

  it("evaluates IN against a literal set", () => {
    expect(evaluateBool("q0_13 IN (1, 2, 4)", { q0_13: 4 })).toBe(true);
    expect(evaluateBool("q0_13 IN (1, 2, 4)", { q0_13: 3 })).toBe(false);
  });

  it("evaluates membership of a code in a select_multiple array (`1 IN qA_15`)", () => {
    expect(evaluateBool("1 IN qA_15", { qA_15: [1, 4] })).toBe(true);
    expect(evaluateBool("2 IN qA_15", { qA_15: [1, 4] })).toBe(false);
    expect(evaluateBool("1 IN qA_15", { qA_15: [] })).toBe(false);
    expect(evaluateBool("1 IN qA_15", {})).toBe(false);
  });

  it("evaluates AND / OR / NOT with precedence", () => {
    expect(evaluateBool("q0_12 = 1 AND q0_13 = 1", { q0_12: 1, q0_13: 1 })).toBe(true);
    expect(evaluateBool("q0_12 = 1 AND q0_13 = 1", { q0_12: 1, q0_13: 2 })).toBe(false);
    expect(evaluateBool("qI_02 = 2 OR qI_03 = 3", { qI_02: 2, qI_03: 1 })).toBe(true);
    expect(evaluateBool("NOT (8 IN qC_08)", { qC_08: [1, 2] })).toBe(true);
    expect(evaluateBool("NOT (8 IN qC_08)", { qC_08: [8] })).toBe(false);
  });

  it("evaluates comparisons and arithmetic", () => {
    expect(evaluateBool("qC_03 <= qC_02", { qC_03: 3, qC_02: 5 })).toBe(true);
    expect(evaluateBool("qC_03 <= qC_02", { qC_03: 6, qC_02: 5 })).toBe(false);
    expect(evaluateBool("qA_06 >= 15 AND qA_06 <= 110", { qA_06: 42 })).toBe(true);
    expect(evaluateBool("qA_06 >= 15 AND qA_06 <= 110", { qA_06: 12 })).toBe(false);
    expect(evaluate("men + women", { men: 3, women: 2 })).toBe(5);
  });

  it("treats a missing operand in a comparison as false, not a crash", () => {
    expect(evaluateBool("qA_06 >= 15", {})).toBe(false);
  });

  it("throws a typed error on a syntax error", () => {
    expect(() => parse("q0_12 = = 1")).toThrow(ExprError);
    expect(() => parse("(1, 2")).toThrow(ExprError);
  });
});

describe("relevance (skip logic) — the real BRD module/field expressions", () => {
  const consent = { q0_12: 1 };

  it("module A is relevant only with consent (q0_12 = 1)", () => {
    expect(isRelevant("q0_12 = 1", consent)).toBe(true);
    expect(isRelevant("q0_12 = 1", { q0_12: 2 })).toBe(false);
  });

  it("`always` and empty relevance are always true (module 0)", () => {
    expect(isRelevant("always", {})).toBe(true);
    expect(isRelevant("", {})).toBe(true);
    expect(isRelevant(undefined, {})).toBe(true);
  });

  it("module C needs consent + actor type in (1,2,4) + subsector 1 (`1 IN qA_15`)", () => {
    const expr = "q0_12 = 1 AND q0_13 IN (1, 2, 4) AND 1 IN qA_15";
    expect(isRelevant(expr, { q0_12: 1, q0_13: 1, qA_15: [1, 2] })).toBe(true);
    expect(isRelevant(expr, { q0_12: 1, q0_13: 3, qA_15: [1] })).toBe(false); // org
    expect(isRelevant(expr, { q0_12: 1, q0_13: 1, qA_15: [2] })).toBe(false); // no agriculture
  });

  it("A.04 respondent position only when actor type ≠ 1", () => {
    expect(isRelevant("q0_13 != 1", { q0_13: 2 })).toBe(true);
    expect(isRelevant("q0_13 != 1", { q0_13: 1 })).toBe(false);
  });

  it("A.20/A.21: registration docs when A.19 ∈ {1,2}; NUIT when A.20 includes 4", () => {
    expect(isRelevant("qA_19 IN (1, 2)", { qA_19: 1 })).toBe(true);
    expect(isRelevant("qA_19 IN (1, 2)", { qA_19: 3 })).toBe(false); // informal → N/A
    expect(isRelevant("4 IN qA_20", { qA_20: [1, 4] })).toBe(true);
    expect(isRelevant("4 IN qA_20", { qA_20: [1, 2] })).toBe(false);
  });

  it("I.06 reasons-for-no-credit when I.02 = 2 OR I.03 = 3", () => {
    const expr = "qI_02 = 2 OR qI_03 = 3";
    expect(isRelevant(expr, { qI_02: 2 })).toBe(true);
    expect(isRelevant(expr, { qI_02: 1, qI_03: 3 })).toBe(true);
    expect(isRelevant(expr, { qI_02: 1, qI_03: 1 })).toBe(false);
  });

  it("D.11 disease notification only when diseases ≠ only-none (11)", () => {
    expect(isRelevant("NOT (11 IN qD_10)", { qD_10: [1, 3] })).toBe(true);
    expect(isRelevant("NOT (11 IN qD_10)", { qD_10: [11] })).toBe(false);
  });
});

describe("constraints — the real BRD consistency rules (BR-CN)", () => {
  it("C.03 ≤ C.02 (BR-CN-3)", () => {
    expect(satisfiesConstraint("qC_03 <= qC_02", { qC_03: 2, qC_02: 5 })).toBe(true);
    expect(satisfiesConstraint("qC_03 <= qC_02", { qC_03: 7, qC_02: 5 })).toBe(false);
  });

  it("roster sold ≤ production (BR-CN-4)", () => {
    expect(satisfiesConstraint("sold_kg <= production_kg", { sold_kg: 10, production_kg: 40 })).toBe(true);
    expect(satisfiesConstraint("sold_kg <= production_kg", { sold_kg: 50, production_kg: 40 })).toBe(false);
  });

  it("percentage 0–100 (C.10, H.02, J.11)", () => {
    expect(satisfiesConstraint("qH_02 >= 0 AND qH_02 <= 100", { qH_02: 60 })).toBe(true);
    expect(satisfiesConstraint("qH_02 >= 0 AND qH_02 <= 100", { qH_02: 120 })).toBe(false);
  });

  it("empty constraint always passes", () => {
    expect(satisfiesConstraint("", {})).toBe(true);
    expect(satisfiesConstraint(undefined, {})).toBe(true);
  });
});
