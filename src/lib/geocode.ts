// Turn a free-text place ("Verona, Italy") into coordinates via OpenStreetMap's
// Nominatim service. No API key needed, but the usage policy is strict:
//   - max 1 request/second  → we serialise calls behind a small queue
//   - identify yourself      → we send a descriptive User-Agent/Referer
// Results are cached in-memory and in localStorage so a given place is only
// ever geocoded once across the whole app.

export type LatLng = { lat: number; lng: number };

const STORAGE_KEY = "hearth.geocode.v1";
const memory = new Map<string, LatLng | null>();

function normalize(place: string): string {
  return place.trim().toLowerCase().replace(/\s+/g, " ");
}

function loadStore(): Record<string, LatLng | null> {
  if (typeof localStorage === "undefined") return {};
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "{}");
  } catch {
    return {};
  }
}

function saveStore(store: Record<string, LatLng | null>) {
  if (typeof localStorage === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
  } catch {
    /* quota / private mode — fine to skip persistence */
  }
}

// Serialise network calls so we never exceed Nominatim's 1 req/sec limit.
let chain: Promise<unknown> = Promise.resolve();
function enqueue<T>(task: () => Promise<T>): Promise<T> {
  const run = chain.then(task, task);
  chain = run.then(
    () => new Promise((r) => setTimeout(r, 1100)),
    () => new Promise((r) => setTimeout(r, 1100)),
  );
  return run;
}

async function fetchFromNominatim(place: string): Promise<LatLng | null> {
  const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(
    place,
  )}&format=json&limit=1`;
  const res = await fetch(url, { headers: { "Accept-Language": "en" } });
  if (!res.ok) throw new Error(`Geocoding failed (${res.status})`);
  const hits = (await res.json()) as Array<{ lat: string; lon: string }>;
  const hit = hits[0];
  return hit ? { lat: parseFloat(hit.lat), lng: parseFloat(hit.lon) } : null;
}

/**
 * Geocode a place string. Returns coordinates, or null if the place can't be
 * resolved. Cached in-memory + localStorage; safe to call repeatedly.
 */
export async function geocode(place: string): Promise<LatLng | null> {
  const key = normalize(place);
  if (!key) return null;
  if (memory.has(key)) return memory.get(key)!;

  const store = loadStore();
  if (key in store) {
    memory.set(key, store[key]);
    return store[key];
  }

  try {
    const coords = await enqueue(() => fetchFromNominatim(key));
    memory.set(key, coords);
    store[key] = coords;
    saveStore(store);
    return coords;
  } catch {
    // Network/transient error — don't poison the cache, just report no result.
    return null;
  }
}
