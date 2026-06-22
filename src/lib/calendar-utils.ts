export function initialsFromName(name?: string | null, email?: string | null) {
  const base = (name && name.trim()) || (email && email.split("@")[0]) || "?";
  const parts = base.split(/[\s._-]+/).filter(Boolean);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return base.slice(0, 2).toUpperCase();
}

// "Last Light" — earthy, desaturated emotional accents. Each one means
// something (joy, love, calm, adventure, memory, home) rather than being a
// generic rainbow. This is the single biggest "handcrafted vs. template" tell.
export const EVENT_COLORS = [
  "#FF7A45", // Ember — warmth, the everyday
  "#F4B740", // Marigold — joy, celebration
  "#E86A8C", // Rose — love, anniversaries
  "#7BA890", // Sage — calm, reflection
  "#6FA8DC", // Sky — adventure, travel
  "#9B7EDE", // Dusk — memory, nostalgia
  "#C97B5A", // Clay — grounding, home
  "#5BAE9C", // Teal — togetherness
];

/**
 * Make a free-text search term safe to drop into a PostgREST `.or()` filter.
 * Characters like , ( ) * % _ \ and " have meaning in the filter grammar and
 * would otherwise let a stray keystroke break — or alter — the query.
 */
export function sanitizeSearchTerm(raw: string) {
  return raw.replace(/[,()*%_\\"']/g, " ").trim();
}

export function fmtTime(d: Date) {
  return d.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
}

export function startOfDay(d: Date) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

export function addDays(d: Date, n: number) {
  const x = new Date(d);
  x.setDate(x.getDate() + n);
  return x;
}

export function startOfWeek(d: Date) {
  const x = startOfDay(d);
  const day = x.getDay(); // 0=Sun
  x.setDate(x.getDate() - day);
  return x;
}

export function startOfMonth(d: Date) {
  const x = new Date(d.getFullYear(), d.getMonth(), 1);
  return x;
}

export function endOfMonth(d: Date) {
  return new Date(d.getFullYear(), d.getMonth() + 1, 0);
}

export function isSameDay(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

export function eventsOnDay<T extends { start_at: string; end_at: string }>(events: T[], day: Date) {
  const s = startOfDay(day).getTime();
  const e = addDays(startOfDay(day), 1).getTime();
  return events.filter((ev) => {
    const a = new Date(ev.start_at).getTime();
    const b = new Date(ev.end_at).getTime();
    return a < e && b > s;
  });
}

export function toLocalInput(iso: string | Date) {
  const d = typeof iso === "string" ? new Date(iso) : iso;
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function fromLocalInput(value: string) {
  return new Date(value).toISOString();
}

// ---------------- Recurrence ----------------

export type Recurrence = "none" | "daily" | "weekly" | "monthly" | "yearly";

export const RECURRENCE_OPTIONS: { value: Recurrence; label: string }[] = [
  { value: "none", label: "Does not repeat" },
  { value: "daily", label: "Daily" },
  { value: "weekly", label: "Weekly" },
  { value: "monthly", label: "Monthly" },
  { value: "yearly", label: "Yearly" },
];

function advanceOccurrence(d: Date, freq: Recurrence) {
  const x = new Date(d);
  if (freq === "daily") x.setDate(x.getDate() + 1);
  else if (freq === "weekly") x.setDate(x.getDate() + 7);
  else if (freq === "monthly") x.setMonth(x.getMonth() + 1);
  else if (freq === "yearly") x.setFullYear(x.getFullYear() + 1);
  return x;
}

type RecurringBase = {
  start_at: string;
  end_at: string;
  recurrence?: string | null;
  recurrence_until?: string | null;
  recurrence_exdates?: string[] | null;
};

/**
 * Expand one recurring base event into concrete occurrences that overlap
 * [rangeStart, rangeEnd]. Each occurrence keeps the base fields but gets a
 * synthetic id, base_id, occurrence_date, recurring flag, and shifted times.
 */
export function expandRecurring<T extends RecurringBase & { id: string }>(
  base: T,
  rangeStart: Date,
  rangeEnd: Date,
): Array<T & { base_id: string; occurrence_date: string; recurring: true }> {
  const freq = (base.recurrence ?? "none") as Recurrence;
  if (freq === "none") return [];

  const baseStart = new Date(base.start_at);
  const durationMs = new Date(base.end_at).getTime() - baseStart.getTime();
  const until = base.recurrence_until ? new Date(base.recurrence_until) : null;
  const exset = new Set((base.recurrence_exdates ?? []).map((d) => new Date(d).toISOString()));

  let occ = new Date(baseStart);

  // Fast-forward daily/weekly events whose series began well before the range.
  if ((freq === "daily" || freq === "weekly") && occ < rangeStart) {
    const step = freq === "daily" ? 1 : 7;
    const dayDiff = Math.floor((startOfDay(rangeStart).getTime() - startOfDay(occ).getTime()) / 86_400_000);
    const jumps = Math.floor(dayDiff / step);
    if (jumps > 0) occ.setDate(occ.getDate() + jumps * step);
  }

  const out: Array<T & { base_id: string; occurrence_date: string; recurring: true }> = [];
  let guard = 0;
  while (occ <= rangeEnd && (!until || occ <= until) && guard < 2000) {
    guard++;
    const occEnd = new Date(occ.getTime() + durationMs);
    if (occEnd >= rangeStart) {
      const occISO = occ.toISOString();
      if (!exset.has(occISO)) {
        out.push({
          ...base,
          id: `${base.id}__${occISO}`,
          base_id: base.id,
          occurrence_date: occISO,
          recurring: true,
          start_at: occISO,
          end_at: occEnd.toISOString(),
        });
      }
    }
    occ = advanceOccurrence(occ, freq);
  }
  return out;
}

/** Anniversaries & birthdays — yearly all-day events get special treatment. */
export function isMilestoneEvent(ev: { all_day?: boolean; recurrence?: string | null }) {
  return !!ev.all_day && (ev.recurrence ?? "none") === "yearly";
}

export function matchesSearch(
  ev: { title: string; description?: string | null; location?: string | null },
  search: string,
) {
  const q = search.trim().toLowerCase();
  if (!q) return true;
  return (
    ev.title.toLowerCase().includes(q) ||
    (ev.description ?? "").toLowerCase().includes(q) ||
    (ev.location ?? "").toLowerCase().includes(q)
  );
}
