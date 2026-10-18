// @vitest-environment jsdom
import { afterEach, expect, it, vi } from "vitest";

afterEach(() => {
  vi.unstubAllEnvs(); vi.unstubAllGlobals(); vi.resetModules();
  document.querySelector('#rumo-google-maps')?.remove();
});
it("sem chave rejeita de forma segura, sem injetar SDK", async () => {
  vi.stubEnv('VITE_GOOGLE_MAPS_API_KEY', '');
  const { mapsConfigured, loadGoogleMaps } = await import('./googleMaps');
  expect(mapsConfigured()).toBe(false);
  await expect(loadGoogleMaps()).rejects.toThrow('maps-unconfigured');
  expect(document.querySelector('#rumo-google-maps')).toBeNull();
});
it("carrega uma única vez e importa somente bibliotecas do mapa", async () => {
  vi.stubEnv('VITE_GOOGLE_MAPS_API_KEY', 'test-placeholder');
  const importLibrary = vi.fn().mockResolvedValue({});
  vi.stubGlobal('google', { maps: { importLibrary } });
  const { loadGoogleMaps } = await import('./googleMaps');
  await Promise.all([loadGoogleMaps(), loadGoogleMaps()]);
  expect(importLibrary.mock.calls.map(call => call[0])).toEqual(['maps', 'marker', 'geocoding', 'core']);
  expect(document.querySelector('#rumo-google-maps')).toBeNull();
});
it("cache em memória deduplica geocodificação e falha não bloqueia uma nova tentativa", async () => {
  const { resolveLocation } = await import('./googleMaps');
  const geocode = vi.fn().mockResolvedValue({ results: [{ geometry: { location: { lat: () => -15.8, lng: () => -47.9 } } }] });
  const api = { Geocoder: class { geocode = geocode; } } as unknown as import('./googleMaps').MapsLibraries;
  await Promise.all([resolveLocation(api, { address: 'Mesmo local' }), resolveLocation(api, { address: 'Mesmo local' })]);
  expect(geocode).toHaveBeenCalledTimes(1);
  geocode.mockRejectedValueOnce(new Error('ZERO_RESULTS'));
  expect(await resolveLocation(api, { address: 'Outro local' })).toBeUndefined();
  expect(await resolveLocation(api, { address: 'Outro local' })).toEqual({ lat: -15.8, lng: -47.9 });
  expect(geocode).toHaveBeenCalledTimes(3);
});
