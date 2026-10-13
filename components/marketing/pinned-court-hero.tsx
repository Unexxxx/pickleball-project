"use client";

import { useEffect, useRef } from "react";
import Link from "next/link";
import { ArrowRight, BadgeCheck } from "lucide-react";

/**
 * Pinned, scroll-scrubbed canvas hero: a pickleball court rendered in a
 * simple isometric projection, with a ball rallying back and forth between
 * two paddles as the section scrolls through. Inspired by actl.me's tennis
 * hero, rebuilt from scratch with plain 2D canvas (no WebGL/engine).
 *
 * The outer `.pch-track` element is tall (several viewport heights); the
 * inner `.pch-pin` stays `position: sticky` for that whole range while
 * scroll progress (0 → 1 across the track) drives the animation. Under
 * prefers-reduced-motion the track collapses to one viewport height via CSS
 * and the canvas just renders a single resting frame — no scroll-jacking.
 */

// Court proportions loosely follow a real pickleball court (44ft x 20ft).
const COURT_LENGTH = 440;
const COURT_WIDTH = 200;
const KITCHEN_DEPTH = 70; // 7ft, scaled
const NET_HEIGHT = 46;
const APRON_MARGIN = 46;
const SLAB_THICKNESS = 22; // court slab depth, gives the 3D edge

const BOUNCES = 5;
const BALL_X_MIN = 34;
const BALL_X_MAX = COURT_LENGTH - 34;
const BOUNCE_HEIGHT = 78;
const BALL_Y_OFFSETS = [0, -22, 18, -14, 10];

// Perimeter fencing is taller behind the baselines (catches overhit balls)
// than along the sidelines, matching a real court.
const FENCE_HEIGHT_END = 64;
const FENCE_HEIGHT_SIDE = 26;

const ISO_ANGLE = Math.PI / 6;

function smoothstep(edge0: number, edge1: number, x: number) {
  const t = Math.min(Math.max((x - edge0) / (edge1 - edge0), 0), 1);
  return t * t * (3 - 2 * t);
}

function lerp(a: number, b: number, t: number) {
  return a + (b - a) * t;
}

