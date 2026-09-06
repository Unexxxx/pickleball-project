"use server";

import { failure, success } from "@/lib/actions/result";
import { createClient } from "@/lib/supabase/server";
import { normalizeReclubUrl, parseReclubEventHtml } from "@/lib/imports/reclub";

export async function previewReclubEvent(value: string) {
  const requestId = crypto.randomUUID();
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user)
    return failure("UNAUTHENTICATED", "Log in to import an event.", requestId);

  let sourceUrl: string;
  try {
    sourceUrl = normalizeReclubUrl(value);
  } catch (error) {
    return failure(
      "VALIDATION_FAILED",
      error instanceof Error ? error.message : "Invalid link.",
      requestId,
    );
  }

  try {
    const response = await fetch(sourceUrl, {
      cache: "no-store",
      headers: {
        Accept: "text/html",
        "User-Agent": "PickleballRecordImporter/1.0",
      },
      signal: AbortSignal.timeout(10_000),
    });
    const contentLength = Number(response.headers.get("content-length") ?? 0);
    if (
      !response.ok ||
      !response.headers.get("content-type")?.includes("text/html") ||
      contentLength > 1_000_000
    ) {
      throw new Error("Reclub did not return a public event page.");
    }
    const html = await response.text();
    if (html.length > 1_000_000)
      throw new Error("The Reclub page is too large to import safely.");
    return success(parseReclubEventHtml(html, sourceUrl), requestId);
  } catch (error) {
    return failure(
      "INTERNAL_ERROR",
      error instanceof Error
        ? error.message
        : "Unable to import this Reclub event.",
      requestId,
    );
  }
}
