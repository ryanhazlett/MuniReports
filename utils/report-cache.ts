// Shared between /api/research and /api/generate.

export const CACHE_TTL_DAYS = 90;

export function normalizeKey(name: string, state: string): string {
  return `${(name || "").trim().toLowerCase()}|${(state || "").trim().toLowerCase()}`;
}
