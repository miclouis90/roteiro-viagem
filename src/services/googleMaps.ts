import { coordinates, type Coordinates } from "../utils/dayMap";

export interface MapInstance {
  fitBounds(bounds: Bounds, padding: number): void;
  panTo(position: Coordinates): void;
  setZoom(zoom: number): void;
}
interface Listener { remove(): void }
interface Bounds { extend(position: Coordinates): void }
export interface MapMarker {
  addListener(event: string, callback: () => void): Listener;
  setMap(map: MapInstance | null): void;
  setZIndex(value: number): void;
  setIcon(icon: Record<string, unknown>): void;
}
export interface GeocodeRequest { address?: string; placeId?: string }
export interface GeocodeResult {
  geometry: { location: { lat(): number; lng(): number } };
}
export interface MapsLibraries {
  Map: new (element: HTMLElement, options: Record<string, unknown>) => MapInstance;
  LatLngBounds: new () => Bounds;
  InfoWindow: new () => {
    setContent(content: HTMLElement): void;
    open(options: { map: MapInstance; anchor: MapMarker; shouldFocus: boolean }): void;
    close(): void;
  };
  Marker: new (options: Record<string, unknown>) => MapMarker;
  Geocoder: new () => { geocode(request: GeocodeRequest): Promise<{ results: GeocodeResult[] }> };
  Size: new (width: number, height: number) => unknown;
  Point: new (x: number, y: number) => unknown;
  event: { clearInstanceListeners(instance: unknown): void };
}
interface MapsGlobal {
  maps: { importLibrary(name: string): Promise<Record<string, unknown>> };
}
type MapsWindow = Window & { google?: MapsGlobal; rumoMapsReady?: () => void; gm_authFailure?: () => void };
let loading: Promise<MapsLibraries> | undefined;
export function mapsConfigured() { return Boolean(import.meta.env.VITE_GOOGLE_MAPS_API_KEY?.trim()); }

export function loadGoogleMaps(): Promise<MapsLibraries> {
  if (!mapsConfigured()) return Promise.reject(new Error("maps-unconfigured"));
  if (loading) return loading;
  const host = window as MapsWindow;
  loading = (async () => {
    if (!host.google?.maps.importLibrary) await new Promise<void>((resolve, reject) => {
      const script = document.createElement("script");
      script.id = "rumo-google-maps";
      const fail = () => { cleanup(); script.remove(); reject(new Error("maps-unavailable")); };
      const timeout = window.setTimeout(fail, 15000);
      function cleanup() { window.clearTimeout(timeout); delete host.rumoMapsReady; }
      host.rumoMapsReady = () => { cleanup(); resolve(); };
      script.onerror = fail;
      script.async = true;
      const params = new URLSearchParams({ key: import.meta.env.VITE_GOOGLE_MAPS_API_KEY, loading: "async", callback: "rumoMapsReady", v: "weekly", language: "pt-BR" });
      script.src = `https://maps.googleapis.com/maps/api/js?${params}`;
      script.nonce = document.querySelector<HTMLScriptElement>("script[nonce]")?.nonce || "";
      document.head.append(script);
    });
    const maps = host.google!.maps;
    const libraries = await Promise.all([maps.importLibrary("maps"), maps.importLibrary("marker"), maps.importLibrary("geocoding"), maps.importLibrary("core")]);
    return Object.assign({}, ...libraries) as MapsLibraries;
  })().catch(() => { loading = undefined; throw new Error("maps-unavailable"); });
  return loading;
}

// Session-only deduplication: no localStorage or Firestore geocoding cache.
const locations = new Map<string, Promise<Coordinates | undefined>>();
export async function resolveLocation(api: MapsLibraries, request: GeocodeRequest): Promise<Coordinates | undefined> {
  const key = JSON.stringify(request);
  const cached = locations.get(key);
  if (cached) return cached;
  const promise = (async () => {
    let timer: number | undefined;
    try {
      const response = await Promise.race([
        new api.Geocoder().geocode(request),
        new Promise<never>((_, reject) => { timer = window.setTimeout(() => reject(new Error("geocode-timeout")), 12000); }),
      ]);
      const point = response.results[0]?.geometry.location;
      return point ? coordinates({ lat: point.lat(), lng: point.lng() }) : undefined;
    } catch { return undefined; }
    finally { window.clearTimeout(timer); }
  })();
  locations.set(key, promise);
  const result = await promise;
  if (!result) locations.delete(key);
  return result;
}
