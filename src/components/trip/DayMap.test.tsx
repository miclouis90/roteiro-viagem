// @vitest-environment jsdom
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import DayMap from "./DayMap";
import { demoEvents, demoTrip } from "../../data/demo";
import { loadGoogleMaps, mapsConfigured, resolveLocation, type MapsLibraries } from "../../services/googleMaps";

vi.mock("../../services/googleMaps", () => ({ mapsConfigured: vi.fn(), loadGoogleMaps: vi.fn(), resolveLocation: vi.fn() }));
let root: Root, container: HTMLDivElement;
const panTo = vi.fn(), fitBounds = vi.fn(), setZoom = vi.fn(), onSelect = vi.fn(), openInfo = vi.fn(), cleanup = vi.fn();
class Marker {
  static instances: Marker[] = [];
  click = () => {};
  constructor(public options: Record<string, unknown>) { Marker.instances.push(this); }
  addListener(_event: string, callback: () => void) { this.click = callback; return { remove: cleanup }; }
  setMap = cleanup;
  setZIndex = vi.fn();
  setIcon = vi.fn();
}
const api = {
  Map: class { panTo = panTo; fitBounds = fitBounds; setZoom = setZoom; },
  LatLngBounds: class { extend = vi.fn(); },
  InfoWindow: class { setContent = vi.fn(); open = openInfo; close = vi.fn(); },
  Marker, Size: class {}, Point: class {}, event: { clearInstanceListeners: cleanup },
} as unknown as MapsLibraries;
beforeEach(() => {
  vi.clearAllMocks(); Marker.instances = [];
  vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
  Object.defineProperty(Element.prototype, "scrollIntoView", { configurable: true, value: vi.fn() });
  Object.defineProperty(HTMLDialogElement.prototype, "showModal", { configurable: true, value() { this.setAttribute("open", ""); } });
  Object.defineProperty(HTMLDialogElement.prototype, "close", { configurable: true, value() { this.removeAttribute("open"); } });
  container = document.createElement("div"); document.body.append(container); root = createRoot(container);
  vi.mocked(mapsConfigured).mockReturnValue(true);
  vi.mocked(loadGoogleMaps).mockResolvedValue(api);
  vi.mocked(resolveLocation).mockResolvedValue({ lat: -15.8, lng: -47.9 });
});

function routeEvents(count: number, day = "2026-10-29") {
  return Array.from({ length: count }, (_, index) => ({ ...demoEvents[0], id: `route-${index}`, title: `Parada ${index + 1}`, date: day, startTime: `${String(index + 7).padStart(2, '0')}:00`, location: `Local ${index + 1}`, lat: -15 + index / 100, lng: -47.9 })).reverse();
}

it.each([1, 2, 5, 6, 10])("oferece uma única ação consistente para %i locais e mantém todos os pins/paradas", async count => {
  await render(routeEvents(count));
  expect(container.querySelectorAll('.day-map-external')).toHaveLength(1);
  expect(container.querySelector('.day-map-stage .day-map-external')).toBeNull();
  const action = container.querySelector<HTMLElement>('.day-map-external')!;
  expect(action.closest('.day-map-route-action')).not.toBeNull();
  expect(action.textContent).toBe(count === 1 ? 'Abrir local no Google Maps' : 'Abrir rota no Google Maps');
  expect(Marker.instances).toHaveLength(count);
  expect([...container.querySelectorAll('.day-map-stop-copy > strong')].map(title => title.textContent)).toEqual(Array.from({length: count}, (_, index) => `Parada ${index + 1}`));
  expect(container.querySelectorAll('.day-map-stop')).toHaveLength(count);
  if (count <= 5) {
    expect(action.tagName).toBe('A');
    const url = new URL((action as HTMLAnchorElement).href);
    expect(url.pathname).toBe(count === 1 ? '/maps/search/' : '/maps/dir/');
    if (count > 1) {
      expect(url.searchParams.get('origin')).toBe('-15,-47.9');
      expect(url.searchParams.get('destination')).toBe(`${-15 + (count - 1) / 100},-47.9`);
      expect(url.searchParams.get('waypoints')?.split('|') || []).toHaveLength(Math.max(0, count - 2));
    }
    expect(container.querySelector('dialog')).toBeNull();
  } else {
    expect(action.tagName).toBe('BUTTON');
    expect(container.querySelectorAll('a[href*="google.com/maps"]')).toHaveLength(0);
    action.focus();
    await click(action);
    expect(action.getAttribute('aria-expanded')).toBe('true');
    const links = [...container.querySelectorAll<HTMLAnchorElement>('dialog nav a')];
    expect(links).toHaveLength(Math.ceil((count - 1) / 4));
    expect(links[0].textContent).toBe(`Trecho 1 de ${links.length} — paradas 1–5`);
    if (count === 6) expect(links[1].textContent).toBe('Trecho 2 de 2 — paradas 5–6');
    for (let index = 1; index < links.length; index++) {
      expect(new URL(links[index].href).searchParams.get('origin')).toBe(new URL(links[index - 1].href).searchParams.get('destination'));
    }
    expect(links.every(link => link.rel === 'noopener noreferrer' && link.target === '_blank')).toBe(true);
    await click(container.querySelector('dialog [aria-label="Fechar"]')!);
    expect(container.querySelector('dialog')).toBeNull();
    expect(document.activeElement).toBe(action);
    expect(action.getAttribute('aria-expanded')).toBe('false');
  }
  expect(onSelect).not.toHaveBeenCalled();
});

