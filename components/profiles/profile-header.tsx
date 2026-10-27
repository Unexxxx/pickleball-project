"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Camera, LogOut, Pencil, Trash2, Trophy } from "lucide-react";
import { signOut, updateMyPlayerProfile } from "@/lib/actions/auth";
import { createClient } from "@/lib/supabase/client";
import { ViewablePhoto } from "@/components/ui/image-viewer";

const extensionByType: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

/**
 * The player's identity block. Visitors see it read-only; the owner edits the
 * same name and photo in place (no second copy of either). The server action
 * only ever updates the caller's own player row, so hiding the controls is
 * presentation, not permission.
 */
export function ProfileHeader({
  name,
  slug,
  avatarUrl,
  rank,
  owner,
}: {
  name: string;
  slug: string;
  avatarUrl?: string | null;
  rank?: number | null;
  owner?: { avatarPath: string | null; version: number; startEditing: boolean };
}) {
  const router = useRouter();
  const [editing, setEditing] = useState(owner?.startEditing ?? false);
  const [draftName, setDraftName] = useState(name);
  const [file, setFile] = useState<File | null>(null);
  const [removeAvatar, setRemoveAvatar] = useState(false);
  const [preview, setPreview] = useState<string | null>(avatarUrl ?? null);
  const [message, setMessage] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    return () => {
      if (preview?.startsWith("blob:")) URL.revokeObjectURL(preview);
    };
  }, [preview]);

  function cancel() {
    setEditing(false);
    setDraftName(name);
    setFile(null);
    setRemoveAvatar(false);
    setPreview(avatarUrl ?? null);
    setMessage("");
  }

  async function save(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!owner) return;
    setSaving(true);
    setMessage("");
    const supabase = createClient();
    let nextAvatarPath = removeAvatar ? null : owner.avatarPath;
    let uploadedPath: string | null = null;

    if (file) {
      const extension = extensionByType[file.type];
      if (!extension || file.size > 5 * 1024 * 1024) {
        setMessage("Choose a JPG, PNG, or WebP image up to 5 MB.");
        setSaving(false);
        return;
      }
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        setMessage("Your session expired. Log in and try again.");
        setSaving(false);
        return;
      }
      uploadedPath = `${user.id}/${crypto.randomUUID()}.${extension}`;
      const { error } = await supabase.storage
        .from("avatars")
        .upload(uploadedPath, file, { contentType: file.type });
      if (error) {
        setMessage("The profile photo could not be uploaded.");
        setSaving(false);
        return;
      }
      nextAvatarPath = uploadedPath;
    }

    const result = await updateMyPlayerProfile({
      displayName: draftName,
      avatarPath: nextAvatarPath,
      expectedVersion: owner.version,
      idempotencyKey: crypto.randomUUID(),
    });
    if (!result.ok) {
      if (uploadedPath)
        await supabase.storage.from("avatars").remove([uploadedPath]);
      setMessage(result.error.message);
      setSaving(false);
      return;
    }

    if (owner.avatarPath && owner.avatarPath !== nextAvatarPath)
      await supabase.storage.from("avatars").remove([owner.avatarPath]);
    setFile(null);
    setRemoveAvatar(false);
    setSaving(false);
    setEditing(false);
    setMessage("Profile updated.");
    router.replace(`/players/${slug}`, { scroll: false });
    router.refresh();
  }

  const shownName = editing ? draftName || name : name;
  const avatar = (
    <span
      className="profile-avatar profile-avatar--header"
      role="img"
      aria-label={`${shownName}'s profile photo`}
      style={preview ? { backgroundImage: `url(${preview})` } : undefined}
    >
      {!preview ? shownName.charAt(0).toUpperCase() : null}
    </span>
  );

  const startEditing = () => {
    setDraftName(name);
    setPreview(avatarUrl ?? null);
    setMessage("");
    setEditing(true);
  };

  // View mode: anyone can open the photo full screen; only the owner gets
  // an "Edit profile" shortcut inside the viewer.
  const viewableAvatar = (
    <ViewablePhoto
      as="span"
      src={avatarUrl}
      alt={`${name}'s profile photo`}
      className="profile-avatar profile-avatar--header"
      style={avatarUrl ? { backgroundImage: `url(${avatarUrl})` } : undefined}
      actions={
        owner
          ? (close) => (
              <button
                type="button"
                className="image-viewer__button"
                onClick={() => {
                  close();
                  startEditing();
                }}
              >
                <Pencil aria-hidden="true" size={16} /> Edit profile
              </button>
            )
          : undefined
      }
    >
      {!avatarUrl ? name.charAt(0).toUpperCase() : null}
    </ViewablePhoto>
  );

  const rankChip = (
    <Link className="profile-rank" href="/leaderboards">
      <Trophy aria-hidden="true" size={16} />
      {rank ? `Rank #${rank}` : "Not ranked yet"}
    </Link>
  );

  if (!owner || !editing)
    return (
      <header className="profile-header">
        <div className="profile-header__identity">
          {viewableAvatar}
          <div>
            <h1 className="text-3xl font-bold">{name}</h1>
            <p>@{slug}</p>
          </div>
        </div>
        <div className="profile-header__side">
          {rankChip}
          {owner ? (
            <>
              <button
                type="button"
                className="button button-secondary profile-edit-toggle"
                onClick={startEditing}
              >
                <Pencil aria-hidden="true" size={16} /> Edit profile
              </button>
              <form action={signOut}>
                <button type="submit" className="button-quiet">
                  <LogOut aria-hidden="true" size={16} /> Log out
                </button>
              </form>
            </>
          ) : null}
        </div>
        {message ? (
          <p className="profile-header__status" role="status">
            {message}
          </p>
        ) : null}
      </header>
    );

  return (
    <header className="profile-header profile-header--editing">
      <form className="profile-header__form" onSubmit={save}>
        <div className="profile-header__identity">
          <div className="profile-avatar-edit">
            {avatar}
            <label className="profile-avatar-edit__button">
              <Camera aria-hidden="true" size={16} />
              <input
                className="sr-only"
                type="file"
                accept="image/jpeg,image/png,image/webp"
                aria-label="Change photo"
                onChange={(event) => {
                  const selected = event.target.files?.[0] ?? null;
                  setFile(selected);
                  setPreview(
                    selected
                      ? URL.createObjectURL(selected)
                      : (avatarUrl ?? null),
                  );
                  setRemoveAvatar(false);
                }}
              />
            </label>
          </div>
          <div className="profile-header__fields">
            <label className="sr-only" htmlFor="profile-display-name">
              Display name
            </label>
            <input
              id="profile-display-name"
              className="profile-name-input"
              name="displayName"
              value={draftName}
              minLength={2}
              maxLength={80}
              required
              autoComplete="name"
              autoFocus
              onChange={(event) => setDraftName(event.target.value)}
            />
            <p>
              @{slug} · Use the real name players know you by.
              {preview ? (
                <>
                  {" "}
                  <button
                    type="button"
                    className="profile-link-button"
                    onClick={() => {
                      setFile(null);
                      setPreview(null);
                      setRemoveAvatar(true);
                    }}
                  >
                    <Trash2 aria-hidden="true" size={14} /> Remove photo
                  </button>
                </>
              ) : null}
            </p>
          </div>
        </div>
        <div className="profile-header__side">
          <button type="submit" disabled={saving}>
            {saving ? "Saving…" : "Save profile"}
          </button>
          <button
            type="button"
            className="button-quiet profile-cancel"
            onClick={cancel}
            disabled={saving}
          >
            Cancel
          </button>
        </div>
        {message ? (
          <p className="profile-header__status" role="alert">
            {message}
          </p>
        ) : null}
      </form>
    </header>
  );
}
