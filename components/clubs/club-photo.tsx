"use client";

import { useRef, useState } from "react";
import { ClubMediaButton } from "@/components/clubs/club-media-button";
import { ImageViewer } from "@/components/ui/image-viewer";

/**
 * The club's cover or profile picture. Tapping a photo opens it full screen;
 * a tap anywhere (or Escape) closes it. Owners/organizers get the change and
 * remove controls on hover/focus over the photo; on touch screens, which have
 * no hover, those controls live in the viewer instead.
 */
export function ClubPhoto({
  kind,
  url,
  name,
  media,
}: {
  kind: "profile" | "background";
  url: string | null;
  name: string;
  media?: { clubId: string; clubSlug: string };
}) {
  const [open, setOpen] = useState(false);
  const trigger = useRef<HTMLButtonElement>(null);
  const label =
    kind === "profile" ? `${name} club picture` : `${name} cover photo`;

  const visual =
    kind === "background" ? (
      <span
        className="club-cover__image"
        style={url ? { backgroundImage: `url(${url})` } : undefined}
      />
    ) : (
      <span
        className="club-profile-mark"
        style={url ? { backgroundImage: `url(${url})` } : undefined}
      >
        {url ? null : name.charAt(0).toUpperCase()}
      </span>
    );

  return (
    <div
      className={`club-photo club-photo--${kind}${url ? "" : " club-photo--empty"}`}
    >
      {url ? (
        <button
          ref={trigger}
          type="button"
          className="club-photo__open"
          aria-label={`View ${label}`}
          onClick={() => setOpen(true)}
        >
          {visual}
        </button>
      ) : (
        <span role="img" aria-label={label} className="club-photo__open">
          {visual}
        </span>
      )}
      {media ? (
        <ClubMediaButton {...media} kind={kind} hasImage={Boolean(url)} />
      ) : null}

      {open && url ? (
        <ImageViewer
          src={url}
          alt={label}
          onClose={() => {
            setOpen(false);
            trigger.current?.focus();
          }}
          actions={
            media ? (
              <ClubMediaButton
                {...media}
                kind={kind}
                hasImage
                placement="viewer"
                onChanged={() => setOpen(false)}
              />
            ) : undefined
          }
        />
      ) : null}
    </div>
  );
}
