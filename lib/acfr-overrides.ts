// Hard-coded escape hatch for issuers with non-standard ACFR hosting
// (CDN-only, paths discovery can't surface, etc.).
// Key format: `${issuerName.toLowerCase().trim()}|${issuerState.toLowerCase().trim()}`.
// Checked FIRST in findAcfrPdfUrl before any network calls.
//
// Austin TX was previously listed here but removed:
//   - FY2025 Widen share URL serves text/html (viewer page, not the PDF)
//   - FY2024 austintexas.gov path 404s
//   - Even the correct direct FY2025 Widen PDF is 78.9 MB — exceeds the
//     32 MB request-size cap that Anthropic documents.
// DuckDuckGo discovery surfaces Austin's URLs; if it returns the 78.9 MB
// FY2025 the size check will reject and we fall back to web-only research.
// Re-add an override here only if/when we have a working URL under 32 MB.

export const ACFR_OVERRIDES: Record<string, string> = {};
