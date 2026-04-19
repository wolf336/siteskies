import { useState, useEffect } from "react";

const geocodeCache = {};
const NOMINATIM_EMAIL = "liam.stienen@gmail.com";

function parseCoords(location) {
  if (!location) return null;
  const match = location.match(/^\s*(-?\d+\.?\d*)\s*,\s*(-?\d+\.?\d*)\s*$/);
  if (!match) return null;
  return { lat: parseFloat(match[1]), lon: parseFloat(match[2]) };
}

function truncateCoords(lat, lon) {
  return `${parseFloat(lat.toFixed(4))}, ${parseFloat(lon.toFixed(4))}`;
}

export function useFormattedLocation(location, locationName) {
  const coords = parseCoords(location);
  const truncated = coords ? truncateCoords(coords.lat, coords.lon) : null;

  const initialDisplay = locationName
    ? (truncated ? `${locationName} · ${truncated}` : locationName)
    : (truncated ?? location);

  const [display, setDisplay] = useState(initialDisplay);

  useEffect(() => {
    // Fast path — we already have a stored name, don't hit Nominatim at all.
    if (locationName) {
      setDisplay(truncated ? `${locationName} · ${truncated}` : locationName);
      return;
    }

    if (!coords) {
      setDisplay(location);
      return;
    }

    const cacheKey = `${coords.lat},${coords.lon}`;

    if (geocodeCache[cacheKey]) {
      setDisplay(geocodeCache[cacheKey]);
      return;
    }

    setDisplay(truncated);

    fetch(
      `https://nominatim.openstreetmap.org/reverse?lat=${coords.lat}&lon=${coords.lon}&format=json&email=${encodeURIComponent(NOMINATIM_EMAIL)}`,
      { headers: { "Accept-Language": "en" } }
    )
      .then((r) => r.json())
      .then((data) => {
        const addr = data.address || {};
        const town = addr.town || addr.city || addr.village || addr.municipality || null;
        const country = addr.country || null;

        let formatted;
        if (town && country) {
          formatted = `${town}, ${country} · ${truncated}`;
        } else if (country) {
          formatted = `${country} · ${truncated}`;
        } else {
          formatted = truncated;
        }

        geocodeCache[cacheKey] = formatted;
        setDisplay(formatted);
      })
      .catch(() => {
        setDisplay(truncated);
      });
  }, [location, locationName]);

  return display;
}