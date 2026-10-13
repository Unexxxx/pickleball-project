import type { ReactNode } from "react";
import { Check } from "lucide-react";

const promises = [
  "Balanced matchmaking",
  "Live court queues",
  "Your competitive record",
];

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="auth-shell">
      <aside className="auth-hero" aria-label="Account trust promise">
        <p className="auth-pill auth-reveal" style={{ "--i": 0 } as never}>
          <span aria-hidden="true" /> One player. One record.
        </p>
        <h2 className="auth-reveal" style={{ "--i": 1 } as never}>
          Find your game.
          <br />
          <em>Make it count.</em>
        </h2>
        <p className="auth-lede auth-reveal" style={{ "--i": 2 } as never}>
          A place to play, a fair match, and a record that grows with you.
        </p>

        {/* Top-down court at true proportions: 44 ft x 20 ft, kitchen (NVZ)
            lines 7 ft either side of the net, center service lines from each
            baseline to its kitchen line. */}
        <svg
          className="auth-court"
          viewBox="0 0 480 240"
          fill="none"
          aria-hidden="true"
        >
          <rect
            className="auth-court-kitchen"
            x="166"
            y="14"
            width="148"
            height="211"
          />
          <g className="auth-court-lines">
            <rect x="8" y="14" width="464" height="211" />
            <line x1="166" y1="14" x2="166" y2="225" />
            <line x1="314" y1="14" x2="314" y2="225" />
            <line x1="8" y1="119.5" x2="166" y2="119.5" />
            <line x1="314" y1="119.5" x2="472" y2="119.5" />
          </g>
          <line className="auth-court-net" x1="240" y1="5" x2="240" y2="234" />
          <circle className="auth-court-ball" cx="396" cy="66" r="8" />
        </svg>

        <ul className="auth-promises">
          {promises.map((text, index) => (
            <li
              key={text}
              className="auth-reveal"
              style={{ "--i": 3 + index } as never}
            >
              <Check aria-hidden="true" size={16} strokeWidth={3} />
              {text}
            </li>
          ))}
        </ul>
      </aside>
      <div className="auth-panel auth-reveal" style={{ "--i": 1 } as never}>
        {children}
      </div>
    </div>
  );
}
