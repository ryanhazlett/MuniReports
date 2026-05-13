// Hard-coded escape hatch for issuers with non-standard ACFR hosting
// (CDN-only, paths discovery can't surface, etc.).
// Key format: `${issuerName.toLowerCase().trim()}|${issuerState.toLowerCase().trim()}`.
// Checked FIRST in findAcfrPdfUrl before any network calls.
//
// Austin TX was previously listed here but removed:
//   - FY2025 Widen share URL serves text/html (viewer page, not the PDF)
//   - FY2024 austintexas.gov path 404s
//   - FY2025 Widen direct PDF is 78.9 MB — fit under the bumped 100 MB cap;
//     test whether URL-fetched ACFRs over 32 MB are accepted by Anthropic
//     before re-adding an override here.

export const ACFR_OVERRIDES: Record<string, string> = {};
