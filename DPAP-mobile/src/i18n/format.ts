/**
 * Interpolate `{placeholder}` tokens in a catalog string.
 * Example: format("{count} por sincronizar", { count: 3 }).
 */
export function format(
  template: string,
  values: Record<string, string | number>,
): string {
  return template.replace(/\{(\w+)\}/g, (match, key: string) =>
    key in values ? String(values[key]) : match,
  );
}
