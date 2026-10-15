import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { ImageResponse } from "next/og";

// Share card for links to unex.live (Facebook, Messenger, X, Slack, iMessage).
export const alt = "UNEX — Pickleball Open Play, Matchmaking & Rankings";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

const NAVY = "#0a2952";
const VOLT = "#b5e02c";
const CREAM = "#ede6c4";
export default async function OpengraphImage() {
  // Cream copy of the white unex-logo.png wordmark (the header tints it with a
  // CSS mask, which next/og can't render).
  const logo = await readFile(
    join(process.cwd(), "public/unex-logo-cream.png"),
  );
  const logoSrc = `data:image/png;base64,${logo.toString("base64")}`;
  // Lime pickleball with navy line art (480x470).
  const ball = await readFile(
    join(process.cwd(), "public/pickleball-ball.png"),
  );
  const ballSrc = `data:image/png;base64,${ball.toString("base64")}`;

  return new ImageResponse(
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        padding: "72px 80px",
        background: NAVY,
        color: CREAM,
        fontFamily: "sans-serif",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 24 }}>
        <img src={ballSrc} width={80} height={78} alt="" />
        <img src={logoSrc} width={216} height={90} alt="UNEX" />
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
        <div
          style={{
            fontSize: 84,
            fontWeight: 900,
            lineHeight: 1,
            letterSpacing: -3,
          }}
        >
          Play. Confirm. Climb.
        </div>
        <div style={{ fontSize: 34, opacity: 0.8, maxWidth: 900 }}>
          Pickleball open play, fair matchmaking, and all-time rankings for
          clubs.
        </div>
      </div>
      <div style={{ display: "flex", fontSize: 28, color: VOLT }}>
        unex.live
      </div>
    </div>,
    size,
  );
}
