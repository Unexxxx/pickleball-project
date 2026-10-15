import type { Metadata } from "next";
import type { ReactNode } from "react";

// Join links carry private event codes shared by QR; keep them out of search.
export const metadata: Metadata = { robots: { index: false, follow: false } };

export default function JoinLayout({ children }: { children: ReactNode }) {
  return children;
}
