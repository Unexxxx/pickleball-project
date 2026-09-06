"use client";
import { useActionState } from "react";
import { sendRecovery } from "@/lib/actions/auth";
export function RecoveryForm() {
  const [state, action, pending] = useActionState(sendRecovery, null);
  return (
    <form action={action} className="grid max-w-md gap-4">
      <label>
        Email
        <input
          name="email"
          type="email"
          required
          className="block w-full border p-3"
        />
      </label>
      <button disabled={pending}>Send recovery link</button>
      {state?.ok ? (
        <p role="status">If the account exists, a recovery link was sent.</p>
      ) : null}
    </form>
  );
}
