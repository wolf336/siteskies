import { useMemo } from "react";

function parseCoords(location) {
  if (!location) return null;
  const match = location.match(/^\s*(-?\d+\.?\d*)\s*,\s*(-?\d+\.?\d*)\s*$/);
  if (!match) return null;
  return { lat: parseFloat(match[1]), lon: parseFloat(match[2]) };
}

function truncateCoords(lat, lon) {
  return `${parseFloat(lat.toFixed(4))}, ${parseFloat(lon.toFixed(4))}`;
}

/**
 * Formats a project's location for display.
 *
 * - If a location_name was resolved at save time, show "Name · short coords"
 *   (or just "Name" if the location string isn't parseable coords).
 * - If no location_name but the location string is coords, show truncated coords.
 * - Otherwise fall back to the raw location string.
 *
 * No network calls — resolution happens at save time via lib/geocode.js.
 * Projects created before location_name existed will display as coords until
 * they're edited (the save handler will backfill the name at that point).
 */
export function useFormattedLocation(location, locationName) {
  return useMemo(() => {
    const coords = parseCoords(location);
    const truncated = coords ? truncateCoords(coords.lat, coords.lon) : null;

    if (locationName) {
      return truncated ? `${locationName} · ${truncated}` : locationName;
    }

    return truncated ?? location ?? "";
  }, [location, locationName]);
}