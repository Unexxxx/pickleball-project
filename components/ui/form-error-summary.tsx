import { FocusManager } from "@/components/ui/focus-manager";
export function FormErrorSummary({ errors }: { errors: string[] }) {
  if (!errors.length) return null;
  return (
    <FocusManager>
      <div
        role="alert"
        aria-labelledby="error-summary-title"
        className="rounded-lg border border-red-700 p-3"
      >
        <h2 id="error-summary-title">Please correct these problems</h2>
        <ul>
          {errors.map((error) => (
            <li key={error}>{error}</li>
          ))}
        </ul>
      </div>
    </FocusManager>
  );
}
