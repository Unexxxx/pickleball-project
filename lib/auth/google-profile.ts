const googleAvatarHosts = new Set([
  "lh3.googleusercontent.com",
  "lh4.googleusercontent.com",
  "lh5.googleusercontent.com",
  "lh6.googleusercontent.com",
]);

const extensionByContentType: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

export function googleAvatarUrl(value: unknown) {
  if (typeof value !== "string") return null;
  try {
    const url = new URL(value);
    return url.protocol === "https:" && googleAvatarHosts.has(url.hostname)
      ? url
      : null;
  } catch {
    return null;
  }
}

export function googleAvatarExtension(contentType: string | null) {
  return extensionByContentType[contentType?.split(";")[0] ?? ""] ?? null;
}
