/**
 * Placeholder interpolation for dictionary strings.
 *
 * Catalog leaves are plain strings so they stay serializable across the
 * server/client boundary. Where a string contains `{name}` tokens, resolve them
 * with `format(template, { name: value })`.
 */

export type FormatValues = Record<string, string | number>;

export function format(template: string, values: FormatValues = {}): string {
  return template.replace(/\{(\w+)\}/g, (match, key: string) =>
    key in values ? String(values[key]) : match,
  );
}
