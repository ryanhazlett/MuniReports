import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { normalizeKey, CACHE_TTL_DAYS } from "@/utils/report-cache";
import { findAcfrPdfUrl } from "@/lib/acfr-finder";

export const maxDuration = 300;

// Hard cap: above this we won't even surface the URL — useful as a defense
// against pathologically large PDFs that we shouldn't try to fetch at all.
const MAX_PDF_BYTES = 100 * 1024 * 1024;

// Stage-C attachment cutoff: PDFs above this size will be surfaced (pdfUrl
// is returned) but marked attachable=false. The client (or /api/read-acfr)
// uses web-only research for those — large PDFs consistently push Anthropic
// past the function timeout when attached as document blocks.
const STAGE_C_MAX_BYTES = 20 * 1024 * 1024;

async function validatePdfUrl(
  url: string
): Promise<
  | { ok: true; bytes: number; contentType: string }
  | { ok: false; reason: string }
> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10_000);
    let response: Response;
    try {
      response = await fetch(url, { method: "HEAD", signal: controller.signal, redirect: "follow" });
    } finally {
      clearTimeout(timeout);
    }
    if (!response.ok) return { ok: false, reason: `HEAD ${response.status}` };
    const contentType = (response.headers.get("content-type") || "").toLowerCase();
    if (!contentType.includes("application/pdf")) {
      return { ok: false, reason: `Content-Type was ${contentType || "missing"}` };
    }
    const lenHeader = response.headers.get("content-length");
    if (!lenHeader) return { ok: false, reason: "Content-Length missing" };
    const bytes = parseInt(lenHeader, 10);
    if (!Number.isFinite(bytes) || bytes <= 0) return { ok: false, reason: "Content-Length unparseable" };
    if (bytes > MAX_PDF_BYTES) {
      const mb = (bytes / (1024 * 1024)).toFixed(1);
      return { ok: false, reason: `size ${mb}MB exceeds 100MB cap` };
    }
    return { ok: true, bytes, contentType };
  } catch (err: any) {
    if (err?.name === "AbortError") return { ok: false, reason: "validation timeout (10s)" };
    return { ok: false, reason: `HEAD error: ${String(err?.message || err)}` };
  }
}

export async function POST(req: NextRequest) {
  try {
    const { issuerName, issuerState, forceRefresh } = await req.json();
    const supabase = await createClient();

    if (typeof issuerName !== "string" || !issuerName) {
      return NextResponse.json({ error: "issuerName (string) required" }, { status: 400 });
    }

    const cacheKey = normalizeKey(issuerName, issuerState);

    // Cache lookup — if a fresh report exists, short-circuit the whole pipeline.
    if (!forceRefresh && cacheKey && cacheKey !== "|") {
      try {
        const { data: cached } = await supabase
          .from("cached_reports")
          .select("report_data, generated_at")
          .eq("issuer_key", cacheKey)
          .maybeSingle();

        if (cached) {
          const ageMs = Date.now() - new Date(cached.generated_at).getTime();
          const ageDays = ageMs / (1000 * 60 * 60 * 24);
          if (ageDays < CACHE_TTL_DAYS) {
            console.log(`[find-acfr] cache hit: ${cacheKey} (age ${ageDays.toFixed(1)}d)`);
            return NextResponse.json({
              cached: true,
              report: cached.report_data,
              generatedAt: cached.generated_at,
            });
          }
        }
      } catch (cacheErr) {
        console.warn("[find-acfr] cache lookup failed (non-fatal):", cacheErr);
      }
    }

    // URL discovery (overrides → Brave → DDG fallback)
    const finder = await findAcfrPdfUrl(issuerName, issuerState);

    if (!finder.url) {
      console.log(`[find-acfr] no URL: ${finder.note}`);
      return NextResponse.json({
        cached: false,
        pdfUrl: null,
        pdfSource: null,
        pdfBytes: null,
        attachable: false,
        note: finder.note,
      });
    }

    // HEAD validation (200, application/pdf, ≤ 100 MB)
    const validation = await validatePdfUrl(finder.url);
    if (!validation.ok) {
      const note = `${validation.reason} (finder source: ${finder.source})`;
      console.log(`[find-acfr] HEAD rejected: ${note} url=${finder.url}`);
      return NextResponse.json({
        cached: false,
        pdfUrl: finder.url,
        pdfSource: finder.source,
        pdfBytes: null,
        attachable: false,
        note,
      });
    }

    // 20 MB Stage-C attachment cutoff. Surface the URL (caller can still use it
    // for citation purposes) but mark not attachable.
    if (validation.bytes > STAGE_C_MAX_BYTES) {
      const mb = (validation.bytes / (1024 * 1024)).toFixed(1);
      const note = `PDF found (${mb}MB) but exceeds 20MB Stage-C cap; web-only research`;
      console.log(`[find-acfr] over Stage-C cap: ${note} url=${finder.url}`);
      return NextResponse.json({
        cached: false,
        pdfUrl: finder.url,
        pdfSource: finder.source,
        pdfBytes: validation.bytes,
        attachable: false,
        note,
      });
    }

    const mb = (validation.bytes / (1024 * 1024)).toFixed(1);
    const note = `ready for Stage C (${mb}MB, source: ${finder.source})`;
    console.log(`[find-acfr] ready: ${note} url=${finder.url}`);
    return NextResponse.json({
      cached: false,
      pdfUrl: finder.url,
      pdfSource: finder.source,
      pdfBytes: validation.bytes,
      attachable: true,
      note,
    });
  } catch (error) {
    console.error("[find-acfr] route error:", error);
    return NextResponse.json({ error: "Find-acfr route failed" }, { status: 500 });
  }
}
