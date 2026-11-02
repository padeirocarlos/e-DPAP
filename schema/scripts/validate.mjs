#!/usr/bin/env node
/**
 * Validate form_schema.json against form_schema.schema.json (BRD FR-FORM-1).
 * Run with `npm run validate`. Exits non-zero on any violation.
 */
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import Ajv from "ajv/dist/2020.js";

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, "..");

const schema = JSON.parse(readFileSync(join(root, "form_schema.schema.json"), "utf8"));
const form = JSON.parse(readFileSync(join(root, "form_schema.json"), "utf8"));

const ajv = new Ajv({ allErrors: true, strict: false });
const validate = ajv.compile(schema);
const ok = validate(form);

if (!ok) {
  console.error("✗ form_schema.json is INVALID:\n");
  for (const err of validate.errors ?? []) {
    console.error(`  ${err.instancePath || "(root)"} ${err.message}`);
  }
  process.exit(1);
}

const moduleCount = form.modules.length;
const fieldCount = form.modules.reduce((n, m) => n + m.fields.length, 0);
const rosterCount = form.modules.reduce((n, m) => n + m.rosters.length, 0);
console.log(
  `✓ form_schema.json valid — ${moduleCount} modules, ${fieldCount} fields, ${rosterCount} rosters, ` +
    `${Object.keys(form.code_lists).length} code lists.`,
);