export function PinnedCourtHero() {
  const trackRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const track = trackRef.current;
    const canvas = canvasRef.current;
    if (!track || !canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const reduceMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;

    let width = 0;
    let height = 0;

    function project(
      x: number,
      y: number,
      z: number,
      originX: number,
      originY: number,
      scale: number,
      rotation: number,
    ): [number, number] {
      const cx = x - COURT_LENGTH / 2;
      const cy = y - COURT_WIDTH / 2;
      const cos = Math.cos(rotation);
      const sin = Math.sin(rotation);
      const rx = cx * cos - cy * sin;
      const ry = cx * sin + cy * cos;
      const screenX = originX + (rx - ry) * Math.cos(ISO_ANGLE) * scale;
      const screenY =
        originY + (rx + ry) * Math.sin(ISO_ANGLE) * scale - z * scale;
      return [screenX, screenY];
    }

    function resize() {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const rect = canvas!.getBoundingClientRect();
      width = rect.width;
      height = rect.height;
      canvas!.width = Math.round(width * dpr);
      canvas!.height = Math.round(height * dpr);
      ctx!.setTransform(dpr, 0, 0, dpr, 0, 0);
    }

    function ballState(progress: number) {
      const scaled = progress * BOUNCES;
      const cycle = Math.min(Math.floor(scaled), BOUNCES - 1);
      const t = scaled - cycle;
      const leftToRight = cycle % 2 === 0;
      const startX = leftToRight ? BALL_X_MIN : BALL_X_MAX;
      const endX = leftToRight ? BALL_X_MAX : BALL_X_MIN;
      const x = lerp(startX, endX, t);
      const y = COURT_WIDTH / 2 + (BALL_Y_OFFSETS[cycle] ?? 0);
      const z = BOUNCE_HEIGHT * 4 * t * (1 - t);

      // Paddle A sits at BALL_X_MIN, paddle B at BALL_X_MAX. Whichever side
      // the ball just left plays a quick decaying "follow-through"; whichever
      // side it's approaching winds up into a "contact" swing near t = 1.
      const aSwing = leftToRight
        ? 1 - smoothstep(0, 0.18, t) // A just hit it — recovering
        : smoothstep(0.8, 1, t); // A about to receive it
      const bSwing = leftToRight
        ? smoothstep(0.8, 1, t) // B about to receive it
        : 1 - smoothstep(0, 0.18, t); // B just hit it — recovering

      return { x, y, z, cycle, t, aSwing, bSwing };
    }

    function drawPaddle(
      sideX: number,
      facing: 1 | -1,
      swing: number,
      originX: number,
      originY: number,
      scale: number,
      rotation: number,
    ) {
      const [px, py] = project(
        sideX + facing * -18,
        COURT_WIDTH / 2,
        30,
        originX,
        originY,
        scale,
        rotation,
      );
      const restAngle = facing === 1 ? 0.55 : Math.PI - 0.55;
      const hitAngle = facing === 1 ? -0.25 : Math.PI + 0.25;
      const angle = lerp(restAngle, hitAngle, swing);

      // Local space: origin sits at the base of the grip. `dist(d)` walks a
      // distance `d` away from the grip, toward the paddle face — this reads
      // the same regardless of which side (`facing`) the paddle is on.
      const dist = (d: number) => -facing * d;
      const handleLen = scale * 18;
      const handleW = scale * 7;
      const throatLen = scale * 9;
      const faceLen = scale * 42;
      const faceW = scale * 29;
      const throatFar = handleLen + throatLen;
      const faceCenterX = dist(throatFar + faceLen / 2);

      ctx!.save();
      ctx!.translate(px, py);
      ctx!.rotate(angle);

      // Handle — a rounded grip bar with a few texture ridges.
      const handleX = facing === 1 ? -handleLen : 0;
      ctx!.fillStyle = "oklch(30% 0.02 255)";
      ctx!.beginPath();
      ctx!.roundRect(handleX, -handleW / 2, handleLen, handleW, handleW / 2);
      ctx!.fill();
      ctx!.strokeStyle = "rgb(255 255 255 / 0.28)";
      ctx!.lineWidth = Math.max(1, scale * 1.1);
      for (let i = 1; i <= 3; i++) {
        const gx = handleX + (handleLen * i) / 4;
        ctx!.beginPath();
        ctx!.moveTo(gx, -handleW / 2);
        ctx!.lineTo(gx, handleW / 2);
        ctx!.stroke();
      }

      // Throat — short taper from the grip width out to the face width.
      ctx!.fillStyle = "oklch(21% 0.03 255)";
      ctx!.beginPath();
      ctx!.moveTo(dist(handleLen), -handleW / 2);
      ctx!.lineTo(dist(throatFar), -faceW * 0.36);
      ctx!.lineTo(dist(throatFar), faceW * 0.36);
      ctx!.lineTo(dist(handleLen), handleW / 2);
      ctx!.closePath();
      ctx!.fill();

      // Face — a rounded rectangle (real paddles aren't circular), with a
      // volt edge guard matching the accent color.
      ctx!.fillStyle = "oklch(21% 0.03 255)";
      ctx!.strokeStyle = "oklch(80% 0.19 125)";
      ctx!.lineWidth = Math.max(1.5, scale * 2.4);
      ctx!.beginPath();
      ctx!.roundRect(
        faceCenterX - faceLen / 2,
        -faceW / 2,
        faceLen,
        faceW,
        faceW * 0.36,
      );
      ctx!.fill();
      ctx!.stroke();
      ctx!.restore();
    }

    function drawFencePanel(
      x1: number,
      y1: number,
      x2: number,
      y2: number,
      fenceHeight: number,
      posts: number,
      proj: (x: number, y: number, z: number) => [number, number],
      scale: number,
    ) {
      const topA = proj(x1, y1, fenceHeight);
      const topB = proj(x2, y2, fenceHeight);

      // Mesh fill so the panel reads as an open weave, not a solid wall.
      ctx!.fillStyle = "rgb(200 210 215 / 0.1)";
      ctx!.beginPath();
      ctx!.moveTo(...proj(x1, y1, 0));
      ctx!.lineTo(...topA);
      ctx!.lineTo(...topB);
      ctx!.lineTo(...proj(x2, y2, 0));
      ctx!.closePath();
      ctx!.fill();

      // Chain-link grid: a galvanized-gray weave of verticals and horizontal
      // bands, dense enough to read as wire mesh rather than a faint smear.
      const wireCols = Math.max(posts, 14);
      ctx!.strokeStyle = "rgb(210 218 222 / 0.4)";
      ctx!.lineWidth = Math.max(0.5, scale * 0.35);
      for (let i = 0; i <= wireCols; i++) {
        const f = i / wireCols;
        const gx = lerp(x1, x2, f);
        const gy = lerp(y1, y2, f);
        ctx!.beginPath();
        ctx!.moveTo(...proj(gx, gy, 0));
        ctx!.lineTo(...proj(gx, gy, fenceHeight));
        ctx!.stroke();
      }
      const wireRows = 5;
      for (let j = 1; j < wireRows; j++) {
        const fz = (fenceHeight * j) / wireRows;
        ctx!.beginPath();
        ctx!.moveTo(...proj(x1, y1, fz));
        ctx!.lineTo(...proj(x2, y2, fz));
        ctx!.stroke();
      }

      // Posts at each end, a touch taller than the mesh, plus a top rail.
      ctx!.strokeStyle = "oklch(32% 0.015 255)";
      ctx!.lineWidth = Math.max(1.2, scale * 1.8);
      [
        [x1, y1] as const,
        [x2, y2] as const,
      ].forEach(([px, py]) => {
        ctx!.beginPath();
        ctx!.moveTo(...proj(px, py, 0));
        ctx!.lineTo(...proj(px, py, fenceHeight + 4));
        ctx!.stroke();
      });
      ctx!.strokeStyle = "rgb(255 255 255 / 0.3)";
      ctx!.lineWidth = Math.max(0.8, scale * 1);
      ctx!.beginPath();
      ctx!.moveTo(...topA);
      ctx!.lineTo(...topB);
      ctx!.stroke();
    }

    function draw(progress: number) {
      ctx!.clearRect(0, 0, width, height);
      if (width === 0 || height === 0) return;

      const rotation = lerp(-0.07, 0.07, progress);
      // Smaller and pushed further right than before, so it sits clearly in
      // its own zone to the right of the hero text instead of crowding it —
      // matching actl.me's roughly 55/45 text/illustration split.
      // On phones the text takes the top of the screen and the court sits
      // centered underneath it, so the two never overlap.
      const isPhone = width < 700;
      const originX = width * (isPhone ? 0.5 : 0.75);
      const originY = height * (isPhone ? 0.74 : 0.6);
      const fitScale =
        Math.min(width * (isPhone ? 0.46 : 0.42), height * 0.42) /
        (COURT_LENGTH * Math.cos(ISO_ANGLE));
      const scale = fitScale * (1 + 0.05 * progress);

      const proj = (x: number, y: number, z: number) =>
        project(x, y, z, originX, originY, scale, rotation);

      // Apron (out-of-bounds surround)
      const apronPts = [
        proj(-APRON_MARGIN, -APRON_MARGIN, 0),
        proj(COURT_LENGTH + APRON_MARGIN, -APRON_MARGIN, 0),
        proj(COURT_LENGTH + APRON_MARGIN, COURT_WIDTH + APRON_MARGIN, 0),
        proj(-APRON_MARGIN, COURT_WIDTH + APRON_MARGIN, 0),
      ];
      // Slab sides — extrude the apron downward so the court reads as a
      // solid block. All four sides are drawn first; the top face painted
      // after covers whichever ones face away from the camera.
      const apronCorners: [number, number][] = [
        [-APRON_MARGIN, -APRON_MARGIN],
        [COURT_LENGTH + APRON_MARGIN, -APRON_MARGIN],
        [COURT_LENGTH + APRON_MARGIN, COURT_WIDTH + APRON_MARGIN],
        [-APRON_MARGIN, COURT_WIDTH + APRON_MARGIN],
      ];
      // Ground shadow — the slab's footprint, offset away from the light and
      // blurred, so the block visibly floats above the dark background.
      ctx!.save();
      ctx!.shadowColor = "rgb(0 0 0 / 0.75)";
      ctx!.shadowBlur = Math.max(12, scale * 46);
      ctx!.shadowOffsetX = scale * 30;
      ctx!.shadowOffsetY = scale * 44;
      ctx!.fillStyle = "rgb(0 0 0 / 1)";
      ctx!.beginPath();
      apronCorners.forEach(([x, y], i) => {
        const [sx, sy] = proj(x, y, -SLAB_THICKNESS);
        if (i === 0) ctx!.moveTo(sx, sy);
        else ctx!.lineTo(sx, sy);
      });
      ctx!.closePath();
      ctx!.fill();
      ctx!.restore();

      apronCorners.forEach(([x1, y1], i) => {
        const [x2, y2] = apronCorners[(i + 1) % 4]!;
        const a = proj(x1, y1, 0);
        const b = proj(x2, y2, 0);
        const c = proj(x2, y2, -SLAB_THICKNESS);
        const d = proj(x1, y1, -SLAB_THICKNESS);
        // Same green as the top face, no shading.
        ctx!.fillStyle = "oklch(48% 0.1 148)";
        ctx!.strokeStyle = "oklch(48% 0.1 148)";
        ctx!.lineWidth = 1;
        ctx!.beginPath();
        ctx!.moveTo(...a);
        ctx!.lineTo(...b);
        ctx!.lineTo(...c);
        ctx!.lineTo(...d);
        ctx!.closePath();
        ctx!.fill();
        ctx!.stroke();
      });

      ctx!.fillStyle = "oklch(48% 0.1 148)";
      ctx!.beginPath();
      apronPts.forEach(([x, y], i) =>
        i === 0 ? ctx!.moveTo(x, y) : ctx!.lineTo(x, y),
      );
      ctx!.closePath();
      ctx!.fill();

      // Court surface
      const courtPts = [
        proj(0, 0, 0),
        proj(COURT_LENGTH, 0, 0),
        proj(COURT_LENGTH, COURT_WIDTH, 0),
        proj(0, COURT_WIDTH, 0),
      ];
      ctx!.fillStyle = "oklch(47% 0.14 255)";
      ctx!.beginPath();
      courtPts.forEach(([x, y], i) =>
        i === 0 ? ctx!.moveTo(x, y) : ctx!.lineTo(x, y),
      );
      ctx!.closePath();
      ctx!.fill();

      // Line markings
      ctx!.strokeStyle = "rgb(255 255 255 / 0.75)";
      ctx!.lineWidth = Math.max(1, scale * 1.6);
      const kitchenNear = COURT_LENGTH / 2 - KITCHEN_DEPTH;
      const kitchenFar = COURT_LENGTH / 2 + KITCHEN_DEPTH;
      const lines: [number, number, number, number][] = [
        [0, 0, COURT_LENGTH, 0], // sideline
        [0, COURT_WIDTH, COURT_LENGTH, COURT_WIDTH], // sideline
        [0, 0, 0, COURT_WIDTH], // baseline
        [COURT_LENGTH, 0, COURT_LENGTH, COURT_WIDTH], // baseline
        [kitchenNear, 0, kitchenNear, COURT_WIDTH], // kitchen (NVZ) line
        [kitchenFar, 0, kitchenFar, COURT_WIDTH], // kitchen (NVZ) line
        // Center service line — runs from each baseline to its kitchen line
        // only; there's no line through the kitchen itself (the net is there).
        [0, COURT_WIDTH / 2, kitchenNear, COURT_WIDTH / 2],
        [kitchenFar, COURT_WIDTH / 2, COURT_LENGTH, COURT_WIDTH / 2],
      ];
      lines.forEach(([x1, y1, x2, y2]) => {
        const [sx1, sy1] = proj(x1, y1, 0);
        const [sx2, sy2] = proj(x2, y2, 0);
        ctx!.beginPath();
        ctx!.moveTo(sx1, sy1);
        ctx!.lineTo(sx2, sy2);
        ctx!.stroke();
      });

      // Perimeter fence — taller behind each baseline, shorter along the
      // sidelines, same as a real court.
      const fenceM = APRON_MARGIN;
      drawFencePanel(
        -fenceM,
        -fenceM,
        COURT_LENGTH + fenceM,
        -fenceM,
        FENCE_HEIGHT_SIDE,
        12,
        proj,
        scale,
      );
      drawFencePanel(
        -fenceM,
        COURT_WIDTH + fenceM,
        COURT_LENGTH + fenceM,
        COURT_WIDTH + fenceM,
        FENCE_HEIGHT_SIDE,
        12,
        proj,
        scale,
      );
      drawFencePanel(
        -fenceM,
        -fenceM,
        -fenceM,
        COURT_WIDTH + fenceM,
        FENCE_HEIGHT_END,
        5,
        proj,
        scale,
      );
      drawFencePanel(
        COURT_LENGTH + fenceM,
        -fenceM,
        COURT_LENGTH + fenceM,
        COURT_WIDTH + fenceM,
        FENCE_HEIGHT_END,
        5,
        proj,
        scale,
      );

      // Net — a real net sags a little at the top-center between its posts
      // and is dark, open mesh underneath a white tape band, not a solid pane.
      const netTopL = proj(COURT_LENGTH / 2, 0, NET_HEIGHT);
      const netTopR = proj(COURT_LENGTH / 2, COURT_WIDTH, NET_HEIGHT);
      const netTopSag = proj(
        COURT_LENGTH / 2,
        COURT_WIDTH / 2,
        NET_HEIGHT - NET_HEIGHT * 0.1,
      );
      const netBotL = proj(COURT_LENGTH / 2, 0, 0);
      const netBotR = proj(COURT_LENGTH / 2, COURT_WIDTH, 0);
      const lerpPt = (
        a: [number, number],
        b: [number, number],
        f: number,
      ): [number, number] => [lerp(a[0], b[0], f), lerp(a[1], b[1], f)];

      ctx!.fillStyle = "rgb(8 12 16 / 0.4)";
      ctx!.beginPath();
      ctx!.moveTo(...netBotL);
      ctx!.lineTo(...netTopL);
      ctx!.quadraticCurveTo(netTopSag[0], netTopSag[1], ...netTopR);
      ctx!.lineTo(...netBotR);
      ctx!.closePath();
      ctx!.fill();

      // Mesh grid (both directions, so it reads as netting, not glass).
      ctx!.strokeStyle = "rgb(255 255 255 / 0.2)";
      ctx!.lineWidth = Math.max(0.5, scale * 0.4);
      const meshCols = 9;
      for (let i = 1; i < meshCols; i++) {
        const f = i / meshCols;
        const top = lerpPt(netTopL, netTopR, f);
        const bot = lerpPt(netBotL, netBotR, f);
        ctx!.beginPath();
        ctx!.moveTo(...top);
        ctx!.lineTo(...bot);
        ctx!.stroke();
      }
      const meshRows = 4;
      for (let j = 1; j < meshRows; j++) {
        const f = j / meshRows;
        const left = lerpPt(netTopL, netBotL, f);
        const right = lerpPt(netTopR, netBotR, f);
        ctx!.beginPath();
        ctx!.moveTo(...left);
        ctx!.lineTo(...right);
        ctx!.stroke();
      }

      // End posts, taller than the net itself.
      const postTopL = proj(COURT_LENGTH / 2, 0, NET_HEIGHT + 12);
      const postTopR = proj(COURT_LENGTH / 2, COURT_WIDTH, NET_HEIGHT + 12);
      ctx!.strokeStyle = "oklch(28% 0.02 255)";
      ctx!.lineWidth = Math.max(2, scale * 3);
      ctx!.beginPath();
      ctx!.moveTo(...netBotL);
      ctx!.lineTo(...postTopL);
      ctx!.stroke();
      ctx!.beginPath();
      ctx!.moveTo(...netBotR);
      ctx!.lineTo(...postTopR);
      ctx!.stroke();

      // White tape along the (sagging) top edge, drawn last so it stays crisp.
      ctx!.strokeStyle = "rgb(255 255 255 / 0.92)";
      ctx!.lineWidth = Math.max(2, scale * 2.6);
      ctx!.lineCap = "round";
      ctx!.beginPath();
      ctx!.moveTo(...netTopL);
      ctx!.quadraticCurveTo(netTopSag[0], netTopSag[1], ...netTopR);
      ctx!.stroke();
      ctx!.lineCap = "butt";

      const ball = ballState(progress);

      // Paddles (drawn before the ball so the ball reads on top)
      drawPaddle(BALL_X_MIN, 1, ball.aSwing, originX, originY, scale, rotation);
      drawPaddle(
        BALL_X_MAX,
        -1,
        ball.bSwing,
        originX,
        originY,
        scale,
        rotation,
      );

      // Ball shadow
      const [shadowX, shadowY] = proj(ball.x, ball.y, 0);
      const shadowScale = Math.max(0.25, 1 - ball.z / (BOUNCE_HEIGHT * 1.4));
      ctx!.fillStyle = `rgb(0 0 0 / ${0.32 * shadowScale})`;
      ctx!.beginPath();
      ctx!.ellipse(
        shadowX,
        shadowY,
        scale * 9 * shadowScale,
        scale * 4.5 * shadowScale,
        0,
        0,
        Math.PI * 2,
      );
      ctx!.fill();

      // Ball
      const [ballX, ballY] = proj(ball.x, ball.y, ball.z + 8);
      const ballR = scale * 7;
      ctx!.fillStyle = "oklch(80% 0.19 125)";
      ctx!.beginPath();
      ctx!.arc(ballX, ballY, ballR, 0, Math.PI * 2);
      ctx!.fill();
      ctx!.fillStyle = "rgb(0 0 0 / 0.25)";
      [-0.4, 0.1, 0.5].forEach((dx, i) => {
        ctx!.beginPath();
        ctx!.arc(
          ballX + dx * ballR,
          ballY + (i - 1) * ballR * 0.35,
          ballR * 0.09,
          0,
          Math.PI * 2,
        );
        ctx!.fill();
      });
    }

    function getProgress() {
      const rect = track!.getBoundingClientRect();
      const total = rect.height - window.innerHeight;
      if (total <= 0) return 0;
      return Math.min(Math.max(-rect.top / total, 0), 1);
    }

    let ticking = false;
    function onScroll() {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(() => {
        draw(getProgress());
        ticking = false;
      });
    }

    resize();
    if (reduceMotion) {
      draw(0.1);
    } else {
      draw(getProgress());
      window.addEventListener("scroll", onScroll, { passive: true });
    }
    function onResize() {
      resize();
      draw(reduceMotion ? 0.1 : getProgress());
    }
    window.addEventListener("resize", onResize);

    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onResize);
    };
  }, []);

  return (
    <section ref={trackRef} className="pch-track">
      <div className="pch-pin">
        <canvas ref={canvasRef} className="pch-canvas" aria-hidden="true" />
        <div className="ls-hero-scrim" aria-hidden="true" />
        <div className="ls-hero-inner">
          <p className="eyebrow ls-hero-eyebrow">
            <BadgeCheck aria-hidden="true" size={16} /> Trusted competition
            records
          </p>
          <h1 className="ls-hero-title">Play. Confirm. Climb.</h1>
          <p className="ls-hero-lede">
            Run fair club events, confirm every result, and build one
            auditable pickleball record that follows you everywhere.
          </p>
          <div className="ls-hero-actions">
            <Link href="/register" className="button">
              Create your player account
              <ArrowRight aria-hidden="true" size={18} />
            </Link>
            <Link href="/leaderboards" className="button button-secondary">
              Explore the rankings
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
