import { Fragment } from "react";

/**
 * Renders plain text with the given quotes highlighted.
 * Everything is rendered as React text nodes — no HTML is ever injected.
 */
export function HighlightedText({ text, quotes }: { text: string; quotes: string[] }) {
  const ranges: Array<[number, number]> = [];
  const haystack = text.toLowerCase();

  for (const quote of quotes) {
    const needle = quote.toLowerCase().trim();
    if (!needle) continue;
    const index = haystack.indexOf(needle);
    if (index === -1) continue;
    ranges.push([index, index + needle.length]);
  }
  ranges.sort((a, b) => a[0] - b[0]);

  const merged: Array<[number, number]> = [];
  for (const range of ranges) {
    const last = merged[merged.length - 1];
    if (last && range[0] <= last[1]) last[1] = Math.max(last[1], range[1]);
    else merged.push([...range]);
  }

  const nodes: React.ReactNode[] = [];
  let cursor = 0;
  merged.forEach(([start, end], i) => {
    if (start > cursor) nodes.push(<Fragment key={`t${i}`}>{text.slice(cursor, start)}</Fragment>);
    nodes.push(
      <mark key={`m${i}`} className="mark-evidence text-foreground">
        {text.slice(start, end)}
      </mark>,
    );
    cursor = end;
  });
  if (cursor < text.length) nodes.push(<Fragment key="tail">{text.slice(cursor)}</Fragment>);

  return <p className="whitespace-pre-wrap leading-7">{nodes}</p>;
}
