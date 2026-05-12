// Server-side ACFR PDF URL discovery. No model involved.
// Order of operations:
//   0. ACFR_OVERRIDES map (immediate return if hit; no HEAD)
//   1. EMMA Official Statements search (t=OS)
//   2. EMMA Continuing Disclosures search (t=CP)
//   3. Google search filetype:pdf
// Steps 1-3 fetch HTML, regex-extract .pdf hrefs, HEAD-validate, return first valid.

import { ACFR_OVERRIDES } from "./acfr-overrides";

export type FindResult = {
  url: string | null;
  source: "override" | "EMMA-OS" | "EMMA-CD" | "google" | null;
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

async function searchEmmaOS(name: string, state: string): Promise<string | null> {
  const q = encodeURIComponent(`${name} ${state}`.trim());
  const base = `https://emma.msrb.org/Search/Search.aspx?q=${q}&t=OS`;
  const html = await fetchHtml(base);
  if (!html) return null;
  const candidates = extractPdfHrefs(html).map((h) => absolutize(h, base));
  return await pickFirstValidPdf(candidates);
}

async function searchEmmaCD(name: string): Promise<string | null> {
  const q = encodeURIComponent(name);
  const base = `https://emma.msrb.org/Search/Search.aspx?q=${q}&t=CP`;
  const html = await fetchHtml(base);
  if (!html) return null;
  const candidates = extractPdfHrefs(html).map((h) => absolutize(h, base));
  return await pickFirstValidPdf(candidates);
}

async function searchGoogle(name: string, state: string): Promise<string | null> {
  const q = encodeURIComponent(
    `${name} ${state} annual comprehensive financial report filetype:pdf`
  );
  const base = `https://www.google.com/search?q=${q}`;
  const html = await fetchHtml(base);
  if (!html) return null;
  // Google wraps result URLs in tracking redirects (/url?q=...&...) — pull the q= param
  // out where present, else use the raw href.
  const raw = extractPdfHrefs(html).map((h) => absolutize(h, base));
  const unwrapped = raw.map((u) => {
    try {
      const parsed = new URL(u);
      if (parsed.hostname.endsWith("google.com") && parsed.pathname === "/url") {
        const q = parsed.searchParams.get("q");
        if (q) return q;
      }
    } catch {}
    return u;
  });
  return await pickFirstValidPdf(unwrapped);
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

  // Step 1: EMMA Official Statements
  try {
    const emmaOs = await searchEmmaOS(issuerName, issuerState);
    if (emmaOs) {
      return { url: emmaOs, source: "EMMA-OS", note: "found via EMMA Official Statements" };
    }
  } catch (e) {
    console.warn("[acfr-finder] EMMA-OS step error (non-fatal):", e);
  }

  // Step 2: EMMA Continuing Disclosures
  try {
    const emmaCd = await searchEmmaCD(issuerName);
    if (emmaCd) {
      return { url: emmaCd, source: "EMMA-CD", note: "found via EMMA Continuing Disclosures" };
    }
  } catch (e) {
    console.warn("[acfr-finder] EMMA-CD step error (non-fatal):", e);
  }

  // Step 3: Google search filetype:pdf
  try {
    const google = await searchGoogle(issuerName, issuerState);
    if (google) {
      return { url: google, source: "google", note: "found via Google search" };
    }
  } catch (e) {
    console.warn("[acfr-finder] Google step error (non-fatal):", e);
  }

  return {
    url: null,
    source: null,
    note: "no PDF surfaced from overrides, EMMA, or Google search",
  };
}
