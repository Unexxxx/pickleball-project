"use client";

import {
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type KeyboardEvent,
  type ReactNode,
} from "react";
import { createPortal } from "react-dom";

/**
 * Full-screen photo view used across the site. A tap anywhere (or Escape)
 * closes it. `actions` (e.g. owner-only "Change photo") sit top-right and
 * don't close the viewer when pressed. Opening fades and scales in (200ms,
 * ease-out); it's an occasional action, so a short entrance is worth it.
 */
export function ImageViewer({
  src,
  alt,
  onClose,
  actions,
}: {
  src: string;
  alt: string;
  onClose: () => void;
  actions?: ReactNode;
}) {
  // Latest onClose without re-running the effect (which would re-capture
  // the already-locked overflow and leave scrolling locked after close).
  const closeRef = useRef(onClose);
  useEffect(() => {
    closeRef.current = onClose;
  });
  useEffect(() => {
    const onKey = (event: globalThis.KeyboardEvent) => {
      if (event.key === "Escape") closeRef.current();
    };
    const { overflow } = document.body.style;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = overflow;
      window.removeEventListener("keydown", onKey);
    };
  }, []);

  return createPortal(
    <div
      className="image-viewer"
      role="dialog"
      aria-modal="true"
      aria-label={alt}
      onClick={(event) => {
        event.stopPropagation();
        onClose();
      }}
    >
      {/* eslint-disable-next-line @next/next/no-img-element -- full-size user upload from public storage */}
      <img src={src} alt={alt} className="image-viewer__image" />
      {actions ? (
        <div
          className="image-viewer__actions"
          onClick={(event) => event.stopPropagation()}
        >
          {actions}
        </div>
      ) : null}
      <p className="image-viewer__hint">Tap anywhere to close</p>
    </div>,
    document.body,
  );
}

/**
 * Makes an existing photo element viewable without changing its styles: the
 * same element gets button semantics when there's an image to show. Without
 * an image (initial-letter placeholder) it stays a plain labelled image.
 */
export function ViewablePhoto({
  as: Tag = "div",
  src,
  alt,
  className,
  style,
  children,
  actions,
}: {
  as?: "div" | "span";
  src: string | null | undefined;
  alt: string;
  className: string;
  style?: CSSProperties;
  children?: ReactNode;
  /** Rendered in the viewer; receives a function that closes it. */
  actions?: (close: () => void) => ReactNode;
}) {
  // The element that opened the viewer; focus returns to it on close.
  const [opener, setOpener] = useState<HTMLElement | null>(null);
  const close = () => {
    opener?.focus();
    setOpener(null);
  };

  if (!src)
    return (
      <Tag className={className} style={style} role="img" aria-label={alt}>
        {children}
      </Tag>
    );

  return (
    <>
      <Tag
        className={`${className} is-viewable`}
        style={style}
        role="button"
        tabIndex={0}
        aria-label={`View ${alt}`}
        onClick={(event) => {
          event.preventDefault();
          event.stopPropagation();
          setOpener(event.currentTarget);
        }}
        onKeyDown={(event: KeyboardEvent) => {
          if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            setOpener(event.currentTarget as HTMLElement);
          }
        }}
      >
        {children}
      </Tag>
      {opener ? (
        <ImageViewer
          src={src}
          alt={alt}
          onClose={close}
          actions={actions?.(close)}
        />
      ) : null}
    </>
  );
}
