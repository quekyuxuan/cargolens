"use client";

import { useEffect, useMemo, useState } from "react";

/**
 * Page a list client-side. `page` is clamped, so a filter that shrinks the list
 * never leaves the caller stranded on an empty page.
 */
export function usePaged(items, perPage) {
  const [page, setPage] = useState(1);
  const pages = Math.max(1, Math.ceil(items.length / perPage));
  const current = Math.min(page, pages);

  useEffect(() => {
    if (page !== current) setPage(current);
  }, [page, current]);

  const slice = useMemo(
    () => items.slice((current - 1) * perPage, current * perPage),
    [items, current, perPage]
  );

  return { page: current, pages, setPage, slice, perPage };
}

export default function Pager({ page, pages, onPage, total, perPage, noun = "rows" }) {
  const [draft, setDraft] = useState(String(page));

  useEffect(() => {
    setDraft(String(page));
  }, [page]);

  if (pages <= 1) return null;

  function commit(value) {
    const n = parseInt(value, 10);
    if (!Number.isFinite(n)) {
      setDraft(String(page));
      return;
    }
    const next = Math.min(Math.max(n, 1), pages);
    setDraft(String(next));
    if (next !== page) onPage(next);
  }

  const first = (page - 1) * perPage + 1;
  const last = Math.min(page * perPage, total);

  return (
    <div className="pager">
      <span className="pager-range">
        {first}–{last} of {total} {noun}
      </span>
      <div className="pager-nav">
        <button
          type="button"
          className="pager-arrow"
          onClick={() => onPage(page - 1)}
          disabled={page <= 1}
          aria-label="Previous page"
        >
          <svg width="16" height="16" viewBox="0 0 20 20" fill="none" aria-hidden="true">
            <path
              d="M12 4.5 6.5 10 12 15.5"
              stroke="currentColor"
              strokeWidth="1.6"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </button>
        <span className="pager-pos">
          <input
            className="pager-input"
            value={draft}
            inputMode="numeric"
            aria-label={"Page number, 1 to " + pages}
            onChange={(e) => setDraft(e.target.value.replace(/[^0-9]/g, ""))}
            onBlur={(e) => commit(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                commit(e.currentTarget.value);
              }
            }}
          />
          <span className="pager-sep">/</span>
          <b>{pages}</b>
        </span>
        <button
          type="button"
          className="pager-arrow"
          onClick={() => onPage(page + 1)}
          disabled={page >= pages}
          aria-label="Next page"
        >
          <svg width="16" height="16" viewBox="0 0 20 20" fill="none" aria-hidden="true">
            <path
              d="M8 4.5 13.5 10 8 15.5"
              stroke="currentColor"
              strokeWidth="1.6"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </button>
      </div>
    </div>
  );
}
