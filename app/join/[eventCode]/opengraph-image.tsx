import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { ImageResponse } from "next/og";
import { eventShareDetails } from "@/lib/event-share";
import { resolveEventJoin } from "@/lib/queries/event-join";

// Share card for an event link: what Messenger, Facebook and iMessage show.
export const alt = "Pickleball event on UNEX";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

const NAVY = "#0a2952";
const VOLT = "#b5e02c";
const CREAM = "#ede6c4";

/**
 * Bricolage Grotesque (the app's heading font) at one weight, only the
 * letters this card uses. Null if Google Fonts can't be reached; the card
 * then falls back to the default font.
 */
async function headingFont(weight: number, text: string) {
  try {
    const css = await (
      await fetch(
        `https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:wght@${weight}&text=${encodeURIComponent(text)}`,
      )
    ).text();
    const url = css.match(
      /src: url\((.+?)\) format\('(opentype|truetype)'\)/,
    )?.[1];
    if (!url) return null;
    const font = await fetch(url);
    return font.ok ? await font.arrayBuffer() : null;
  } catch {
    return null;
  }
}

export default async function EventOpengraphImage({
  params,
}: {
  params: Promise<{ eventCode: string }>;
}) {
  const { eventCode } = await params;
  const event = await resolveEventJoin(eventCode);
  const ball = await readFile(
    join(process.cwd(), "public/pickleball-ball.png"),
  );
  const ballSrc = `data:image/png;base64,${ball.toString("base64")}`;
  const logo = await readFile(
    join(process.cwd(), "public/unex-logo-cream.png"),
  );
  const logoSrc = `data:image/png;base64,${logo.toString("base64")}`;
  const share = event ? eventShareDetails(event) : null;
  const title = share?.title ?? "Pickleball on UNEX";
  // Long names shrink so they fit in two lines.
  const titleSize = title.length > 48 ? 58 : title.length > 30 ? 70 : 84;
  const text = [
    title,
    share?.club,
    share?.when,
    share?.venue,
    share?.spots,
    ...(share?.tags ?? []),
    "UNEX unex.live ·",
  ].join("");
  const [bold, regular] = await Promise.all([
    headingFont(800, text),
    headingFont(500, text),
  ]);
  const fonts = [
    bold && { name: "Bricolage", data: bold, weight: 800 as const },
    regular && { name: "Bricolage", data: regular, weight: 500 as const },
  ].filter((font) => font !== null);

  return new ImageResponse(
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        padding: "64px 76px",
        background: NAVY,
        color: CREAM,
        fontFamily: fonts.length ? "Bricolage" : "sans-serif",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 18,
            fontSize: 30,
            fontWeight: 700,
          }}
        >
          <img src={ballSrc} width={56} height={55} alt="" />
          {share ? share.club : "UNEX"}
        </div>
        <img src={logoSrc} width={144} height={60} alt="UNEX" />
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 26 }}>
        {share ? (
          <div style={{ display: "flex", gap: 12 }}>
            {share.tags.map((tag) => (
              <div
                key={tag}
                style={{
                  display: "flex",
                  padding: "8px 20px",
                  borderRadius: 999,
                  background: tag === share.tags[0] ? VOLT : "#1b3b66",
                  color: tag === share.tags[0] ? NAVY : CREAM,
                  fontSize: 26,
                  fontWeight: 700,
                }}
              >
                {tag}
              </div>
            ))}
          </div>
        ) : null}
        <div
          style={{
            display: "flex",
            fontSize: titleSize,
            fontWeight: 800,
            lineHeight: 1.05,
            letterSpacing: -2,
            maxWidth: 1040,
          }}
        >
          {title}
        </div>
        {share ? (
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: 10,
              fontSize: 34,
            }}
          >
            <div style={{ display: "flex", color: VOLT, fontWeight: 700 }}>
              {share.when}
            </div>
            <div style={{ display: "flex", opacity: 0.85 }}>
              {share.venue} · {share.spots}
            </div>
          </div>
        ) : null}
      </div>

      <div style={{ display: "flex", fontSize: 26, color: VOLT }}>
        unex.live
      </div>
    </div>,
    { ...size, fonts: fonts.length ? fonts : undefined },
  );
}
