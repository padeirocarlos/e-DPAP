/** Join conditional class names. Kept dependency-free and tiny. */
export function cn(
  ...parts: Array<string | false | null | undefined>
): string {
  return parts.filter(Boolean).join(" ");
}
