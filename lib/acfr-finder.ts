// Server-side ACFR PDF URL discovery. No model involved.
// Order of operations:
//   0. ACFR_OVERRIDES map (immediate return if hit; no HEAD)
//   1. Brave Search API (primary; structured JSON, no IP/bot issues, has free tier;
//      requires BRAVE_API_KEY in env)
//   2. DuckDuckGo HTML fallback (best-effort; aggressively rate-limits server IPs
//      so it's unreliable from Vercel, but kept as a backup for when Brave key is
//      missing or its quota is exhausted)
//
// Search engines we tried and abandoned:
//   - EMMA's own search (Search.aspx) — ASP.NET WebForms with JS-rendered results
//   - Google /search — serves noscript-redirect to /enablejs against headless fetches
//   - Bing /search — wraps result URLs in /ck/a? redirects + JS rendering

import { ACFR_OVERRIDES } from "./acfr-overrides";

export type FindResult = {
  url: string | null;
  source: "override" | "brave" | "duckduckgo" | null;
  note: string;
};

const HEAD_TIMEOUT_MS = 10_000;
const FETCH_TIMEOUT_MS = 15_000;
const USER_AGENT =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:121.0) Gecko/20100101 Firefox/121.0";

// Domains we never accept as the ACFR source — aggregators and third-party hosts.
const DOMAIN_BLOCKLIST = [
  "sec.gov",
  "datausa.io",
  "wikipedia.org",
  "wikiwand.com",
  "scribd.com",
  "yumpu.com",
  "documentcloud.org",
];

function normalizeKey(name: string, state: string): string {
  return `${(name || "").trim().toLowerCase()}|${(state || "").trim().toLowerCase()}`;
}

function extractPdfHrefs(html: string): string[] {
  const out: string[] = [];
  // Tolerates both " and ' as the href quote char.
  const re = /<a[^>]+href=["']([^"'\s>]+\.pdf[^"'\s>]*)["']/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(html)) !== null) {
    out.push(m[1]);
  }
  return out;
}

function looksUsable(url: string): boolean {
  try {
    const u = new URL(url);
    const host = u.hostname.toLowerCase();
    return !DOMAIN_BLOCKLIST.some((b) => host.includes(b));
  } catch {
    return false;
  }
}

function absolutize(href: string, base: string): string {
  try {
    return new URL(href, base).toString();
  } catch {
    return href;
  }
}

async function headIsPdf(url: string): Promise<boolean> {
  try {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), HEAD_TIMEOUT_MS);
    let res: Response;
    try {
      res = await fetch(url, {
        method: "HEAD",
        redirect: "follow",
        signal: ctrl.signal,
        headers: { "User-Agent": USER_AGENT },
      });
    } finally {
      clearTimeout(t);
    }
    if (!res.ok) return false;
    const ct = (res.headers.get("content-type") || "").toLowerCase();
    return ct.includes("pdf");
  } catch {
    return false;
  }
}

async function fetchHtml(url: string): Promise<string | null> {
  try {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), FETCH_TIMEOUT_MS);
    let res: Response;
    try {
      res = await fetch(url, {
        method: "GET",
        redirect: "follow",
        signal: ctrl.signal,
        headers: {
          "User-Agent": USER_AGENT,
          Accept: "text/html,application/xhtml+xml,application/xml;q=0.9",
          "Accept-Language": "en-US,en;q=0.9",
        },
      });
    } finally {
      clearTimeout(t);
    }
    if (!res.ok) return null;
    return await res.text();
  } catch {
    return null;
  }
}

async function pickFirstValidPdf(candidates: string[]): Promise<string | null> {
  for (const c of candidates) {
    if (!looksUsable(c)) continue;
    if (await headIsPdf(c)) return c;
  }
  return null;
}

// Unwrap a DuckDuckGo result-tracking redirect: //duckduckgo.com/l/?uddg=ENCODED_TARGET&...
// Returns the decoded target URL, or the input unchanged if it doesn't match.
function unwrapDuckDuckGo(href: string, base: string): string {
  try {
    const abs = absolutize(href, base);
    const parsed = new URL(abs);
    if (parsed.hostname.endsWith("duckduckgo.com") && parsed.pathname.startsWith("/l")) {
      const u = parsed.searchParams.get("uddg");
      if (u) return u;
    }
    return abs;
  } catch {
    return href;
  }
}

