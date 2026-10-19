import { describe, expect, it } from "vitest";
import { demoEvents, demoTrip } from "../data/demo";
import { dayMapStops, geocodeAddress, googleMapsLinks, mapSearch } from "./dayMap";

describe("mapa do dia", () => {
  it("seleciona somente o dia e numera por horário sem modificar os dados", () => {
    const events = [...demoEvents].reverse();
    const stops = dayMapStops(events, "2026-10-29");
    expect(stops.map(stop => stop.event.startTime)).toEqual(["09:00", "11:00", "13:00", "17:30"]);
    expect(stops.map(stop => stop.number)).toEqual([1, 2, 3, 4]);
    expect(events[0]).toBe(demoEvents[demoEvents.length - 1]);
  });
  it("prioriza coordenadas existentes e lê Place ID sem interpretar a câmera como local", () => {
    const base = demoEvents[0];
    const events = [
      { ...base, id: "a", lat: -15.8, lng: -47.9, placeId: "known", location: "" },
      { ...base, id: "b", coordinates: { latitude: -15.7, longitude: -47.8 }, location: "" },
      { ...base, id: "c", location: "", mapsUrl: "https://www.google.com/maps/search/?api=1&query=-15.9,-47.7&query_place_id=known-link" },
      { ...base, id: "d", location: "", mapsUrl: "https://www.google.com/maps/@-15.9,-47.7,13z" },
      { ...base, id: "e", lat: 999, lng: 999, location: "", mapsUrl: "bad link" },
    ];
    const stops = dayMapStops(events, base.date);
    expect(stops[0].position).toEqual({ lat: -15.8, lng: -47.9 });
    expect(stops[0].placeId).toBe("known");
    expect(stops[1].position).toEqual({ lat: -15.7, lng: -47.8 });
    expect(stops[2].placeId).toBe("known-link");
    expect(stops[3].position).toBeUndefined(); expect(stops[3].address).toBe("");
    expect(stops[4].position).toBeUndefined();
  });
  it("contextualiza endereço pelo destino e nunca geocodifica apenas o título", () => {
    const stop = dayMapStops([demoEvents[0]], demoEvents[0].date)[0];
    expect(geocodeAddress(stop, demoTrip)).toContain("Brasília");
    expect(geocodeAddress({ ...stop, address: "" }, demoTrip)).toBe("");
  });
  it("abre/volta deterministicamente mantendo dia, viagem e parâmetros", () => {
    const params = new URLSearchParams("tab=roteiro&day=2026-10-29&invite=shared&type=programs");
    const opened = mapSearch(params, "2026-10-31", true);
    expect(opened.get("map")).toBe("day");
    const returned = mapSearch(opened, "2026-10-31", false);
    expect(returned.toString()).toBe("tab=roteiro&day=2026-10-31&invite=shared&type=programs");
    expect(params.get("day")).toBe("2026-10-29");
  });
  it("gera Directions URL em ordem, omitindo locais indisponíveis", () => {
    const stops = dayMapStops(demoEvents, "2026-10-29");
    const links = googleMapsLinks([...stops.slice(0, 2), { ...stops[2], address: "", position: undefined, placeId: undefined }, stops[3]]);
    const url = new URL(links[0].url);
    expect(url.pathname).toBe("/maps/dir/");
    expect(url.searchParams.get("origin")).toBe(stops[0].address);
    expect(url.searchParams.get("destination")).toBe(stops[3].address);
    expect(url.searchParams.get("waypoints")).toBe(stops[1].address);
    expect(url.searchParams.has("optimize")).toBe(false);
  });
  it("abre um único ponto como busca e divide dias longos sem perder paradas", () => {
    const stop = dayMapStops(demoEvents, "2026-10-29")[0];
    expect(new URL(googleMapsLinks([stop])[0].url).pathname).toBe("/maps/search/");
    expect(googleMapsLinks([])).toEqual([]);
    const links = googleMapsLinks(Array.from({ length: 10 }, (_, i) => ({ ...stop, number: i + 1, address: `Local ${i + 1}` })));
    expect(links.map(link => [link.first, link.last])).toEqual([[1, 5], [5, 9], [9, 10]]);
    expect(new URL(links[0].url).searchParams.get("waypoints")).toBe("Local 2|Local 3|Local 4");
  });
  it.each([1, 2, 5, 6, 9, 10, 14])("preserva todas as %i localizações em ordem, com até três pontos intermediários", count => {
    const stop = dayMapStops(demoEvents, "2026-10-29")[0];
    const stops = Array.from({ length: count }, (_, index) => ({ ...stop, number: index + 1, address: `Local ${index + 1}` }));
    const links = googleMapsLinks(stops);
    if (count === 1) {
      expect(links).toHaveLength(1);
      const url = new URL(links[0].url);
      expect(url.pathname).toBe('/maps/search/');
      expect(url.searchParams.get('query')).toBe('Local 1');
      expect(url.searchParams.has('origin')).toBe(false);
      return;
    }
    expect(links).toHaveLength(Math.ceil((count - 1) / 4));
    const visited: string[] = [];
    for (const [index, link] of links.entries()) {
      const url = new URL(link.url);
      expect(url.pathname).toBe('/maps/dir/');
      const waypoints = url.searchParams.get('waypoints')?.split('|') || [];
      expect(waypoints.length).toBeLessThanOrEqual(3);
      const points = [url.searchParams.get('origin')!, ...waypoints, url.searchParams.get('destination')!];
      expect(points[0]).toBe(`Local ${link.first}`);
      expect(points.at(-1)).toBe(`Local ${link.last}`);
      if (index > 0) {
        expect(link.first).toBe(links[index - 1].last);
        expect(points[0]).toBe(visited.at(-1));
      }
      visited.push(...(index ? points.slice(1) : points));
      expect(url.searchParams.has('optimize')).toBe(false);
    }
    expect(visited).toEqual(stops.map(stop => stop.address));
  });
});
