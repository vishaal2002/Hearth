import { useEffect, useMemo, useState } from "react";
import L from "leaflet";
import { MapContainer, TileLayer, Marker, useMap } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import { MapPin } from "lucide-react";
import { EmptyState } from "@/components/hearth";
import { geocode, type LatLng } from "@/lib/geocode";
import type { Moment } from "./memory-card";
import type { ProfileLike } from "@/components/calendar/user-avatar";

type Located = Moment & { coords: LatLng };

/** Build a circular-photo pin (or a hearth dot when there's no photo). */
function pinIcon(m: Moment): L.DivIcon {
  const inner = m.photo_url
    ? `<img class="memory-pin__img" src="${m.photo_url}" alt="" />`
    : `<div class="memory-pin__img memory-pin__fallback">📍</div>`;
  return L.divIcon({
    className: "",
    html: `<div class="memory-pin">${inner}</div>`,
    iconSize: [56, 56],
    iconAnchor: [28, 61],
  });
}

/** Pan/zoom the map to fit every pin whenever the set of points changes. */
function FitBounds({ points }: { points: LatLng[] }) {
  const map = useMap();
  useEffect(() => {
    if (points.length === 0) return;
    if (points.length === 1) {
      map.setView([points[0].lat, points[0].lng], 6);
      return;
    }
    const bounds = L.latLngBounds(points.map((p) => [p.lat, p.lng] as [number, number]));
    map.fitBounds(bounds, { padding: [64, 64], maxZoom: 9 });
  }, [map, points]);
  return null;
}

export default function MapView({
  moments,
  profileById: _profileById,
  onSelect,
}: {
  moments: Moment[];
  profileById: Record<string, ProfileLike>;
  onSelect: (m: Moment) => void;
}) {
  const [map, setMap] = useState<L.Map | null>(null);
  // Coordinates discovered by geocoding the `location` text of moments that
  // don't already carry lat/lng from the database.
  const [resolved, setResolved] = useState<Record<string, LatLng | null>>({});

  const withPlace = useMemo(() => moments.filter((m) => m.location?.trim()), [moments]);

  // Moments that already have coordinates straight from the DB.
  const seeded = useMemo<Located[]>(
    () =>
      withPlace
        .filter((m) => m.lat != null && m.lng != null)
        .map((m) => ({ ...m, coords: { lat: m.lat as number, lng: m.lng as number } })),
    [withPlace],
  );

  // Geocode the rest (one place at a time — the helper rate-limits + caches).
  useEffect(() => {
    let cancelled = false;
    const pending = withPlace.filter(
      (m) => (m.lat == null || m.lng == null) && !(m.id in resolved),
    );
    (async () => {
      for (const m of pending) {
        const coords = await geocode(m.location!);
        if (cancelled) return;
        setResolved((prev) => ({ ...prev, [m.id]: coords }));
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [withPlace, resolved]);

  const located = useMemo<Located[]>(() => {
    const extra = withPlace
      .filter((m) => (m.lat == null || m.lng == null) && resolved[m.id])
      .map((m) => ({ ...m, coords: resolved[m.id]! }));
    return [...seeded, ...extra];
  }, [withPlace, seeded, resolved]);

  const points = useMemo(() => located.map((l) => l.coords), [located]);

  function focus(l: Located) {
    onSelect(l);
    map?.flyTo([l.coords.lat, l.coords.lng], Math.max(map.getZoom(), 6), { duration: 0.9 });
  }

  if (withPlace.length === 0) {
    return (
      <EmptyState
        icon={<MapPin className="h-6 w-6" />}
        title="No places yet"
        description="Add a “Where” to a memory and it’ll appear here on the map."
      />
    );
  }

  return (
    <div className="memory-map flex flex-col gap-4 lg:flex-row">
      {/* Exploration list — click to fly the map to that memory */}
      <aside className="order-2 w-full shrink-0 space-y-1.5 lg:order-1 lg:w-64">
        {located.map((l) => (
          <button
            key={l.id}
            type="button"
            onClick={() => focus(l)}
            className="flex w-full items-center gap-3 rounded-xl border border-border bg-secondary/40 p-2 text-left transition-colors hover:bg-secondary"
          >
            {l.photo_url ? (
              <img
                src={l.photo_url}
                alt=""
                className="h-10 w-10 rounded-lg bg-muted object-cover"
              />
            ) : (
              <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-hearth-muted text-hearth">
                <MapPin className="h-4 w-4" />
              </span>
            )}
            <span className="min-w-0">
              <span className="block truncate text-sm font-medium text-foreground">
                {l.location}
              </span>
              <span className="block truncate text-caption">
                {new Date(l.happened_on + "T00:00:00").toLocaleDateString([], {
                  month: "short",
                  day: "numeric",
                  year: "numeric",
                })}
              </span>
            </span>
          </button>
        ))}
        {located.length < withPlace.length && (
          <p className="px-1 pt-1 text-caption">
            Locating {withPlace.length - located.length} more…
          </p>
        )}
      </aside>

      <div className="order-1 h-[60vh] min-h-[420px] flex-1 overflow-hidden rounded-2xl border border-border lg:order-2">
        <MapContainer
          ref={setMap}
          center={[20, 0]}
          zoom={2}
          scrollWheelZoom
          className="h-full w-full"
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>'
            url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
          />
          <FitBounds points={points} />
          {located.map((l) => (
            <Marker
              key={l.id}
              position={[l.coords.lat, l.coords.lng]}
              icon={pinIcon(l)}
              eventHandlers={{ click: () => focus(l) }}
            />
          ))}
        </MapContainer>
      </div>
    </div>
  );
}
