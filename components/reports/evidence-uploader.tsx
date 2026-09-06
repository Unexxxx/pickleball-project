"use client";
export function EvidenceUploader() {
  return (
    <label>
      Private evidence
      <input type="file" accept="image/jpeg,image/png,application/pdf" />
      <span>
        Files are private and retained according to the evidence policy.
      </span>
    </label>
  );
}
