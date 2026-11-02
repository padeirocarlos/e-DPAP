/**
 * Typed, validated access to environment variables.
 *
 * Centralizing env parsing here keeps `process.env` lookups out of the rest of
 * the codebase and fails fast with a clear message when a required variable is
 * missing or malformed, instead of surfacing `undefined` deep in a component.
 */

import { z } from "zod";

const schema = z.object({
  /**
   * Public base URL of the backend API. Exposed to the browser, so it must be
   * prefixed with NEXT_PUBLIC_. Defaults to the local dev gateway.
   */
  NEXT_PUBLIC_API_BASE_URL: z
    .url()
    .default("http://localhost:8080/api"),
});

const parsed = schema.safeParse({
  NEXT_PUBLIC_API_BASE_URL: process.env.NEXT_PUBLIC_API_BASE_URL,
});

if (!parsed.success) {
  // Surface every invalid variable at once, at startup.
  throw new Error(
    `Invalid environment configuration:\n${parsed.error.issues
      .map((i) => `  - ${i.path.join(".")}: ${i.message}`)
      .join("\n")}`,
  );
}

export const env = {
  apiBaseUrl: parsed.data.NEXT_PUBLIC_API_BASE_URL,
} as const;
