export function lineItems(value: string): string[] {
  return value
    .split(/\n+/)
    .map((item) => item.trim())
    .filter(Boolean);
}

export function nowIso(): string {
  return new Date().toISOString();
}

export function includesAny(haystack: string, needles: string[]): string | undefined {
  const normalized = haystack.toLowerCase();
  return needles.find((term) => normalized.includes(term));
}
