"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import { Camera, LoaderCircle, Trash2, X } from "lucide-react";
import { setClubMedia } from "@/lib/actions/clubs";
import { createClient } from "@/lib/supabase/client";

const extensionByType: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};
// Matches the club-media bucket's limit.
const MAX_BYTES = 10 * 1024 * 1024;

/**
 * Upload / remove control for the club's profile picture or cover. Shown only
 * to owners and organizers; storage policies and set_club_media() enforce it.
 */
export function ClubMediaButton({
  clubId,
  clubSlug,
  kind,
  hasImage,
  placement = "overlay",
  onChanged,
}: {
  clubId: string;
  clubSlug: string;
  kind: "profile" | "background";
  hasImage: boolean;
  /** "overlay" sits on the photo (hover); "viewer" is labelled, in the viewer. */
  placement?: "overlay" | "viewer";
  /** Called after a successful change or removal. */
  onChanged?: () => void;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const noun = kind === "profile" ? "club picture" : "cover photo";

  // Errors show as a toast: the controls sit in corners of a clipped card.
  useEffect(() => {
    if (!message) return;
    const timer = window.setTimeout(() => setMessage(""), 6000);
    return () => window.clearTimeout(timer);
  }, [message]);

  async function save(path: string | null, uploaded: string | null) {
    const result = await setClubMedia({ clubId, clubSlug, kind, path });
    if (!result.ok) {
      if (uploaded)
        await createClient().storage.from("club-media").remove([uploaded]);
      setMessage(result.error.message);
      return;
    }
    router.refresh();
    onChanged?.();
  }
  const labelled = placement === "viewer" || kind === "background";
  const changeLabel = busy
    ? "Uploading…"
    : hasImage
      ? kind === "profile"
        ? "Change picture"
        : "Change cover"
      : kind === "profile"
        ? "Add picture"
        : "Add cover";

  return (
    <div className={`club-media club-media--${kind} club-media--${placement}`}>
      <label
        className="club-media__button"
        aria-disabled={busy || undefined}
        title={hasImage ? `Change ${noun}` : `Add ${noun}`}
      >
        {busy ? (
          <LoaderCircle
            className="club-media__spin"
            aria-hidden="true"
            size={16}
          />
        ) : (
          <Camera aria-hidden="true" size={16} />
        )}
        {/* On the small club picture the button is icon-only. */}
        {labelled ? <span>{changeLabel}</span> : null}
        <input
          className="sr-only"
          type="file"
          accept="image/jpeg,image/png,image/webp"
          aria-label={hasImage ? `Change ${noun}` : `Add ${noun}`}
          disabled={busy}
          onChange={async (event) => {
            const file = event.target.files?.[0];
            event.target.value = "";
            if (!file) return;
            setMessage("");
            const extension = extensionByType[file.type];
            if (!extension || file.size > MAX_BYTES) {
              setMessage("Choose a JPG, PNG or WebP image up to 10 MB.");
              return;
            }
            setBusy(true);
            const path = `${clubId}/${kind}-${crypto.randomUUID()}.${extension}`;
            const { error } = await createClient()
              .storage.from("club-media")
              .upload(path, file, { contentType: file.type });
            if (error) setMessage(`The ${noun} could not be uploaded.`);
            else await save(path, path);
            setBusy(false);
          }}
        />
      </label>
      {hasImage && !busy ? (
        <button
          type="button"
          className="club-media__remove"
          aria-label={labelled ? undefined : `Remove ${noun}`}
          title={`Remove ${noun}`}
          onClick={async () => {
            // The file is deleted, so confirm first.
            if (!window.confirm(`Remove the ${noun}?`)) return;
            setBusy(true);
            setMessage("");
            await save(null, null);
            setBusy(false);
          }}
        >
          <Trash2 aria-hidden="true" size={15} />
          {placement === "viewer" ? <span>Remove</span> : null}
        </button>
      ) : null}
      {/* Portaled so it stays visible when the hover controls fade out. */}
      {message
        ? createPortal(
            <div className="club-toast" role="alert">
              <span>{message}</span>
              <button
                type="button"
                className="club-toast__close"
                aria-label="Dismiss"
                onClick={() => setMessage("")}
              >
                <X aria-hidden="true" size={16} />
              </button>
            </div>,
            document.body,
          )
        : null}
    </div>
  );
}
