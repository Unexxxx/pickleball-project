const buckets = new Map<string, { count: number; resetAt: number }>();

export function enforceRateLimit(
  request: Request,
  limit = 60,
  windowMs = 60_000,
) {
  const forwarded = request.headers
    .get("x-forwarded-for")
    ?.split(",")[0]
    ?.trim();
  const key = `${forwarded ?? "unknown"}:${new URL(request.url).pathname}`;
  const now = Date.now();
  const bucket = buckets.get(key);
  if (!bucket || bucket.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return null;
  }
  bucket.count += 1;
  return bucket.count > limit
    ? Response.json(
        { error: "Too many requests" },
        {
          status: 429,
          headers: {
            "retry-after": String(Math.ceil((bucket.resetAt - now) / 1000)),
          },
        },
      )
    : null;
}

export function requireSameOrigin(request: Request) {
  const origin = request.headers.get("origin");
  if (!origin) return null;
  const expected =
    process.env.NEXT_PUBLIC_SITE_URL ?? new URL(request.url).origin;
  return origin === new URL(expected).origin
    ? null
    : Response.json({ error: "Forbidden" }, { status: 403 });
}

export function requireJson(request: Request, maxBytes = 16_384) {
  const contentType = request.headers.get("content-type")?.split(";", 1)[0];
  if (contentType !== "application/json")
    return Response.json({ error: "JSON required" }, { status: 415 });
  const length = Number(request.headers.get("content-length") ?? 0);
  return length > maxBytes
    ? Response.json({ error: "Payload too large" }, { status: 413 })
    : null;
}

export function safeServerError(context: string, error?: unknown) {
  console.error(
    JSON.stringify({
      context,
      errorType: error instanceof Error ? error.name : "DatabaseError",
    }),
  );
  return Response.json({ error: "Request unavailable" }, { status: 500 });
}
