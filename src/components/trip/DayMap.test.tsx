// @vitest-environment jsdom
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import DayMap from "./DayMap";
import { demoEvents, demoTrip } from "../../data/demo";
import { loadGoogleMaps, mapsConfigured, resolveLocation, type MapsLibraries } from "../../services/googleMaps";

vi.mock("../../services/googleMaps", () => ({ mapsConfigured: vi.fn(), loadGoogleMaps: vi.fn(), resolveLocation: vi.fn() }));
let root: Root, container: HTMLDivElement;
const panTo = vi.fn(), fitBounds = vi.fn(), setZoom = vi.fn(), onSelect = vi.fn(), back = vi.fn(), openInfo = vi.fn(), cleanup = vi.fn();
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
  container = document.createElement("div"); document.body.append(container); root = createRoot(container);
  vi.mocked(mapsConfigured).mockReturnValue(true);
  vi.mocked(loadGoogleMaps).mockResolvedValue(api);
  vi.mocked(resolveLocation).mockResolvedValue({ lat: -15.8, lng: -47.9 });
});
afterEach(async () => { await act(async () => root.unmount()); container.remove(); vi.restoreAllMocks(); vi.unstubAllGlobals(); });
async function render(events = demoEvents) { await act(async () => root.render(<DayMap trip={demoTrip} events={events} day="2026-10-29" onBack={back} onSelect={onSelect} />)); }
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
  await click(container.querySelector(".day-map-back")!); expect(back).toHaveBeenCalledOnce();
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
