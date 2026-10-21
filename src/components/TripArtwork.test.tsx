// @vitest-environment jsdom
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { DestinationArtwork, TripArtwork } from "./TripArtwork";
import { artworkVariant, tripArtworkPhoto } from "../utils/tripArtwork";
import { demoTrip } from "../data/demo";

let root: Root, container: HTMLDivElement;
beforeEach(() => {
  vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
  container = document.createElement("div"); document.body.append(container);
  root = createRoot(container);
});
afterEach(async () => { await act(async () => root.unmount()); container.remove(); vi.unstubAllGlobals(); });

it("mantém a composição estável e diferencia os cinco dias sem aleatoriedade", () => {
  expect(artworkVariant("lolla-2027")).toEqual(artworkVariant("lolla-2027"));
  expect(new Set(Array.from({ length: 5 }, (_, index) => artworkVariant("lolla-2027", index).scene)).size).toBe(5);
  expect(artworkVariant("lolla-2027")).not.toEqual(artworkVariant("brasilia-demo"));
});

it("preserva o atlas local e seus recortes, sem inventar foto para outro destino", () => {
  expect(tripArtworkPhoto("  BRASÍLIA ")?.src).toContain("brasilia-atlas.webp");
  expect(new Set(Array.from({ length: 5 }, (_, index) => tripArtworkPhoto("Brasília", index)?.position)).size).toBe(5);
  expect(tripArtworkPhoto("São Paulo")).toBeUndefined();
});

it("ilustra viagem sem foto e seus dias sem modificar os dados", async () => {
  const trip = { ...demoTrip, id: "lolla-2027", title: "Lolla 2027", destinationCity: "São Paulo" };
  const baseline = structuredClone(trip);
  await act(async () => root.render(<>{[0, 1, 2].map(index => <TripArtwork key={index} trip={trip} dayIndex={index} />)}</>));
  expect(container.querySelectorAll(".is-illustrated svg")).toHaveLength(3);
  expect(container.querySelector("img")).toBeNull();
  expect(new Set([...container.querySelectorAll(".trip-artwork")].map(el => el.getAttribute("data-scene"))).size).toBe(3);
  expect([...container.querySelectorAll(".trip-artwork")].every(el => el.getAttribute("aria-hidden") === "true")).toBe(true);
  expect(trip).toEqual(baseline);
});

it("mantém a fotografia quando carrega e troca por vetor quando falha", async () => {
  const photo = tripArtworkPhoto("Brasília")!;
  await act(async () => root.render(<DestinationArtwork seed="trip" photo={photo} />));
  const image = container.querySelector("img")!;
  await act(async () => image.dispatchEvent(new Event("load")));
  expect(container.querySelector(".has-photo")).not.toBeNull();
  expect(container.querySelector(".trip-artwork-photo")?.getAttribute("style")).toContain("brasilia-atlas.webp");
  await act(async () => image.dispatchEvent(new Event("error")));
  expect(container.querySelector(".is-illustrated svg")).not.toBeNull();
  expect(container.querySelector(".trip-artwork-photo")).toBeNull();
  expect(container.querySelector("img")).toBeNull();
});

it("tenta carregar uma nova fonte após a anterior falhar", async () => {
  await act(async () => root.render(<DestinationArtwork seed="trip" photo={{ src: "/missing-cover.webp", position: "center", size: "cover" }} />));
  await act(async () => container.querySelector("img")!.dispatchEvent(new Event("error")));
  await act(async () => root.render(<DestinationArtwork seed="trip" photo={tripArtworkPhoto("Brasília")} />));
  expect(container.querySelector(".has-photo img")?.getAttribute("src")).toContain("brasilia-atlas.webp");
});