// EMMA-hosted PDFs (emma.msrb.org) are preferred over city-hosted PDFs because
// they're SEC-mandated continuing disclosures and the URLs are stable. Sort to
// put EMMA candidates first, then preserve DDG's relevance order within each group.
function rankEmmaFirst(urls: string[]): string[] {
  const emma: string[] = [];
  const other: string[] = [];
  for (const u of urls) {
    try {
      if (new URL(u).hostname.toLowerCase().includes("emma.msrb.org")) emma.push(u);
      else other.push(u);
    } catch {
      other.push(u);
    }
  }
  return [...emma, ...other];
}

// Brave Search API. Free tier exists; subscription token in BRAVE_API_KEY env var.
// Returns structured JSON, no scraping; URLs are direct (no /url? wrappers).
// Doc: https://api-dashboard.search.brave.com/app/documentation/web-search/responses
async function searchBrave(name: string, state: string): Promise<string | null> {
  const apiKey = process.env.BRAVE_API_KEY;
  if (!apiKey) {
    console.warn("[acfr-finder] BRAVE_API_KEY not set; skipping Brave search");
    return null;
  }
  const q = encodeURIComponent(
    `${name} ${state} annual comprehensive financial report filetype:pdf`.trim()
  );
  const apiUrl = `https://api.search.brave.com/res/v1/web/search?q=${q}&count=10`;
  try {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), FETCH_TIMEOUT_MS);
    let response: Response;
    try {
      response = await fetch(apiUrl, {
        method: "GET",
        signal: ctrl.signal,
        headers: {
          Accept: "application/json",
          "Accept-Encoding": "gzip",
          "X-Subscription-Token": apiKey,
        },
      });
    } finally {
      clearTimeout(timer);
    }
    if (!response.ok) {
      console.warn(`[acfr-finder] Brave search HTTP ${response.status}`);
      return null;
    }
    const data: any = await response.json();
    const results: any[] = Array.isArray(data?.web?.results) ? data.web.results : [];
    const candidates = results
      .map((r: any) => r?.url)
      .filter((u: any): u is string => typeof u === "string" && /\.pdf($|\?)/i.test(u));
    if (candidates.length === 0) return null;
    const ranked = rankEmmaFirst(candidates);
    return await pickFirstValidPdf(ranked);
  } catch (err) {
    console.warn("[acfr-finder] Brave search error:", err);
    return null;
  }
}

async function searchDuckDuckGo(name: string, state: string): Promise<string | null> {
  const q = encodeURIComponent(
    `${name} ${state} annual comprehensive financial report filetype:pdf`.trim()
  );
  const base = `https://html.duckduckgo.com/html/?q=${q}`;
  const html = await fetchHtml(base);
  if (!html) return null;
  const raw = extractPdfHrefs(html);
  const unwrapped = raw.map((h) => unwrapDuckDuckGo(h, base));
  // De-dupe while preserving order.
  const seen = new Set<string>();
  const dedup: string[] = [];
  for (const u of unwrapped) {
    if (!seen.has(u)) {
      seen.add(u);
      dedup.push(u);
    }
  }
  const ranked = rankEmmaFirst(dedup);
  return await pickFirstValidPdf(ranked);
}

export async function findAcfrPdfUrl(
  issuerName: string,
  issuerState: string
): Promise<FindResult> {
  // Step 0: overrides map — trusted, no HEAD.
  const key = normalizeKey(issuerName, issuerState);
  const override = ACFR_OVERRIDES[key];
  if (override) {
    return { url: override, source: "override", note: `override map hit (${key})` };
  }

  // Step 1: Brave Search API (primary — structured JSON, no IP/bot issues).
  try {
    const brave = await searchBrave(issuerName, issuerState);
    if (brave) {
      const isEmma = brave.toLowerCase().includes("emma.msrb.org");
      return {
        url: brave,
        source: "brave",
        note: isEmma ? "found via Brave Search (EMMA-hosted)" : "found via Brave Search",
      };
    }
  } catch (e) {
    console.warn("[acfr-finder] Brave step error (non-fatal):", e);
  }

  // Step 2: DuckDuckGo HTML fallback (if Brave key missing, quota exhausted, or no result).
  // DDG aggressively rate-limits server IPs but sometimes still returns useful results
  // — kept as best-effort backup.
  try {
    const ddg = await searchDuckDuckGo(issuerName, issuerState);
    if (ddg) {
      const isEmma = ddg.toLowerCase().includes("emma.msrb.org");
      return {
        url: ddg,
        source: "duckduckgo",
        note: isEmma ? "found via DuckDuckGo (EMMA-hosted)" : "found via DuckDuckGo",
      };
    }
  } catch (e) {
    console.warn("[acfr-finder] DuckDuckGo step error (non-fatal):", e);
  }

  return {
    url: null,
    source: null,
    note: "no PDF surfaced from overrides, Brave, or DuckDuckGo search",
  };
}
