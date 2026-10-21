"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { MessageCircle, Pencil } from "lucide-react";
import { setClubContact } from "@/lib/actions/clubs";

const looksLikeUrl = (value: string) =>
  /^(https?:\/\/)?[\w-]+(\.[\w-]+)+(\/\S*)?$/i.test(value);

/**
 * The club's published contact. Owners and organizers edit it in place; the
 * server action re-checks their role, so `canEdit` only controls the button.
 */
export function ClubContact({
  clubId,
  clubSlug,
  contact,
  canEdit,
}: {
  clubId: string;
  clubSlug: string;
  contact: string | null;
  canEdit: boolean;
}) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(contact ?? "");
  const [message, setMessage] = useState("");
  const [saving, setSaving] = useState(false);

  if (editing)
    return (
      <form
        className="club-contact-form"
        onSubmit={async (event) => {
          event.preventDefault();
          setSaving(true);
          setMessage("");
          const result = await setClubContact({
            clubId,
            clubSlug,
            contact: draft,
          });
          setSaving(false);
          if (!result.ok) {
            setMessage(result.error.message);
            return;
          }
          setEditing(false);
          router.refresh();
        }}
      >
        <label htmlFor="club-contact-input">How players can reach you</label>
        <input
          id="club-contact-input"
          value={draft}
          maxLength={200}
          placeholder="e.g. facebook.com/thedinklab or 0917 123 4567"
          autoFocus
          onChange={(event) => setDraft(event.target.value)}
        />
        <p className="field-help">
          Shown publicly on the club page. Leave blank to remove it.
        </p>
        <div className="club-contact-actions">
          <button type="submit" disabled={saving}>
            {saving ? "Saving…" : "Save contact"}
          </button>
          <button
            type="button"
            className="button-quiet profile-cancel"
            disabled={saving}
            onClick={() => {
              setDraft(contact ?? "");
              setMessage("");
              setEditing(false);
            }}
          >
            Cancel
          </button>
        </div>
        {message ? <p role="alert">{message}</p> : null}
      </form>
    );

  return (
    <div className="club-contact">
      <MessageCircle aria-hidden="true" size={18} />
      {contact ? (
        looksLikeUrl(contact) ? (
          <a
            href={
              /^https?:\/\//i.test(contact) ? contact : `https://${contact}`
            }
            target="_blank"
            rel="noopener noreferrer nofollow"
          >
            {contact}
          </a>
        ) : (
          <span>{contact}</span>
        )
      ) : (
        <span className="club-contact__empty">
          {canEdit
            ? "Add a contact so players know how to reach the club."
            : "This club hasn't published a contact yet."}
        </span>
      )}
      {canEdit ? (
        <button
          type="button"
          className="profile-link-button club-contact__edit"
          onClick={() => {
            setDraft(contact ?? "");
            setEditing(true);
          }}
        >
          <Pencil aria-hidden="true" size={14} /> {contact ? "Edit" : "Add"}
        </button>
      ) : null}
    </div>
  );
}
