"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { Crown, Menu, ShieldCheck, ShieldOff, UserMinus } from "lucide-react";
import type { ClubRole } from "@/lib/auth/authorization";

/** "organizer" is how the database stores Admin. */
export type MenuRole = "organizer" | "member";

/**
 * The per-member menu on the Members tab: owners make a member an admin or
 * remove an admin's role; admins remove members (removing an admin takes an owner). The
 * database re-checks both.
 */
export function MemberMenu({
  name,
  role,
  canChangeRole,
  canRemove,
  canTransfer = false,
  busy,
  onChangeRole,
  onRemove,
  onTransfer,
}: {
  name: string;
  role: ClubRole;
  canChangeRole: boolean;
  canRemove: boolean;
  busy: boolean;
  onChangeRole: (role: MenuRole) => void;
  onRemove: () => void;
  /** Owners only, on an admin's row. */
  canTransfer?: boolean;
  onTransfer?: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [confirming, setConfirming] = useState<"remove" | "transfer" | null>(
    null,
  );
  const wrapRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  function close(returnFocus = true) {
    setOpen(false);
    setConfirming(null);
    if (returnFocus) triggerRef.current?.focus();
  }

  // Open upward when the menu would run past the bottom of the screen and
  // there is more room above. Measured before paint, so it never jumps.
  useLayoutEffect(() => {
    const menu = menuRef.current;
    const trigger = triggerRef.current?.getBoundingClientRect();
    if (!open || !menu || !trigger) return;
    const below = window.innerHeight - trigger.bottom;
    menu.classList.toggle(
      "member-menu__panel--up",
      below < menu.offsetHeight + 16 && trigger.top > below,
    );
  }, [open, confirming]);

  useEffect(() => {
    if (!open) return;
    menuRef.current
      ?.querySelector<HTMLButtonElement>("button:not(:disabled)")
      ?.focus();
    const onPointer = (event: PointerEvent) => {
      if (!wrapRef.current?.contains(event.target as Node)) {
        setOpen(false);
        setConfirming(null);
      }
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpen(false);
        setConfirming(null);
        triggerRef.current?.focus();
      }
    };
    document.addEventListener("pointerdown", onPointer);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onPointer);
      document.removeEventListener("keydown", onKey);
    };
  }, [open, confirming]);

  return (
    <div className="member-menu" ref={wrapRef}>
      <button
        ref={triggerRef}
        type="button"
        className="member-menu__trigger"
        aria-label={`Options for ${name}`}
        aria-haspopup="menu"
        aria-expanded={open}
        disabled={busy}
        onClick={() => (open ? close() : setOpen(true))}
      >
        <Menu aria-hidden="true" size={18} />
      </button>
      {open ? (
        <div
          ref={menuRef}
          className="member-menu__panel"
          role="menu"
          aria-label={`Options for ${name}`}
        >
          {confirming ? (
            <div className="member-menu__confirm">
              {confirming === "transfer" ? (
                <p>
                  Make <strong>{name}</strong> the club owner? You&apos;ll
                  become an admin, and only they can give ownership back.
                </p>
              ) : (
                <p>
                  Remove <strong>{name}</strong> from the club? They can ask to
                  join again.
                </p>
              )}
              <div>
                <button
                  type="button"
                  role="menuitem"
                  className={
                    confirming === "transfer"
                      ? undefined
                      : "member-menu__danger-button"
                  }
                  onClick={() => {
                    const transfer = confirming === "transfer";
                    close(false);
                    if (transfer) onTransfer?.();
                    else onRemove();
                  }}
                >
                  {confirming === "transfer" ? "Transfer" : "Remove"}
                </button>
                <button
                  type="button"
                  role="menuitem"
                  className="button-quiet"
                  onClick={() => setConfirming(null)}
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <>
              {canChangeRole ? (
                <button
                  type="button"
                  role="menuitem"
                  className="member-menu__item"
                  onClick={() => {
                    close();
                    onChangeRole(role === "organizer" ? "member" : "organizer");
                  }}
                >
                  {role === "organizer" ? (
                    <span>
                      <strong>
                        <ShieldOff aria-hidden="true" size={16} /> Remove admin
                        role
                      </strong>
                      <span>Goes back to being a regular member</span>
                    </span>
                  ) : (
                    <span>
                      <strong>
                        <ShieldCheck aria-hidden="true" size={16} /> Make admin
                      </strong>
                      <span>Can create events and run the club</span>
                    </span>
                  )}
                </button>
              ) : null}
              {canTransfer && role === "organizer" ? (
                <button
                  type="button"
                  role="menuitem"
                  className="member-menu__item"
                  onClick={() => setConfirming("transfer")}
                >
                  <span>
                    <strong>
                      <Crown aria-hidden="true" size={16} /> Transfer ownership
                    </strong>
                    <span>They become the owner; you become an admin</span>
                  </span>
                </button>
              ) : null}
              {canRemove ? (
                <button
                  type="button"
                  role="menuitem"
                  className="member-menu__item member-menu__item--danger"
                  onClick={() => setConfirming("remove")}
                >
                  <span>
                    <strong>
                      <UserMinus aria-hidden="true" size={16} /> Remove from
                      club
                    </strong>
                  </span>
                </button>
              ) : null}
            </>
          )}
        </div>
      ) : null}
    </div>
  );
}
