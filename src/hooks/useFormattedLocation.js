import { useState, useEffect } from "react";

// In-memory cache: "lat,lon" -> formatted string
const geocodeCache = {};

function parseCoords(location) {
  if (!location) return null;
  const match = location.match(/^\s*(-?\d+\.?\d*)\s*,\s*(-?\d+\.?\d*)\s*$/);
  if (!match) return null;
  return { lat: parseFloat(match[1]), lon: parseFloat(match[2]) };
}

function truncateCoords(lat, lon) {
  return `${parseFloat(lat.toFixed(4))}, ${parseFloat(lon.toFixed(4))}`;
}

export function useFormattedLocation(location) {
  const coords = parseCoords(location);
  const truncated = coords ? truncateCoords(coords.lat, coords.lon) : null;

  const [display, setDisplay] = useState(truncated ?? location);

  useEffect(() => {
    if (!coords) {
      setDisplay(location);
      return;
    }

    const cacheKey = `${coords.lat},${coords.lon}`;

    if (geocodeCache[cacheKey]) {
      setDisplay(geocodeCache[cacheKey]);
      return;
    }

    // Show truncated coords immediately while geocoding
    setDisplay(truncated);

    fetch(
      `https://nominatim.openstreetmap.org/reverse?lat=${coords.lat}&lon=${coords.lon}&format=json`,
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
        // Fall back to truncated coords on error
        setDisplay(truncated);
      });
  }, [location]);

  return display;
}