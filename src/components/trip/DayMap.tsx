import { useEffect, useMemo, useRef, useState } from "react";
import { ChevronRight, Clock3, ExternalLink, MapPin, Map as MapIcon, Route, Wallet, LoaderCircle } from "lucide-react";
import type { Trip, TripEvent } from "../../types";
import { categoryOf } from "../../data/categories";
import { CategoryChip } from "../ui/Primitives";
import { Modal } from "../Modal";
import { formatDate } from "../../utils/dates";
import { spendingLabel } from "../../utils/spending";
import { isLodging, timeOnDay } from "../../utils/lodging";
import { dayMapStops, geocodeAddress, googleMapsLinks, type LocatedStop, type MapsLink } from "../../utils/dayMap";
import { loadGoogleMaps, mapsConfigured, resolveLocation, type MapInstance, type MapMarker } from "../../services/googleMaps";
import "../../day-map.css";

const pinTokens = { food: "--color-food", night: "--color-drink", culture: "--color-culture", outdoor: "--color-outdoor", transport: "--color-transport", lodging: "--color-lodging", other: "--color-other" };
type Status = "loading" | "ready" | "unconfigured" | "error" | "empty";
interface MapControl { select(id: string): void; destroy(): void }

export default function DayMap({ trip, events, day, onSelect }: {
  trip: Trip; events: TripEvent[]; day: string; onSelect: (event: TripEvent) => void;
}) {
  const stops = useMemo(() => dayMapStops(events, day), [events, day]);
  const mapElement = useRef<HTMLDivElement>(null);
  const controls = useRef<MapControl | null>(null);
  const stopElements = useRef(new Map<string, HTMLButtonElement>());
  const [status, setStatus] = useState<Status>(() => mapsConfigured() ? "loading" : "unconfigured");
  const [located, setLocated] = useState<LocatedStop[]>([]);
  const [selectedId, setSelectedId] = useState("");
  const [retry, setRetry] = useState(0);
  const geocodingTrip = useRef(trip);

  // Unrelated trip edits must not rebuild the map; only destination fields do.
  useEffect(() => { geocodingTrip.current = trip; }, [trip]);

  useEffect(() => {
    const canvas = mapElement.current;
    const destinationTrip = geocodingTrip.current;
    let cancelled = false;
    let authenticationFailed = false;
    setLocated([]);
    setSelectedId("");
    const host = window as Window & { gm_authFailure?: () => void };
    const previousAuthFailure = host.gm_authFailure;
    const authFailure = () => { authenticationFailed = true; if (!cancelled) setStatus("error"); };
    host.gm_authFailure = authFailure;
    async function initialize() {
      if (!mapsConfigured()) { setStatus("unconfigured"); return; }
      if (!stops.some(stop => stop.position || stop.placeId || stop.address)) { setStatus("empty"); return; }
      setStatus("loading");
      try {
        const api = await loadGoogleMaps();
        if (cancelled) return;
        if (authenticationFailed) throw new Error("maps-authentication");
        const resolved: LocatedStop[] = [...stops];
        let cursor = 0;
        // Bounded requests and cancellation; opening the map never resolves other days.
        async function worker() {
          while (!cancelled && cursor < stops.length) {
            const index = cursor++, stop = stops[index];
            let position = stop.position;
            if (!position && stop.placeId) position = await resolveLocation(api, { placeId: stop.placeId });
            if (!cancelled && !position && stop.address) position = await resolveLocation(api, { address: geocodeAddress(stop, destinationTrip) });
            resolved[index] = { ...stop, position };
          }
        }
        await Promise.all(Array.from({ length: Math.min(3, stops.length) }, worker));
        if (cancelled || !canvas) return;
        if (authenticationFailed) throw new Error("maps-authentication");
        setLocated(resolved);
        const valid = resolved.filter(stop => stop.position);
        if (!valid.length) { setStatus("empty"); return; }
        const map: MapInstance = new api.Map(canvas, {
          center: valid[0].position, zoom: 13, mapTypeControl: false, streetViewControl: false,
          fullscreenControl: false, gestureHandling: "cooperative", clickableIcons: false,
          zoomControlOptions: { position: 7 },
        });
        const bounds = new api.LatLngBounds();
        const info = new api.InfoWindow();
        const markers = new Map<string, MapMarker>();
        const pinIcons = new Map<string, Record<string, unknown>>();
        const listeners: { remove(): void }[] = [];
        function select(id: string) {
          const stop = resolved.find(stop => stop.event.id === id), marker = markers.get(id);
          setSelectedId(id);
          markers.forEach((entry, eventId) => {
            const selected = eventId === id;
            entry.setZIndex(selected ? 1000 : 1);
            entry.setIcon({ ...pinIcons.get(eventId), scaledSize: new api.Size(selected ? 44 : 38, selected ? 56 : 48), anchor: new api.Point(selected ? 22 : 19, selected ? 54 : 46), labelOrigin: new api.Point(selected ? 22 : 19, selected ? 22 : 19) });
          });
          if (!stop?.position || !marker) { info.close(); return; }
          map.panTo(stop.position);
          const content = document.createElement("div");
          content.className = "day-map-infowindow";
          const title = document.createElement("strong"); title.textContent = stop.event.title;
          const meta = document.createElement("span"); meta.textContent = [stop.event.startTime || "Horário a definir", stop.event.category].join(" · ");
          const address = document.createElement("span"); address.textContent = stop.address || "Local do programa";
          content.append(title, meta, address);
          info.setContent(content);
          info.open({ map, anchor: marker, shouldFocus: false });
        }
        for (const stop of valid) {
          const color = getComputedStyle(document.documentElement).getPropertyValue(pinTokens[categoryOf(stop.event.category).group]).trim() || "#173b42";
          const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="38" height="48" viewBox="0 0 38 48"><path d="M19 46C15 38 2 29 2 19a17 17 0 1 1 34 0c0 10-13 19-17 27Z" fill="${color}" stroke="white" stroke-width="2"/></svg>`;
          const icon = { url: "data:image/svg+xml;charset=UTF-8," + encodeURIComponent(svg), scaledSize: new api.Size(38, 48), anchor: new api.Point(19, 46), labelOrigin: new api.Point(19, 19) };
          pinIcons.set(stop.event.id, icon);
          const marker = new api.Marker({ map, position: stop.position, title: `${stop.number}. ${stop.event.title}`, optimized: false,
            icon,
            label: { text: String(stop.number), color: "white", fontSize: "14px", fontWeight: "700" },
          });
          markers.set(stop.event.id, marker);
          bounds.extend(stop.position!);
          listeners.push(marker.addListener("click", () => {
            select(stop.event.id);
            stopElements.current.get(stop.event.id)?.scrollIntoView({ behavior: window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ? "instant" : "smooth", block: "nearest" });
          }));
        }
        if (valid.length === 1) { map.panTo(valid[0].position!); map.setZoom(15); }
        else map.fitBounds(bounds, 48);
        controls.current = { select, destroy() {
          info.close(); listeners.forEach(listener => listener.remove()); markers.forEach(marker => marker.setMap(null));
          api.event.clearInstanceListeners(map);
        } };
        setStatus("ready");
      } catch { if (!cancelled) setStatus("error"); }
    }
    void initialize();
    return () => {
      cancelled = true;
      controls.current?.destroy(); controls.current = null;
      if (host.gm_authFailure === authFailure) host.gm_authFailure = previousAuthFailure;
      canvas?.replaceChildren();
    };
  }, [stops, trip.destinationCity, trip.destinationState, trip.country, retry]);

  const resolved = status === "ready" || (status === "empty" && located.length > 0);
  const visibleStops = resolved ? located : stops;
  const links = googleMapsLinks((resolved ? located.filter(stop => stop.position) : stops).map(stop => ({ ...stop, address: geocodeAddress(stop, trip) })));
  const validCount = located.filter(stop => stop.position).length;
  const messages: Record<Exclude<Status, "ready">, [string, string]> = {
    loading: ["Preparando o mapa do seu dia…", "Localizando as paradas do roteiro."],
    unconfigured: ["O mapa ainda não está configurado", "As paradas continuam aqui. Você também pode abri-las no Google Maps."],
    error: ["Não foi possível carregar o mapa", "Confira a conexão ou abra as paradas no Google Maps."],
    empty: [stops.length ? "Nenhuma localização disponível" : "Um dia para descobrir", stops.length ? "Os programas continuam na lista abaixo." : "Os programas deste dia aparecerão aqui quando forem adicionados."],
  };
  return <section className="day-map" aria-label="Mapa do dia" aria-description={formatDate(day, { weekday: "long", day: "numeric", month: "long" })}>
    <div className="day-map-composition">
      <div className="day-map-stage">
        <div ref={mapElement} className="day-map-canvas" aria-label="Mapa das paradas do dia" />
        {status !== "ready" && <div className="day-map-message" role="status">
          {status === "loading" ? <LoaderCircle className="day-map-spinner" size={29} aria-hidden="true" /> : <MapIcon size={30} strokeWidth={1.5} aria-hidden="true" />}
          <strong>{messages[status][0]}</strong><p>{messages[status][1]}</p>
          {status === "error" && <button className="secondary" onClick={() => setRetry(value => value + 1)}>Tentar novamente</button>}
        </div>}
      </div>
      <div className="day-map-summary" aria-label="Resumo do dia">
        <div><span className="day-map-summary-icon"><MapPin size={21} aria-hidden="true" /></span><span><strong>{stops.length} {stops.length === 1 ? "parada" : "paradas"}</strong><small>{status === "ready" ? `${validCount} no mapa` : "no seu roteiro"}</small></span></div>
        <div><span className="day-map-summary-icon"><Wallet size={20} aria-hidden="true" /></span><span><strong>{spendingLabel(stops.map(stop => stop.event).filter(event => event.date === day), trip.currency)}</strong><small>estimativa do dia</small></span></div>
        <div><span className="day-map-summary-icon"><Route size={21} aria-hidden="true" /></span><span><strong>Em ordem</strong><small>do roteiro</small></span></div>
      </div>
    </div>
    <GoogleMapsAction key={`${day}:${links.map(link => link.url).join("|")}`} links={links} />
    {stops.some(stop => isLodging(stop.event)) && <p className="field-help">Hospedagem contabilizada uma única vez, no dia do check-in.</p>}
    <ol className="day-map-stops" aria-label="Paradas em ordem do roteiro">
      {visibleStops.map(stop => {
        const category = categoryOf(stop.event.category), Icon = category.icon;
        const unavailable = (!stop.position && !stop.address && !stop.placeId) || (resolved && !stop.position);
        return <li key={stop.event.id} className={`tone-${category.tone}`}>
          <button ref={element => { if (element) stopElements.current.set(stop.event.id, element); else stopElements.current.delete(stop.event.id); }} className={`day-map-stop ${selectedId === stop.event.id ? "selected" : ""}`} aria-current={selectedId === stop.event.id ? "true" : undefined} onClick={() => {
            setSelectedId(stop.event.id); controls.current?.select(stop.event.id); onSelect(stop.event);
          }}>
            <span className="day-map-number">{stop.number}</span>
            <span className="day-map-stop-visual" aria-hidden="true"><Icon size={29} strokeWidth={1.6} /></span>
            <span className="day-map-stop-copy"><strong>{stop.event.title}</strong>
              <span className="day-map-stop-meta"><CategoryChip name={stop.event.category} /><span><Clock3 size={12} aria-hidden="true" />{timeOnDay(stop.event, day) || (isLodging(stop.event) ? "Estadia" : "A definir")}</span></span>
              <span className="day-map-stop-address"><MapPin size={13} aria-hidden="true" />{unavailable ? "Localização indisponível" : stop.address || "Local do programa"}</span>
            </span><ChevronRight className="day-map-stop-arrow" size={17} aria-hidden="true" />
          </button>
        </li>;
      })}
    </ol>
  </section>;
}

function GoogleMapsAction({ links }: { links: MapsLink[] }) {
  const [open, setOpen] = useState(false);
  if (!links.length) return null;
  const multiple = links.length > 1;
  const singlePlace = !multiple && links[0].first === links[0].last;
  const label = singlePlace ? "Abrir local no Google Maps" : "Abrir rota no Google Maps";
  const Icon = singlePlace ? MapPin : Route;
  return <>
    <div className="day-map-route-action">
      {multiple ? <button type="button" className="day-map-external" aria-haspopup="dialog" aria-expanded={open} onClick={() => setOpen(true)}><Icon size={18} aria-hidden="true" />{label}<ExternalLink size={13} aria-hidden="true" /></button>
        : <a className="day-map-external" href={links[0].url} target="_blank" rel="noopener noreferrer"><Icon size={18} aria-hidden="true" />{label}<ExternalLink size={13} aria-hidden="true" /></a>}
    </div>
    {open && multiple && <Modal title="Abrir rota no Google Maps" onClose={() => setOpen(false)}>
      <p className="muted">Abra os trechos na ordem do roteiro.</p>
      <nav className="day-map-route-segments" aria-label="Trechos no Google Maps">
        {links.map((link, index) => <a key={`${link.first}-${link.last}`} href={link.url} target="_blank" rel="noopener noreferrer">Trecho {index + 1} de {links.length} — paradas {link.first}–{link.last}<ExternalLink size={14} aria-hidden="true" /></a>)}
      </nav>
    </Modal>}
  </>;
}
