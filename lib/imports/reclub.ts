export type ReclubRosterEntry = {
  sourceRef: string;
  displayName: string;
  status: "confirmed" | "waitlisted";
  waitlistPosition: number | null;
};

export type ReclubEventPreview = {
  sourceUrl: string;
  name: string;
  venue: string;
  dateLabel: string;
  durationMinutes: number;
  capacity: number;
  roster: ReclubRosterEntry[];
};

const entityMap: Record<string, string> = {
  amp: "&",
  apos: "'",
  gt: ">",
  lt: "<",
  nbsp: " ",
  quot: '"',
};

function plainText(value: string) {
  return value
    .replace(/<[^>]*>/g, " ")
    .replace(/&(#x?[0-9a-f]+|[a-z]+);/gi, (_, entity: string) => {
      if (entity.startsWith("#")) {
        const hex = entity[1]?.toLowerCase() === "x";
        const number = Number.parseInt(
          entity.slice(hex ? 2 : 1),
          hex ? 16 : 10,
        );
        return Number.isFinite(number) ? String.fromCodePoint(number) : "";
      }
      return entityMap[entity.toLowerCase()] ?? "";
    })
    .replace(/\s+/g, " ")
    .trim();
}

export function normalizeReclubUrl(value: string) {
  let url: URL;
  try {
    url = new URL(value.trim());
  } catch {
    throw new Error("Enter a valid Reclub event link.");
  }
  if (
    url.protocol !== "https:" ||
    url.hostname !== "reclub.co" ||
    url.port ||
    url.username ||
    url.password ||
    !/^\/m\/[A-Za-z0-9_-]+\/?$/.test(url.pathname)
  ) {
    throw new Error(
      "Use a public Reclub link in the format https://reclub.co/m/…",
    );
  }
  return `https://reclub.co${url.pathname.replace(/\/$/, "")}`;
}

function firstMatch(html: string, expression: RegExp, fallback = "") {
  return plainText(expression.exec(html)?.[1] ?? fallback);
}

function parseDuration(value: string) {
  const hours = Number.parseFloat(/([\d.]+)\s*hours?/i.exec(value)?.[1] ?? "0");
  const minutes = Number.parseInt(
    /(\d+)\s*minutes?/i.exec(value)?.[1] ?? "0",
    10,
  );
  return Math.max(30, Math.round(hours * 60 + minutes));
}

export function parseReclubEventHtml(
  html: string,
  sourceUrl: string,
): ReclubEventPreview {
  const name = firstMatch(html, /<h1\b[^>]*>([\s\S]*?)<\/h1>/i);
  const dateLabel = firstMatch(html, /<span class="mr-2">([\s\S]*?)<\/span>/i);
  const durationLabel = firstMatch(
    html,
    /<span class="inline-block[^>]*>([\s\S]*?)<\/span>/i,
  );
  const mobileDateIndex = html.indexOf('class="flex my-3 mr-6 md:hidden"');
  const venueRegion = html.slice(
    Math.max(0, mobileDateIndex),
    mobileDateIndex + 4000,
  );
  const venueMatches = [
    ...venueRegion.matchAll(
      /<p class="text-sm font-semibold">([\s\S]*?)<\/p>/gi,
    ),
  ];
  const venue = plainText(venueMatches[1]?.[1] ?? "");
  const capacityText = /Maximum of\s+(\d+)\s+players/i.exec(
    plainText(html),
  )?.[1];
  const confirmedStart = html.search(/>Confirmed\s*<span>/i);
  const waitlistedStart = html.search(/>Waitlisted\s*[·&]/i);
  const confirmedRegion = html.slice(
    confirmedStart,
    waitlistedStart > confirmedStart ? waitlistedStart : undefined,
  );
  const waitlistedRegion =
    waitlistedStart >= 0
      ? html.slice(waitlistedStart, waitlistedStart + 12000)
      : "";
  const roster: ReclubRosterEntry[] = [];

  for (const [index, match] of [
    ...confirmedRegion.matchAll(
      /<p class="font-semibold[^">]*text-center[^">]*"[^>]*>([\s\S]*?)<\/p>/gi,
    ),
  ].entries()) {
    const displayName = plainText(match[1] ?? "");
    if (displayName)
      roster.push({
        sourceRef: `confirmed-${index + 1}`,
        displayName,
        status: "confirmed",
        waitlistPosition: null,
      });
  }
  for (const match of waitlistedRegion.matchAll(
    /<p[^>]*>(\d+)<\/p>\s*<a[\s\S]*?<a href="\/players\/@([^"]+)"[^>]*class="my-auto text-sm font-bold hover:underline">([\s\S]*?)<\/a>/gi,
  )) {
    const position = Number.parseInt(match[1] ?? "0", 10);
    const displayName = plainText(match[3] ?? "");
    if (displayName)
      roster.push({
        sourceRef: `waitlisted-${match[2] ?? position}`,
        displayName,
        status: "waitlisted",
        waitlistPosition: position,
      });
  }

  if (!name || !dateLabel || !venue || confirmedStart < 0) {
    throw new Error(
      "This Reclub page could not be read. It may be private or its layout may have changed.",
    );
  }
  const capacity =
    Number.parseInt(capacityText ?? "", 10) || Math.max(2, roster.length);
  return {
    sourceUrl,
    name,
    venue,
    dateLabel,
    durationMinutes: parseDuration(durationLabel),
    capacity,
    roster,
  };
}
