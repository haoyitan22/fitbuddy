/* ──────────────────────────────────────────────────────────────
   Calendar days in the user's own time zone (the phone's clock).
   Every per-day record (meals, water, check-ins, weigh-ins, coins)
   is keyed by dayKey(), so a day starts at local midnight, not at
   midnight UTC (which is 8am in China, 7pm in New York).
   ────────────────────────────────────────────────────────────── */

/** "YYYY-MM-DD" for the given moment, in local time. */
export function dayKey(d: Date = new Date()): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}
