export function ProfileEmptyState() {
  return <p role="status">This player has no recorded matches yet.</p>;
}
export function ProfileErrorState() {
  return <p role="alert">The trusted record could not be loaded. Try again.</p>;
}
