import { ImageResponse } from "next/og";

// Share card for links to unex.live (Facebook, Messenger, X, Slack, iMessage).
export const alt = "UNEX — Pickleball Open Play, Matchmaking & Rankings";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

const NAVY = "#0a2952";
const VOLT = "#b5e02c";
const CREAM = "#ede6c4";

export default function OpengraphImage() {
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
      <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
        <div
          style={{
            width: 56,
            height: 56,
            borderRadius: 999,
            background: VOLT,
          }}
        />
        <div style={{ fontSize: 44, fontWeight: 800, letterSpacing: -1 }}>
          UNEX
        </div>
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
