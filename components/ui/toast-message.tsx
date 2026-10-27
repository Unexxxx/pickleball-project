"use client";

import { useEffect } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";

/**
 * A short error/status message pinned to the bottom of the screen. Portaled
 * so it stays visible when the control that raised it fades or moves, and
 * dismissed automatically after 6 seconds.
 */
export function ToastMessage({
  message,
  onDismiss,
}: {
  message: string;
  onDismiss: () => void;
}) {
  useEffect(() => {
    if (!message) return;
    const timer = window.setTimeout(onDismiss, 6000);
    return () => window.clearTimeout(timer);
  }, [message, onDismiss]);

  if (!message) return null;
  return createPortal(
    <div className="club-toast" role="alert">
      <span>{message}</span>
      <button
        type="button"
        className="club-toast__close"
        aria-label="Dismiss"
        onClick={onDismiss}
      >
        <X aria-hidden="true" size={16} />
      </button>
    </div>,
    document.body,
  );
}
