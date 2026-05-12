// Hard-coded escape hatch for issuers with non-standard ACFR hosting
// (CDN-only, paths discovery can't surface, etc.).
// Key format: `${issuerName.toLowerCase().trim()}|${issuerState.toLowerCase().trim()}`.
// Checked FIRST in findAcfrPdfUrl before any network calls.

export const ACFR_OVERRIDES: Record<string, string> = {
  "city of austin|tx":
    "https://austin.widen.net/s/xwlcncltpm/fy2025-annual-comprehensive-financial-report",
};
