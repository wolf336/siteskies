import React, { useState, useEffect, useRef, useCallback } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { MapPin } from "lucide-react";
import { NOMINATIM_EMAIL, seedGeocodeCache } from "@/lib/geocode";

function loadLeaflet() {
  return new Promise((resolve) => {
    if (window.L) return resolve(window.L);
    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css";
    document.head.appendChild(link);
    const script = document.createElement("script");
    script.src = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.js";
    script.onload = () => resolve(window.L);
    document.head.appendChild(script);
  });
}

function parseCoord(str) {
  // Accept both dot and comma as decimal separator
  return parseFloat(String(str).replace(",", "."));
}

export default function LocationPicker({ location, latitude, longitude, onChange }) {
  const [mode, setMode] = useState(latitude != null && longitude != null ? "coords" : "search");
  // If location looks like coords (e.g. "49.7, 10.55"), don't pre-fill the address search field
  const isCoordString = location && /^-?\d+\.?\d*\s*,\s*-?\d+\.?\d*$/.test(location.trim());
  const [query, setQuery] = useState(isCoordString ? "" : (location || ""));
  const [results, setResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [coordLat, setCoordLat] = useState(latitude != null ? String(latitude) : "");
  const [coordLng, setCoordLng] = useState(longitude != null ? String(longitude) : "");
  const debounceRef = useRef(null);
  const mapRef = useRef(null);
  const markerRef = useRef(null);
  const mapDivRef = useRef(null);

  const hasCoords = latitude != null && longitude != null;

  const initMap = useCallback(async (lat, lng) => {
    const L = await loadLeaflet();
    if (!mapDivRef.current) return;
    if (mapRef.current) {
      mapRef.current.invalidateSize();
      mapRef.current.setView([lat, lng], 13);
      if (markerRef.current) markerRef.current.setLatLng([lat, lng]);
      return;
    }
    const map = L.map(mapDivRef.current).setView([lat, lng], 13);
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: "© OpenStreetMap contributors",
    }).addTo(map);
    const redIcon = L.divIcon({
      className: "",
      html: `<div style="width:14px;height:14px;background:#ef4444;border:2px solid white;border-radius:50%;box-shadow:0 1px 4px rgba(0,0,0,.4)"></div>`,
      iconSize: [14, 14],
      iconAnchor: [7, 7],
    });
    const marker = L.marker([lat, lng], { icon: redIcon, draggable: true }).addTo(map);
    marker.on("dragend", (e) => {
      const { lat: newLat, lng: newLng } = e.target.getLatLng();
      const rLat = Math.round(newLat * 1e6) / 1e6;
      const rLng = Math.round(newLng * 1e6) / 1e6;
      setCoordLat(String(rLat));
      setCoordLng(String(rLng));
      onChange({ location: `${rLat}, ${rLng}`, latitude: rLat, longitude: rLng, location_name: null });
    });
    mapRef.current = map;
    markerRef.current = marker;
    setTimeout(() => map.invalidateSize(), 100);
  }, [onChange]);

  // Re-init/update map whenever valid coords arrive
  useEffect(() => {
    if (hasCoords) {
      setTimeout(() => initMap(latitude, longitude), 100);
    }
  }, [hasCoords, latitude, longitude, initMap]);

  // Also invalidate size whenever the map div becomes visible (e.g. mode switch)
  useEffect(() => {
    if (hasCoords && mapRef.current) {
      setTimeout(() => mapRef.current && mapRef.current.invalidateSize(), 150);
    }
  }, [hasCoords]);

  useEffect(() => {
    return () => {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
        markerRef.current = null;
      }
    };
  }, []);

  // Nominatim search
  useEffect(() => {
    if (mode !== "search") return;
    if (query.length < 2) { setResults([]); return; }
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      setSearching(true);
      try {
        const res = await fetch(
          `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&limit=5&addressdetails=1&email=${encodeURIComponent(NOMINATIM_EMAIL)}`,
          { headers: { "Accept-Language": "en" } }
        );
        const data = await res.json();
        setResults(data);
      } finally {
        setSearching(false);
      }
    }, 400);
    return () => clearTimeout(debounceRef.current);
  }, [query, mode]);

  const selectResult = (r) => {
    const lat = parseFloat(r.lat);
    const lng = parseFloat(r.lon);
    setQuery(r.display_name);
    setResults([]);

    const addr = r.address || {};
    const town = addr.town || addr.city || addr.village || addr.municipality || addr.hamlet || null;
    const country = addr.country || null;
    let locationName = null;
    if (town && country) locationName = `${town}, ${country}`;
    else if (country) locationName = country;

    seedGeocodeCache(lat, lng, locationName);
    onChange({ location: r.display_name, latitude: lat, longitude: lng, location_name: locationName });
  };

  const handleCoordChange = (latStr, lngStr) => {
    const lat = parseCoord(latStr);
    const lng = parseCoord(lngStr);
    if (!isNaN(lat) && !isNaN(lng) && lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180) {
      onChange({ location: `${lat}, ${lng}`, latitude: lat, longitude: lng, location_name: null });
    } else {
      onChange({ location: "", latitude: null, longitude: null, location_name: null });
    }
  };

  return (
    <div className="space-y-3">
      <Label className="flex items-center gap-1.5">
        <MapPin className="h-3.5 w-3.5 text-primary" />
        Location
      </Label>

      {/* Toggle */}
      <div className="flex rounded-lg border border-border overflow-hidden w-fit text-sm">
        <button
          type="button"
          onClick={() => { setMode("search"); setResults([]); }}
          className={`px-4 py-1.5 transition-colors ${mode === "search" ? "bg-primary text-primary-foreground" : "bg-background text-muted-foreground hover:bg-muted"}`}
        >
          Search address
        </button>
        <button
          type="button"
          onClick={() => { setMode("coords"); setResults([]); }}
          className={`px-4 py-1.5 transition-colors ${mode === "coords" ? "bg-primary text-primary-foreground" : "bg-background text-muted-foreground hover:bg-muted"}`}
        >
          Enter coordinates
        </button>
      </div>

      {/* Mode: search */}
      {mode === "search" && (
        <div className="relative" style={{ minHeight: 0, zIndex: 10000 }}>
          <Input
            placeholder="City, suburb or address"
            value={query}
            onChange={(e) => { setQuery(e.target.value); }}
            autoComplete="off"
          />
          {searching && (
            <div className="absolute right-3 top-2.5 text-xs text-muted-foreground">Searching…</div>
          )}
          {results.length > 0 && (
            <div className="absolute z-[9999] top-full mt-1 w-full rounded-lg border border-border bg-card shadow-lg overflow-hidden">
              {results.map((r) => (
                <button
                  key={r.place_id}
                  type="button"
                  onClick={() => selectResult(r)}
                  className="w-full text-left px-3 py-2.5 text-sm hover:bg-muted transition-colors border-b border-border last:border-0"
                >
                  {r.display_name}
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Mode: coords */}
      {mode === "coords" && (
        <div className="space-y-2">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">Latitude</Label>
              <Input
                type="text"
                inputMode="decimal"
                placeholder="49.7012"
                value={coordLat}
                onChange={(e) => {
                  const val = e.target.value.replace(",", ".");
                  setCoordLat(val);
                  handleCoordChange(val, coordLng);
                }}
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">Longitude</Label>
              <Input
                type="text"
                inputMode="decimal"
                placeholder="6.8523"
                value={coordLng}
                onChange={(e) => {
                  const val = e.target.value.replace(",", ".");
                  setCoordLng(val);
                  handleCoordChange(coordLat, val);
                }}
              />
            </div>
          </div>
          <p className="text-xs text-muted-foreground">Enter decimal coordinates — e.g. 49.7012, 6.8523</p>
        </div>
      )}

      {/* Map */}
      {hasCoords && (
        <div className="space-y-1">
          <div
            ref={mapDivRef}
            style={{ height: 220, borderRadius: 8, overflow: "hidden", border: "1px solid hsl(var(--border))" }}
          />
          <p className="text-xs text-muted-foreground">
            Lat: {typeof latitude === "number" ? latitude.toFixed(6) : latitude}, Lng: {typeof longitude === "number" ? longitude.toFixed(6) : longitude} — drag the pin to adjust
          </p>
        </div>
      )}
    </div>
  );
}