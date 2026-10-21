import atlas from "../assets/overview/brasilia-atlas.webp";
import type { Trip } from "../types";

export const artworkScenes = ["arches", "coast", "skyline", "hills", "bridge"] as const;
export type ArtworkPhoto = { src: string; size: string; position: string };

export function artworkVariant(seed: string, dayIndex = 0) {
  let hash = 2166136261;
  for (const character of seed) hash = Math.imul(hash ^ character.charCodeAt(0), 16777619) >>> 0;
  return {
    scene: artworkScenes[(hash + dayIndex) % artworkScenes.length],
    palette: (hash >>> 8) % 4,
    sun: 620 + (hash % 4) * 22,
  };
}

export function tripArtworkSeed(trip: Pick<Trip, "id" | "title" | "destinationCity">) {
  return trip.id || `${trip.destinationCity}|${trip.title}`;
}

// Existing local artwork only. This is presentation metadata, never a trip field.
export function tripArtworkPhoto(city: string, dayIndex?: number): ArtworkPhoto | undefined {
  if (city.normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim().toLowerCase() !== "brasilia") return;
  return dayIndex === undefined
    ? { src: atlas, size: "auto 179.65%", position: "54% top" }
    : { src: atlas, size: "500% 225.55%", position: `${(dayIndex % 5) * 25}% bottom` };
}
