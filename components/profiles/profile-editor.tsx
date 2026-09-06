"use client";

import { useEffect, useState } from "react";
import { Camera, Save, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { updateMyPlayerProfile } from "@/lib/actions/auth";
import { createClient } from "@/lib/supabase/client";

const extensionByType: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

export function ProfileEditor({
  displayName,
  avatarPath,
  avatarUrl,
  version,
}: {
  displayName: string;
  avatarPath: string | null;
  avatarUrl: string | null;
  version: number;
}) {
  const router = useRouter();
  const [name, setName] = useState(displayName);
  const [file, setFile] = useState<File | null>(null);
  const [removeAvatar, setRemoveAvatar] = useState(false);
  const [preview, setPreview] = useState<string | null>(avatarUrl);
  const [message, setMessage] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    return () => {
      if (preview?.startsWith("blob:")) URL.revokeObjectURL(preview);
    };
  }, [preview]);

  return (
    <form
      className="profile-editor"
      onSubmit={async (event) => {
        event.preventDefault();
        setSaving(true);
        setMessage("");
        const supabase = createClient();
        let nextAvatarPath = removeAvatar ? null : avatarPath;
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
          displayName: name,
          avatarPath: nextAvatarPath,
          expectedVersion: version,
          idempotencyKey: crypto.randomUUID(),
        });
        if (!result.ok) {
          if (uploadedPath)
            await supabase.storage.from("avatars").remove([uploadedPath]);
          setMessage(result.error.message);
          setSaving(false);
          return;
        }

        if (avatarPath && avatarPath !== nextAvatarPath)
          await supabase.storage.from("avatars").remove([avatarPath]);
        setMessage("Profile updated.");
        setFile(null);
        setRemoveAvatar(false);
        setSaving(false);
        router.refresh();
      }}
    >
      <div className="avatar-editor">
        <div
          className="profile-avatar profile-avatar--large"
          role="img"
          aria-label={`${name || displayName}'s profile photo`}
          style={preview ? { backgroundImage: `url(${preview})` } : undefined}
        >
          {!preview ? (name || displayName).charAt(0).toUpperCase() : null}
        </div>
        <div>
          <label className="button button-secondary avatar-picker">
            <Camera aria-hidden="true" size={18} /> Change photo
            <input
              className="sr-only"
              type="file"
              accept="image/jpeg,image/png,image/webp"
              onChange={(event) => {
                const selected = event.target.files?.[0] ?? null;
                setFile(selected);
                setPreview(
                  selected ? URL.createObjectURL(selected) : avatarUrl,
                );
                setRemoveAvatar(false);
              }}
            />
          </label>
          {preview ? (
            <button
              className="button-quiet"
              type="button"
              onClick={() => {
                setFile(null);
                setPreview(null);
                setRemoveAvatar(true);
              }}
            >
              <Trash2 aria-hidden="true" size={17} /> Remove photo
            </button>
          ) : null}
          <p>JPG, PNG, or WebP. Maximum 5 MB.</p>
        </div>
      </div>
      <label>
        Display name
        <input
          name="displayName"
          value={name}
          minLength={2}
          maxLength={80}
          required
          autoComplete="name"
          onChange={(event) => setName(event.target.value)}
        />
        <span className="field-help">
          Use the real name players know you by.
        </span>
      </label>
      <button type="submit" disabled={saving}>
        <Save aria-hidden="true" size={18} />
        {saving ? "Saving…" : "Save profile"}
      </button>
      <p role="status">{message}</p>
    </form>
  );
}
