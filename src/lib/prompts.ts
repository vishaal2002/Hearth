// The daily ritual's heart: a gentle, rotating question both people answer.
// Deterministic by date so partners in the same space always get the same one,
// and so "this day last year" can show what you were asked back then.

export type DailyPrompt = { key: string; text: string };

const PROMPTS: DailyPrompt[] = [
  { key: "small-thing", text: "What's one small thing they did this week you haven't told them you noticed?" },
  { key: "looking-forward", text: "What are you quietly looking forward to right now?" },
  { key: "where-now", text: "Where are you, right this second? Paint it for them in a sentence." },
  { key: "made-you-smile", text: "What made you smile today, even a little?" },
  { key: "thinking-of", text: "When did you think of them today?" },
  { key: "grateful", text: "One thing you're grateful for that you almost overlooked." },
  { key: "learned", text: "What did today teach you, if anything?" },
  { key: "needed", text: "What do you need a little more of this week?" },
  { key: "proud", text: "What's something you're a bit proud of lately?" },
  { key: "song", text: "A song, smell, or taste that's been following you around." },
  { key: "younger-you", text: "What would the you of five years ago think of right now?" },
  { key: "tiny-luxury", text: "What was the smallest luxury of your day?" },
  { key: "honest", text: "How are you, actually? Not the short answer." },
  { key: "us-lately", text: "What's felt good about us lately?" },
  { key: "weather-inside", text: "If your mood were weather today, what would it be?" },
  { key: "hold-onto", text: "One moment from today you'd like to keep." },
];

export const MOODS = [
  { key: "glad", label: "glad", emoji: "🌻" },
  { key: "tender", label: "tender", emoji: "🤍" },
  { key: "calm", label: "calm", emoji: "🌿" },
  { key: "tired", label: "tired", emoji: "🌙" },
  { key: "missing", label: "missing you", emoji: "🌊" },
  { key: "alight", label: "alight", emoji: "🔥" },
] as const;

export function moodMeta(key?: string | null) {
  return MOODS.find((m) => m.key === key);
}

// Days since a fixed epoch → stable index, so everyone sees the same prompt
// on the same calendar day (and last year's date maps to last year's prompt).
function dayNumber(d = new Date()) {
  const utc = Date.UTC(d.getFullYear(), d.getMonth(), d.getDate());
  return Math.floor(utc / 86_400_000);
}

export function promptForDate(d = new Date()): DailyPrompt {
  return PROMPTS[((dayNumber(d) % PROMPTS.length) + PROMPTS.length) % PROMPTS.length];
}

export function promptByKey(key?: string | null): DailyPrompt | undefined {
  return PROMPTS.find((p) => p.key === key);
}

// YYYY-MM-DD in local time (matches the DB `happened_on` date semantics well enough
// for a single household; revisit per-member timezones later).
export function todayISODate(d = new Date()) {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}
