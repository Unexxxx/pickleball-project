import type { ReactNode } from "react";
import { ShieldCheck } from "lucide-react";

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="auth-layout">
      <aside className="auth-promise" aria-label="Account trust promise">
        <span className="feature-icon">
          <ShieldCheck aria-hidden="true" />
        </span>
        <p className="eyebrow">One player. One record.</p>
        <h2>Your identity makes competition trustworthy.</h2>
        <p>
          Verified accounts prevent guest, ghost, anonymous, and duplicate
          ranked players.
        </p>
      </aside>
      <div className="auth-panel">{children}</div>
    </div>
  );
}
