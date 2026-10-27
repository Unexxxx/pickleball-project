"use client";

import { useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { Facebook, Mail, MessageCircle, Pencil, Phone } from "lucide-react";
import { setClubContacts } from "@/lib/actions/clubs";

export type ClubContactFields = {
  email: string | null;
  facebook: string | null;
  phone: string | null;
};

const facebookLabel = (url: string) =>
  url.replace(/^https?:\/\/(www\.|m\.|web\.)?/i, "").replace(/\/$/, "");

/**
 * How to reach the club: email, Facebook page and phone, each optional and
 * tappable (mailto:, the page, tel:). Club admins edit them in place; the
 * server action and database re-check the role and every format.
 */
export function ClubContact({
  clubId,
  clubSlug,
  contacts,
  legacyContact,
  canEdit,
  heading,
}: {
  clubId: string;
  clubSlug: string;
  /** Null until the structured-contacts migration is applied. */
  contacts: ClubContactFields | null;
  /** The old free-text line, shown read-only before that migration. */
  legacyContact: string | null;
  canEdit: boolean;
  /**
   * When given, this component draws the panel header itself so the
   * Edit/Add contacts button can sit in its top-right corner.
   */
  heading?: { id: string; text: string };
}) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState({ email: "", facebook: "", phone: "" });
  const [errors, setErrors] = useState<Record<string, string[] | undefined>>(
    {},
  );
  const [message, setMessage] = useState("");
  const [saving, setSaving] = useState(false);

  // Puts the (optional) edit button in the header, or below the body.
  const frame = (body: ReactNode, action: ReactNode = null) =>
    heading ? (
      <>
        <header className="ph-panel__head">
          <h2 id={heading.id}>{heading.text}</h2>
          {action}
        </header>
        {body}
      </>
    ) : (
      <>
        {body}
        {action}
      </>
    );

  if (!contacts)
    return frame(
      legacyContact ? (
        <div className="club-contact">
          <MessageCircle aria-hidden="true" size={18} />
          <span>{legacyContact}</span>
        </div>
      ) : (
        <p className="club-contact__empty">
          This club hasn&apos;t published contacts yet.
        </p>
      ),
    );

  const startEditing = () => {
    setDraft({
      email: contacts.email ?? "",
      facebook: contacts.facebook ?? "",
      phone: contacts.phone ?? "",
    });
    setErrors({});
    setMessage("");
    setEditing(true);
  };

  if (editing)
    return frame(
      <form
        className="club-contact-form"
        noValidate
        onSubmit={async (event) => {
          event.preventDefault();
          setSaving(true);
          setErrors({});
          setMessage("");
          const result = await setClubContacts({ clubId, clubSlug, ...draft });
          setSaving(false);
          if (!result.ok) {
            setErrors(result.error.fields ?? {});
            setMessage(result.error.message);
            return;
          }
          setEditing(false);
          router.refresh();
        }}
      >
        {(
          [
            ["email", "Email", "email", "club@example.com", Mail],
            [
              "facebook",
              "Facebook page",
              "url",
              "facebook.com/yourclub",
              Facebook,
            ],
            [
              "phone",
              "Contact number",
              "text",
              "0917 123 4567 or Viber/WhatsApp",
              Phone,
            ],
          ] as const
        ).map(([field, label, type, placeholder, Icon]) => (
          <label key={field} className="club-contact-field">
            <span>
              <Icon aria-hidden="true" size={15} /> {label}
            </span>
            <input
              type={type}
              value={draft[field]}
              placeholder={placeholder}
              maxLength={
                field === "email" ? 254 : field === "phone" ? 100 : 200
              }
              aria-invalid={errors[field] ? true : undefined}
              aria-describedby={errors[field] ? `${field}-error` : undefined}
              onChange={(event) =>
                setDraft((d) => ({ ...d, [field]: event.target.value }))
              }
            />
            {errors[field] ? (
              <small
                id={`${field}-error`}
                className="club-contact-field__error"
              >
                {errors[field]![0]}
              </small>
            ) : null}
          </label>
        ))}
        <p className="field-help">
          Shown publicly on the club page. Leave a field blank to hide it.
        </p>
        <div className="club-contact-actions">
          <button type="submit" disabled={saving}>
            {saving ? "Saving…" : "Save contacts"}
          </button>
          <button
            type="button"
            className="button-quiet profile-cancel"
            disabled={saving}
            onClick={() => setEditing(false)}
          >
            Cancel
          </button>
        </div>
        {message && !Object.keys(errors).length ? (
          <p role="alert">{message}</p>
        ) : null}
      </form>,
    );

  const items = [
    contacts.email && {
      key: "email",
      Icon: Mail,
      href: `mailto:${contacts.email}`,
      label: contacts.email,
      external: false,
    },
    contacts.facebook && {
      key: "facebook",
      Icon: Facebook,
      href: contacts.facebook,
      label: facebookLabel(contacts.facebook),
      external: true,
    },
    contacts.phone && {
      key: "phone",
      Icon: Phone,
      // Free text: tappable to call only when it actually has a number.
      href: /\d{3}/.test(contacts.phone)
        ? `tel:${contacts.phone.replace(/[^\d+]/g, "")}`
        : null,
      label: contacts.phone,
      external: false,
    },
  ].filter(Boolean) as {
    key: string;
    Icon: typeof Mail;
    href: string | null;
    label: string;
    external: boolean;
  }[];

  const editButton = canEdit ? (
    <button
      type="button"
      className="profile-link-button club-contact__edit"
      onClick={startEditing}
    >
      <Pencil aria-hidden="true" size={14} />{" "}
      {items.length ? "Edit contacts" : "Add contacts"}
    </button>
  ) : null;

  return frame(
    <div className="club-contacts">
      {items.length ? (
        <ul className="club-contacts__list">
          {items.map(({ key, Icon, href, label, external }) => (
            <li key={key}>
              {href ? (
                <a
                  className="club-contact"
                  href={href}
                  {...(external
                    ? { target: "_blank", rel: "noopener noreferrer nofollow" }
                    : {})}
                >
                  <Icon aria-hidden="true" size={18} />
                  <span>{label}</span>
                </a>
              ) : (
                <span className="club-contact">
                  <Icon aria-hidden="true" size={18} />
                  <span>{label}</span>
                </span>
              )}
            </li>
          ))}
        </ul>
      ) : (
        <p className="club-contact__empty">
          {canEdit
            ? "Add an email, Facebook page or number so players can reach the club."
            : "This club hasn't published contacts yet."}
        </p>
      )}
    </div>,
    editButton,
  );
}
