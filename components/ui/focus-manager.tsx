"use client";
import { useEffect, useRef, type ReactNode } from "react";
export function FocusManager({
  children,
  active = true,
}: {
  children: ReactNode;
  active?: boolean;
}) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (active) ref.current?.focus();
  }, [active]);
  return (
    <div ref={ref} tabIndex={-1}>
      {children}
    </div>
  );
}
