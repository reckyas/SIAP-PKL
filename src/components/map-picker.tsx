"use client";

/**
 * Map picker berbasis Leaflet.
 *
 * Kenapa client-only?
 * - `leaflet` mengakses `window` saat import → tidak SSR-safe.
 * - Kita dynamic-import internal `react-leaflet` di dalam useEffect
 *   supaya bundle server tidak mencoba resolve `leaflet`.
 *
 * Cara pakai:
 *   <MapPicker value={{lat, lng}} onChange={(c) => ...} />
 *
 * User bisa:
 *   - Klik peta untuk set marker.
 *   - Drag marker.
 *   - Klik tombol "Gunakan lokasi saya" untuk geolocation (opsional).
 */
import { useEffect, useMemo, useRef, useState } from "react";
import type { LatLngExpression, Map as LeafletMap, Marker as LeafletMarker } from "leaflet";
import { MapPin, Crosshair } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export interface MapPickerValue {
  lat: number;
  lng: number;
}

interface MapPickerProps {
  value?: MapPickerValue | null;
  onChange: (value: MapPickerValue) => void;
  /** Default center kalau value kosong (default: Pusat Ponorogo). */
  defaultCenter?: MapPickerValue;
  /** Tinggi container peta dalam px. */
  height?: number;
  disabled?: boolean;
}

const DEFAULT_CENTER: MapPickerValue = { lat: -7.8681, lng: 111.4622 };

export function MapPicker({
  value,
  onChange,
  defaultCenter = DEFAULT_CENTER,
  height = 320,
  disabled,
}: MapPickerProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<LeafletMap | null>(null);
  const markerRef = useRef<LeafletMarker | null>(null);
  const [ready, setReady] = useState(false);

  const initialCenter = useMemo<LatLngExpression>(() => {
    if (value) return [value.lat, value.lng];
    return [defaultCenter.lat, defaultCenter.lng];
  }, [value, defaultCenter]);

  // Inisialisasi peta (client-side only)
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    let mounted = true;
    void (async () => {
      const L = (await import("leaflet")).default;
      // CSS Leaflet — dynamic import juga supaya SSR tidak ikut resolve
      await import("leaflet/dist/leaflet.css");

      if (!mounted || !containerRef.current) return;

      // Fix icon path untuk Next.js bundler. Leaflet default expect path /images/marker-icon.png.
      // Kita inject URL CDN sebagai fallback ringan.
      const iconUrl =
        "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png";
      const iconRetinaUrl =
        "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png";
      const shadowUrl =
        "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png";

      const defaultIcon = L.icon({
        iconUrl,
        iconRetinaUrl,
        shadowUrl,
        iconSize: [25, 41],
        iconAnchor: [12, 41],
        popupAnchor: [1, -34],
        shadowSize: [41, 41],
      });
      L.Marker.prototype.options.icon = defaultIcon;

      const map = L.map(containerRef.current, {
        center: initialCenter,
        zoom: 13,
        scrollWheelZoom: true,
      });
      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution:
          '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
        maxZoom: 19,
      }).addTo(map);

      const marker = L.marker(initialCenter, {
        draggable: !disabled,
      }).addTo(map);

      marker.on("dragend", () => {
        const pos = marker.getLatLng();
        onChange({ lat: pos.lat, lng: pos.lng });
      });

      map.on("click", (e) => {
        if (disabled) return;
        marker.setLatLng(e.latlng);
        onChange({ lat: e.latlng.lat, lng: e.latlng.lng });
      });

      mapRef.current = map;
      markerRef.current = marker;
      setReady(true);
    })();

    return () => {
      mounted = false;
      mapRef.current?.remove();
      mapRef.current = null;
      markerRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Sync external value ke marker (kalau berubah dari luar, mis. tombol "lokasi saya")
  useEffect(() => {
    if (!ready || !markerRef.current || !mapRef.current) return;
    if (!value) return;
    const latlng: LatLngExpression = [value.lat, value.lng];
    markerRef.current.setLatLng(latlng);
    mapRef.current.setView(latlng, mapRef.current.getZoom());
  }, [value, ready]);

  const lat = value?.lat ?? defaultCenter.lat;
  const lng = value?.lng ?? defaultCenter.lng;

  function useMyLocation() {
    if (typeof navigator === "undefined" || !navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        onChange({ lat: pos.coords.latitude, lng: pos.coords.longitude });
      },
      () => {
        /* swallow — user reject geolocation */
      },
    );
  }

  function onLatInput(v: string) {
    const n = Number(v);
    if (Number.isFinite(n)) onChange({ lat: n, lng });
  }
  function onLngInput(v: string) {
    const n = Number(v);
    if (Number.isFinite(n)) onChange({ lat, lng: n });
  }

  return (
    <div className="space-y-2">
      <div
        ref={containerRef}
        className="w-full rounded-md border"
        style={{ height: `${height}px` }}
        aria-label="Peta untuk memilih koordinat"
      />
      <div className="flex flex-wrap items-end gap-2">
        <div className="min-w-[140px] flex-1">
          <Label htmlFor="map-lat" className="text-xs">
            Latitude
          </Label>
          <Input
            id="map-lat"
            value={lat.toFixed(6)}
            onChange={(e) => onLatInput(e.target.value)}
            inputMode="decimal"
            disabled={disabled}
          />
        </div>
        <div className="min-w-[140px] flex-1">
          <Label htmlFor="map-lng" className="text-xs">
            Longitude
          </Label>
          <Input
            id="map-lng"
            value={lng.toFixed(6)}
            onChange={(e) => onLngInput(e.target.value)}
            inputMode="decimal"
            disabled={disabled}
          />
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={useMyLocation}
          disabled={disabled}
        >
          <Crosshair className="h-4 w-4" />
          Lokasi saya
        </Button>
      </div>
      <p className="flex items-start gap-1.5 text-xs text-muted-foreground">
        <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0" />
        Klik peta atau geser marker untuk menyesuaikan koordinat. Anda juga bisa
        isi manual di kolom di atas.
      </p>
    </div>
  );
}
