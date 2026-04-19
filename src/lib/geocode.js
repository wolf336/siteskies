// Shared geocoding helpers. We use Nominatim (OpenStreetMap) — free but rate-limited.
// Their usage policy requires max 1 req/sec globally, an identifying email, and caching.

export const NOMINATIM_EMAIL = "liam.stienen@gmail.com";
const CACHE_KEY = "siteskies_geocode_cache_v1";
const CACHE_MAX_ENTRIES = 200;

function readCache() {
  try {
    return JSON.parse(localStorage.getItem(CACHE_KEY) || "{}");
  } catch {
    return {};
  }
}

function writeCache(obj) {
  try {
    const entries = Object.entries(obj);
    if (entries.length > CACHE_MAX_ENTRIES) {
      obj = Object.fromEntries(entries.slice(-CACHE_MAX_ENTRIES));
    }
    localStorage.setItem(CACHE_KEY, JSON.stringify(obj));
  } catch {
    // Quota or other — fail silently
  }
}

// Derive a short, human-friendly name from a Nominatim address object.
function formatName(address) {
  const town = address?.town || address?.city || address?.village || address?.municipality || address?.hamlet || null;
  const country = address?.country || null;
  if (town && country) return `${town}, ${country}`;
  if (country) return country;
  return null;
}

// Reverse-geocode lat/lng to a human-readable location name.
// Uses localStorage cache. Returns null if lookup fails or times out.
export async function resolveLocationName(lat, lng, timeoutMs = 2000) {
  const key = `rev:${lat.toFixed(5)},${lng.toFixed(5)}`;
  const cache = readCache();
  if (cache[key]) return cache[key];

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json&email=${encodeURIComponent(NOMINATIM_EMAIL)}`,
      { headers: { "Accept-Language": "en" }, signal: controller.signal }
    );
    const data = await res.json();
    const name = formatName(data.address);
    if (name) {
      cache[key] = name;
      writeCache(cache);
    }
    return name;
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

// Seed the cache with a known (coords -> name) pairing, e.g. from an address search result.
export function seedGeocodeCache(lat, lng, name) {
  if (!name) return;
  const key = `rev:${lat.toFixed(5)},${lng.toFixed(5)}`;
  const cache = readCache();
  cache[key] = name;
  writeCache(cache);
}