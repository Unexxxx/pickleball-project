import { z } from "zod";
import { getLeaderboard } from "@/lib/queries/leaderboards";
import { serializeLeaderboardCsv } from "@/lib/domain/leaderboard-export";
import {
  enforceRateLimit,
  safeServerError,
} from "@/lib/security/request-guards";
const query = z
  .object({
    scope: z.enum(["overall", "club"]).default("overall"),
    club: z
      .string()
      .regex(/^[a-z0-9-]+$/)
      .optional(),
    page: z.coerce.number().int().min(1).default(1),
  })
  .refine((v) => v.scope !== "club" || v.club, "Club is required");
export async function GET(request: Request) {
  const limited = enforceRateLimit(request, 30);
  if (limited) return limited;
  const parsed = query.safeParse(
    Object.fromEntries(new URL(request.url).searchParams),
  );
  if (!parsed.success)
    return Response.json(
      { error: "Invalid leaderboard filters" },
      { status: 400 },
    );
  let rows;
  try {
    rows = await getLeaderboard({
      scope: parsed.data.scope,
      clubSlug: parsed.data.club,
      page: parsed.data.page,
      pageSize: 500,
    });
  } catch (error) {
    return safeServerError("leaderboard.export", error);
  }
  const body = serializeLeaderboardCsv(
    rows.map((row) => ({
      rank: Number(row.rank),
      displayName: row.display_name ?? "Player",
      rating: Number(row.rating),
      wins: row.wins ?? 0,
      losses: row.losses ?? 0,
      winRate: Number(row.win_rate),
    })),
  );
  return new Response(body, {
    headers: {
      "content-type": "text/csv; charset=utf-8",
      "content-disposition": "attachment; filename=leaderboard.csv",
      "cache-control": "public, max-age=10",
    },
  });
}
