import type { ReactNode } from "react";
import { ShieldCheck } from "lucide-react";

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="auth-layout courtside-auth">
      <aside className="auth-promise" aria-label="Account trust promise">
        <span className="feature-icon">
          <ShieldCheck aria-hidden="true" />
        </span>
        <p className="eyebrow">One player. One record.</p>
        <h2>
          Find your game.
          <br />
          Make it count.
        </h2>
        <p>A place to play, a fair match, and a record that grows with you.</p>
        <div className="courtside-court" aria-hidden="true">
          <span />
        </div>
        <ul className="courtside-promises">
          <li>Balanced matchmaking</li>
          <li>Live court queues</li>
          <li>Your competitive record</li>
        </ul>
      </aside>
      <div className="auth-panel">{children}</div>
    </div>
  );
}
