"use client";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { addEventCourt, reduceEventCourt } from "@/lib/actions/courts";
export type ManagedCourt = {
  id: string;
  label: string;
  status: string;
  currentMatchId: string | null;
};
type CourtEditorProps =
  | { count: number }
  | {
      eventId: string;
      clubSlug: string;
      courts: ManagedCourt[];
      canManage: boolean;
      changesAllowed: boolean;
    };

export function CourtEditor(props: CourtEditorProps) {
  if ("count" in props) {
    return (
      <section>
        <h2>Courts</h2>
        <p>{props.count} courts configured</p>
      </section>
    );
  }
  return <ManagedCourtEditor {...props} />;
}

function ManagedCourtEditor({
  eventId,
  clubSlug,
  courts,
  canManage,
  changesAllowed,
}: Exclude<CourtEditorProps, { count: number }>) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);
  const [active, setActive] = useState<string | null>(null);
  function add() {
    setMessage(null);
    setActive("add");
    startTransition(async () => {
      const result = await addEventCourt({ eventId, clubSlug });
      setMessage(
        result.ok
          ? "Court added and ready for assignment."
          : result.error.message,
      );
      setActive(null);
      if (result.ok) router.refresh();
    });
  }
  function reduce(court: ManagedCourt) {
    if (
      !window.confirm(
        `Reduce ${court.label} from this event? You can add it back later.`,
      )
    )
      return;
    setMessage(null);
    setActive(court.id);
    startTransition(async () => {
      const result = await reduceEventCourt({
        eventId,
        clubSlug,
        courtId: court.id,
      });
      setMessage(
        result.ok
          ? `${court.label} removed from the active court list.`
          : result.error.message,
      );
      setActive(null);
      if (result.ok) router.refresh();
    });
  }
  return (
    <>
      {canManage ? (
        <section className="flex flex-col gap-4 rounded-2xl border border-emerald-950/15 bg-white p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-bold uppercase tracking-[0.14em] text-emerald-800">
              Court controls
            </p>
            <p className="mt-1 text-sm text-slate-600">
              {courts.length} active {courts.length === 1 ? "court" : "courts"}.
              Only available courts can be reduced.
            </p>
          </div>
          <button
            type="button"
            onClick={add}
            disabled={pending || !changesAllowed}
            className="min-h-11 rounded-xl bg-emerald-800 px-5 py-2.5 font-semibold text-white transition hover:bg-emerald-900 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {pending && active === "add" ? "Adding…" : "+ Add court"}
          </button>
        </section>
      ) : null}
      {message ? (
        <p
          role="status"
          className="rounded-xl bg-emerald-50 px-4 py-3 text-sm text-emerald-950"
        >
          {message}
        </p>
      ) : null}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {courts.map((court) => {
          const available =
            court.status === "available" && !court.currentMatchId;
          return (
            <article
              key={court.id}
              className="flex min-h-48 flex-col rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h2 className="text-2xl font-bold text-emerald-950">
                    {court.label}
                  </h2>
                  <p
                    className={`mt-1 font-medium capitalize ${available ? "text-emerald-700" : "text-amber-700"}`}
                  >
                    {court.status.replaceAll("_", " ")}
                  </p>
                </div>
                <span
                  className={`mt-1 size-3 rounded-full ${available ? "bg-emerald-500" : "bg-amber-500"}`}
                  aria-hidden="true"
                />
              </div>
              <p className="mt-3 break-words text-sm text-slate-600">
                {court.currentMatchId
                  ? `Active match ${court.currentMatchId}`
                  : "Ready for the next assignment"}
              </p>
              {canManage ? (
                <button
                  type="button"
                  onClick={() => reduce(court)}
                  disabled={
                    pending ||
                    !changesAllowed ||
                    !available ||
                    courts.length <= 1
                  }
                  title={
                    !available
                      ? "Finish the active match before reducing this court"
                      : courts.length <= 1
                        ? "At least one court is required"
                        : undefined
                  }
                  className="mt-auto min-h-10 self-start rounded-lg border border-red-200 px-3 py-2 text-sm font-semibold text-red-700 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:border-slate-200 disabled:text-slate-400"
                >
                  {pending && active === court.id
                    ? "Reducing…"
                    : "Reduce court"}
                </button>
              ) : null}
            </article>
          );
        })}
      </div>
    </>
  );
}