it("fecha os trechos antigos quando a data muda e mantém o destino da nova rota", async () => {
  const events = [...routeEvents(6), ...routeEvents(2, '2026-10-30')];
  await render(events);
  await click(container.querySelector('.day-map-external')!);
  expect(container.querySelector('dialog')).not.toBeNull();
  await render(events, '2026-10-30');
  expect(container.querySelector('dialog')).toBeNull();
  expect(container.querySelectorAll('.day-map-external')).toHaveLength(1);
  expect(container.querySelector('.day-map-external')?.textContent).toBe('Abrir rota no Google Maps');
  expect(container.querySelectorAll('.day-map-stop')).toHaveLength(2);
  expect(container.querySelector('.day-map-external')?.tagName).toBe('A');
});
afterEach(async () => { await act(async () => root.unmount()); container.remove(); vi.restoreAllMocks(); vi.unstubAllGlobals(); });
async function render(events = demoEvents, day = "2026-10-29") { await act(async () => root.render(<DayMap trip={demoTrip} events={events} day={day} onSelect={onSelect} />)); }
async function click(element: Element) { await act(async () => element.dispatchEvent(new MouseEvent("click", { bubbles: true }))); }
it("geocodifica somente o dia, cria pins numerados e enquadra os pontos", async () => {
  await render();
  expect(resolveLocation).toHaveBeenCalledTimes(4);
  expect(Marker.instances.map(marker => (marker.options.label as { text: string }).text)).toEqual(["1", "2", "3", "4"]);
  expect(fitBounds).toHaveBeenCalledOnce();
  expect(container.querySelector(".day-map-summary")?.textContent).toContain("4 no mapa");
});
it("pin seleciona lista/InfoWindow e parada centraliza e abre a ficha existente", async () => {
  await render();
  await act(async () => Marker.instances[1].click());
  expect(container.querySelector('[aria-current="true"]')?.textContent).toContain(demoEvents[1].title);
  expect(openInfo).toHaveBeenCalled(); expect(onSelect).not.toHaveBeenCalled();
  expect(Marker.instances[1].setZIndex).toHaveBeenCalledWith(1000);
  expect(Marker.instances[1].setIcon).toHaveBeenCalled();
  await click(container.querySelectorAll(".day-map-stop")[2]);
  expect(panTo).toHaveBeenCalled(); expect(onSelect).toHaveBeenCalledWith(demoEvents[2]);
});
it("prioriza coordenadas, resolve Place ID e mantém localização inválida na lista", async () => {
  const events = [
    { ...demoEvents[0], lat: -15.8, lng: -47.9 },
    { ...demoEvents[1], placeId: "existing-id", location: "" },
    { ...demoEvents[2], location: "", mapsUrl: "" },
    { ...demoEvents[3], location: "Endereço inválido" },
  ];
  vi.mocked(resolveLocation).mockImplementation(async (_api, request) => request.placeId ? { lat: -15.7, lng: -47.8 } : undefined);
  await render(events);
  expect(Marker.instances).toHaveLength(2);
  expect(resolveLocation).toHaveBeenCalledTimes(2);
  expect(resolveLocation).toHaveBeenCalledWith(api, { placeId: "existing-id" });
  expect(container.querySelectorAll(".day-map-stop")).toHaveLength(4);
  expect(container.querySelectorAll(".day-map-stop")[3].textContent).toContain("Localização indisponível");
  expect(new URL(container.querySelector<HTMLAnchorElement>(".day-map-external")!.href).searchParams.get("destination")).toBe("-15.7,-47.8");
});
it("sem chave não carrega SDK, preserva lista e abertura externa", async () => {
  vi.mocked(mapsConfigured).mockReturnValue(false);
  await render();
  expect(loadGoogleMaps).not.toHaveBeenCalled(); expect(resolveLocation).not.toHaveBeenCalled();
  expect(container.textContent).toContain("O mapa ainda não está configurado");
  expect(container.querySelectorAll(".day-map-stop")).toHaveLength(4);
  expect(container.querySelector(".day-map-external")?.getAttribute("rel")).toBe("noopener noreferrer");
});
it("falha do SDK é amigável e dia sem local não faz requisições", async () => {
  vi.mocked(loadGoogleMaps).mockRejectedValue(new Error("network"));
  await render(); expect(container.textContent).toContain("Não foi possível carregar o mapa");
  vi.clearAllMocks();
  await render([{ ...demoEvents[0], location: "", mapsUrl: "" }]);
  expect(loadGoogleMaps).not.toHaveBeenCalled(); expect(container.textContent).toContain("Nenhuma localização disponível");
  expect(container.textContent).toContain("Localização indisponível");
});

