/** A club's picture in list rows; its initial when it has none. */
export function ClubAvatar({
  name,
  imageUrl,
}: {
  name: string;
  imageUrl: string | null;
}) {
  return (
    <span
      className="ph-row__avatar"
      aria-hidden="true"
      style={imageUrl ? { backgroundImage: `url(${imageUrl})` } : undefined}
    >
      {imageUrl ? null : name.slice(0, 1).toUpperCase()}
    </span>
  );
}
