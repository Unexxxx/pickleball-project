"use client";

import { useEffect, useRef, useState } from "react";
import { Search } from "lucide-react";
import type { CommandResult } from "@/lib/actions/result";
import type { MemberCursor, MemberPage } from "@/lib/queries/club-home";

/** Search waits this long after the last keystroke. */
const SEARCH_DELAY_MS = 250;

type Load<T> = (
  query: string,
  after: MemberCursor | null,
) => Promise<CommandResult<MemberPage<T>>>;

/**
 * A member list that loads a page at a time. Search asks the database (the
 * whole club, not just what's on screen); "Show more" continues after the
 * last row. When the server sends a fresh first page (after an approve,
 * remove or role change), the rows already on screen are re-read so the
 * list stays correct without jumping back to the top.
 */
export function useMemberPages<T>({
  initial,
  load,
  cursorOf,
}: {
  initial: MemberPage<T>;
  load: Load<T>;
  cursorOf: (item: T) => MemberCursor;
}) {
  const [seen, setSeen] = useState(initial);
  const [items, setItems] = useState(initial.items);
  const [total, setTotal] = useState(initial.total);
  const [hasMore, setHasMore] = useState(initial.hasMore);
  const [query, setQuery] = useState("");
  const [searched, setSearched] = useState("");
  const [loading, setLoading] = useState(false);
  const [stale, setStale] = useState(false);
  const [error, setError] = useState("");
  // Only the newest request may update the list.
  const latest = useRef(0);

  // New first page from the server: take it as is when only the first page
  // is showing, otherwise re-read what's on screen (below).
  if (initial !== seen) {
    setSeen(initial);
    if (!searched && items.length <= initial.items.length) {
      setItems(initial.items);
      setTotal(initial.total);
      setHasMore(initial.hasMore);
    } else setStale(true);
  }

  const apply = (page: MemberPage<T>, append: boolean) => {
    setItems((current) => (append ? [...current, ...page.items] : page.items));
    setTotal(page.total);
    setHasMore(page.hasMore);
    setError("");
  };

  // Reads pages from the top until it has as many rows as before.
  async function refill(text: string, count: number) {
    let rows: T[] = [];
    let page: MemberPage<T> | null = null;
    do {
      const result = await load(
        text,
        rows.length ? cursorOf(rows[rows.length - 1]!) : null,
      );
      if (!result.ok) return result.error.message;
      page = result.data;
      rows = [...rows, ...page.items];
    } while (page.hasMore && rows.length < count);
    return { items: rows, total: page.total, hasMore: page.hasMore };
  }

  useEffect(() => {
    if (!stale) return;
    const id = ++latest.current;
    void refill(searched, items.length).then((page) => {
      if (id !== latest.current) return;
      setStale(false);
      if (typeof page === "string") setError(page);
      else apply(page, false);
    });
    // Runs once per refresh; `searched` and the row count are read as they
    // were when the refresh arrived.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stale]);

  useEffect(() => {
    const text = query.trim();
    if (text === searched) return;
    const timer = window.setTimeout(() => {
      const id = ++latest.current;
      setSearched(text);
      if (!text) {
        apply(seen, false);
        return;
      }
      setLoading(true);
      void load(text, null).then((result) => {
        if (id !== latest.current) return;
        setLoading(false);
        if (result.ok) apply(result.data, false);
        else setError(result.error.message);
      });
    }, SEARCH_DELAY_MS);
    return () => window.clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query]);

  async function showMore() {
    const last = items[items.length - 1];
    if (!last || loading) return;
    const id = ++latest.current;
    setLoading(true);
    const result = await load(searched, cursorOf(last));
    if (id !== latest.current) return;
    setLoading(false);
    if (result.ok) apply(result.data, true);
    else setError(result.error.message);
  }

  return {
    items,
    total,
    hasMore,
    query,
    setQuery,
    searched,
    loading,
    error,
    showMore,
  };
}

/** The search box above a member list. */
export function MemberSearch({
  value,
  onChange,
  label = "Search members",
}: {
  value: string;
  onChange: (value: string) => void;
  label?: string;
}) {
  return (
    <label className="member-search">
      <Search aria-hidden="true" size={16} />
      <span className="sr-only">{label}</span>
      <input
        type="search"
        placeholder={label}
        value={value}
        onChange={(event) => onChange(event.target.value)}
      />
    </label>
  );
}

/** "Showing 30 of 1,000" and the Show more button under a member list. */
export function MemberPagerFooter({
  shown,
  total,
  hasMore,
  loading,
  error,
  onMore,
}: {
  shown: number;
  total: number;
  hasMore: boolean;
  loading: boolean;
  error: string;
  onMore: () => void;
}) {
  if (!hasMore && !error) return null;
  return (
    <div className="member-pager">
      {hasMore ? (
        <>
          <p className="member-pager__status" aria-live="polite">
            Showing {shown.toLocaleString("en-US")} of{" "}
            {total.toLocaleString("en-US")}
          </p>
          <button
            type="button"
            className="button-quiet member-pager__more"
            disabled={loading}
            onClick={onMore}
          >
            {loading ? "Loading…" : "Show more"}
          </button>
        </>
      ) : null}
      {error ? <p role="alert">{error}</p> : null}
    </div>
  );
}