it("troca o dia no mesmo componente e atualiza pins, enquadramento, horários, total e link", async () => {
  vi.mocked(resolveLocation).mockImplementation(async (_api, request) => ({ lat: request.address?.includes("Parque da Cidade") ? -15.9 : -15.8, lng: -47.9 }));
  await render();
  const originalMarkers = [...Marker.instances];
  const previousLink = container.querySelector('.day-map-external')?.getAttribute('href');
  await click(container.querySelector('.day-map-stop')!);
  await render(demoEvents, '2026-10-30');
  originalMarkers.forEach(marker => expect(marker.setMap).toHaveBeenCalledWith(null));
  expect(fitBounds).toHaveBeenCalledTimes(2);
  const newMarkers = Marker.instances.slice(originalMarkers.length);
  expect(newMarkers.map(marker => marker.options.title)).toEqual(['1. Manhã no parque', '2. Uma noite de jazz']);
  expect(container.querySelectorAll('.day-map-stop')).toHaveLength(2);
  expect(container.querySelector('.day-map')?.getAttribute('aria-description')).toContain('30 de outubro');
  expect(container.querySelector('.day-map-stops')?.textContent).toContain('08:30');
  expect(container.querySelector('.day-map-stops')?.textContent).toContain('20:00');
  expect(container.querySelector('.day-map-summary')?.textContent).toContain('120,00');
  expect(container.querySelector('.day-map-stop.selected')).toBeNull();
  const link = container.querySelector<HTMLAnchorElement>('.day-map-external')!.href;
  expect(link).not.toBe(previousLink);
  expect(new URL(link).searchParams.get('origin')).toBe('-15.9,-47.9');
  expect(new URL(link).searchParams.get('destination')).toBe('-15.8,-47.9');
  await click(container.querySelectorAll('.day-map-stop')[1]);
  expect(onSelect).toHaveBeenLastCalledWith(demoEvents[5]);
});

it("ao mudar para dia vazio ou sem localização remove pins antigos, sem criar pins inválidos", async () => {
  const events = [...demoEvents, { ...demoEvents[6], location: '', mapsUrl: '' }];
  await render(events);
  const markerCount = Marker.instances.length;
  await render(events, '2026-11-02');
  expect(container.querySelectorAll('.day-map-stop')).toHaveLength(0);
  expect(container.querySelector('.day-map-external')).toBeNull();
  expect(container.querySelector('.day-map-summary')?.textContent).toContain('Sem estimativas');
  await render([{ ...demoEvents[6], location: '', mapsUrl: '' }], '2026-10-31');
  expect(Marker.instances).toHaveLength(markerCount);
  expect(container.querySelectorAll('.day-map-stop')).toHaveLength(1);
  expect(container.querySelector('.day-map-stop')?.textContent).toContain('Localização indisponível');
});

it("uma geocodificação atrasada do dia anterior não substitui os pins do dia atual", async () => {
  let finishOld!: (point: {lat: number; lng: number}) => void;
  const pending = new Promise<{lat: number; lng: number}>(resolve => { finishOld = resolve; });
  vi.mocked(resolveLocation).mockImplementation(async (_api, request) => request.address?.startsWith('Eixo Monumental') ? pending : {lat: -15.8, lng: -47.9});
  await render();
  await render(demoEvents, '2026-10-30');
  expect(Marker.instances).toHaveLength(2);
  await act(async () => finishOld({lat: -15.7, lng: -47.8}));
  expect(Marker.instances).toHaveLength(2);
  expect(fitBounds).toHaveBeenCalledOnce();
  expect(container.querySelector('.day-map-stops')?.textContent).toContain('Manhã no parque');
  expect(container.querySelector('.day-map-stops')?.textContent).not.toContain('Um encontro com a arte');
});
