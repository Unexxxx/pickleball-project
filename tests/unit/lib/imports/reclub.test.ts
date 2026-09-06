import { describe, expect, it } from "vitest";
import { normalizeReclubUrl, parseReclubEventHtml } from "@/lib/imports/reclub";

describe("Reclub event import", () => {
  it("accepts only canonical public Reclub event links", () => {
    expect(normalizeReclubUrl(" https://reclub.co/m/0GISFY/ ")).toBe(
      "https://reclub.co/m/0GISFY",
    );
    expect(() => normalizeReclubUrl("https://evil.example/m/0GISFY")).toThrow();
    expect(() =>
      normalizeReclubUrl("https://reclub.co.evil.example/m/0GISFY"),
    ).toThrow();
  });

  it("extracts event details, confirmed players, and ordered waitlist entries", () => {
    const html = `
      <h1 class="font-black text-xl">Thursday Open Play</h1>
      <span class="mr-2">Thursday, Aug 27 @ 7:00 AM</span>
      <span class="inline-block badge">2 hours</span>
      <div class="flex my-3 mr-6 md:hidden">
        <p class="text-sm font-semibold">Thursday, Aug 27 @ 7:00 AM</p>
        <p class="text-sm font-semibold">Home Court Pickleball</p>
      </div>
      <p>Maximum of 36 players only</p>
      <p>Confirmed <span>· 2</span></p>
      <p class="font-semibold mt-2 text-center truncate">Alex</p>
      <p class="font-semibold mt-2 text-center truncate">Sam</p>
      <p>Waitlisted · 1</p>
      <p class="position">1</p><a href="/players/@jamie"><img></a><a href="/players/@jamie" class="my-auto text-sm font-bold hover:underline">Jamie</a>
    `;
    const result = parseReclubEventHtml(html, "https://reclub.co/m/0GISFY");
    expect(result).toMatchObject({
      name: "Thursday Open Play",
      venue: "Home Court Pickleball",
      dateLabel: "Thursday, Aug 27 @ 7:00 AM",
      durationMinutes: 120,
      capacity: 36,
    });
    expect(result.roster).toEqual([
      {
        sourceRef: "confirmed-1",
        displayName: "Alex",
        status: "confirmed",
        waitlistPosition: null,
      },
      {
        sourceRef: "confirmed-2",
        displayName: "Sam",
        status: "confirmed",
        waitlistPosition: null,
      },
      {
        sourceRef: "waitlisted-jamie",
        displayName: "Jamie",
        status: "waitlisted",
        waitlistPosition: 1,
      },
    ]);
  });
});
