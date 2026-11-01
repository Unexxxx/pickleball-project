import { ImageResponse } from "next/og";
import { SHARE_URL } from "@/lib/site";
import { eventShareDetails } from "@/lib/event-share";
import { resolveEventJoin } from "@/lib/queries/event-join";

// Share card for an event link (Messenger, Facebook, iMessage): the event
// page's header — host, badges, title, venue and the date card — on the same
// dark surface with the volt glow and the faint ring.
export const alt = "Pickleball event on UNEX";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

const SURFACE = "#0f1926";
const FOREGROUND = "#f9f7f1";
const VOLT = "#b5e02c";

/**
 * One Google font at one weight, only the letters this card uses. Null if
 * Google Fonts can't be reached; the card then uses the default font.
 */
async function googleFont(family: string, weight: number, text: string) {
  try {
    const css = await (
      await fetch(
        `https://fonts.googleapis.com/css2?family=${family.replaceAll(" ", "+")}:wght@${weight}&text=${encodeURIComponent(text)}`,
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

/**
 * The cream UNEX wordmark. This card is drawn on request, where the
 * deployment has no public/ folder on disk, so it's fetched from the site.
 */
async function logoDataUrl() {
  try {
    const response = await fetch(`${SHARE_URL}/unex-logo-cream.png`);
    if (!response.ok) return null;
    const bytes = Buffer.from(await response.arrayBuffer());
    return `data:image/png;base64,${bytes.toString("base64")}`;
  } catch {
    return null;
  }
}

function PinIcon() {
  return (
    <svg
      width="34"
      height="34"
      viewBox="0 0 24 24"
      fill="none"
      stroke="rgba(255,255,255,0.8)"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M20 10c0 4.993-5.539 10.193-7.399 11.799a1 1 0 0 1-1.202 0C9.539 20.193 4 14.993 4 10a8 8 0 0 1 16 0" />
      <circle cx="12" cy="10" r="3" />
    </svg>
  );
}

function CalendarIcon() {
  return (
    <svg
      width="52"
      height="52"
      viewBox="0 0 24 24"
      fill="none"
      stroke={VOLT}
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M8 2v4" />
      <path d="M16 2v4" />
      <rect width="18" height="18" x="3" y="4" rx="2" />
      <path d="M3 10h18" />
      <path d="M8 14h.01" />
      <path d="M12 14h.01" />
      <path d="M16 14h.01" />
      <path d="M8 18h.01" />
      <path d="M12 18h.01" />
      <path d="M16 18h.01" />
    </svg>
  );
}

export default async function EventOpengraphImage({
  params,
}: {
  params: Promise<{ eventCode: string }>;
}) {
  const { eventCode } = await params;
  // A missing event or logo still gives a card, never an error.
  const event = await resolveEventJoin(eventCode).catch(() => null);
  const share = event ? eventShareDetails(event) : null;
  const logoSrc = await logoDataUrl();

  const title = share?.title ?? "Pickleball on UNEX";
  // Long names shrink so the title stays within two lines.
  const titleSize = title.length > 44 ? 62 : title.length > 28 ? 76 : 92;
  const host = share ? `HOSTED BY ${share.club.toUpperCase()}` : "UNEX";
  const text = [
    title,
    host,
    share?.venue,
    share?.date,
    share?.times,
    ...(share?.badges ?? []),
  ].join("");
  const [heading, bodyBold, body] = await Promise.all([
    googleFont("Bricolage Grotesque", 800, title),
    googleFont("Archivo", 800, text),
    googleFont("Archivo", 700, text),
  ]);
  const fonts = [
    heading && { name: "Heading", data: heading, weight: 800 as const },
    bodyBold && { name: "Body", data: bodyBold, weight: 800 as const },
    body && { name: "Body", data: body, weight: 700 as const },
  ].filter((font) => font !== null);
  const bodyFont = bodyBold || body ? "Body" : "sans-serif";

  return new ImageResponse(
    <div
      style={{
        position: "relative",
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        gap: 22,
        overflow: "hidden",
        padding: "0 72px",
        backgroundColor: SURFACE,
        backgroundImage:
          "radial-gradient(circle at 92% 15%, rgba(216,242,79,0.3), rgba(216,242,79,0) 420px)",
        color: FOREGROUND,
        fontFamily: bodyFont,
      }}
    >
      {/* The faint ring in the lower right. */}
      <div
        style={{
          position: "absolute",
          right: -70,
          bottom: -120,
          width: 340,
          height: 340,
          border: "60px solid rgba(255,255,255,0.05)",
          borderRadius: 999,
        }}
      />
      {logoSrc ? (
        <img
          src={logoSrc}
          width={120}
          height={50}
          alt="UNEX"
          style={{ position: "absolute", top: 48, right: 64, opacity: 0.9 }}
        />
      ) : null}

      <div
        style={{
          display: "flex",
          color: "rgba(255,255,255,0.82)",
          fontSize: 24,
          fontWeight: 800,
          letterSpacing: 2.5,
        }}
      >
        {host}
      </div>
      {share ? (
        <div style={{ display: "flex", gap: 12 }}>
          {share.badges.map((badge) => (
            <div
              key={badge}
              style={{
                display: "flex",
                border: "2px solid rgba(255,255,255,0.2)",
                borderRadius: 999,
                background: "rgba(255,255,255,0.09)",
                padding: "8px 22px",
                color: "rgba(255,255,255,0.92)",
                fontSize: 24,
                fontWeight: 800,
              }}
            >
              {badge}
            </div>
          ))}
        </div>
      ) : null}
      <div
        style={{
          display: "flex",
          maxWidth: 1000,
          fontFamily: heading ? "Heading" : bodyFont,
          fontSize: titleSize,
          fontWeight: 800,
          lineHeight: 1.02,
          letterSpacing: -2,
        }}
      >
        {title}
      </div>
      {share ? (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 14,
            color: "rgba(255,255,255,0.8)",
            fontSize: 30,
            fontWeight: 700,
          }}
        >
          <PinIcon />
          {share.venue}
        </div>
      ) : null}
      {share ? (
        <div
          style={{
            display: "flex",
            alignItems: "flex-start",
            gap: 26,
            marginTop: 6,
            border: "2px solid rgba(255,255,255,0.16)",
            borderRadius: 28,
            background: "rgba(255,255,255,0.1)",
            padding: "26px 32px",
          }}
        >
          <CalendarIcon />
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <div style={{ display: "flex", fontSize: 32, fontWeight: 800 }}>
              {share.date}
            </div>
            <div
              style={{
                display: "flex",
                color: "rgba(255,255,255,0.82)",
                fontSize: 28,
                fontWeight: 700,
              }}
            >
              {share.times}
            </div>
          </div>
        </div>
      ) : null}
    </div>,
    { ...size, fonts: fonts.length ? fonts : undefined },
  );
}
