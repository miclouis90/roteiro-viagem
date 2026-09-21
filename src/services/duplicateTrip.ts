import {
  collection,
  doc,
  getDocFromServer,
  getDocsFromServer,
  serverTimestamp,
  writeBatch,
} from "firebase/firestore";
import { db, demoMode } from "../lib/firebase";
import { saveTrip, saveEvent } from "./repository";
import { tripInput, eventInput } from "../utils/inputs";
import type { Trip, TripEvent } from "../types";
export async function duplicateTrip(
  trip: Trip,
  events: TripEvent[],
): Promise<string> {
  let source = trip;
  let programs = events;
  if (!demoMode) {
    if (!db) throw new Error("Firebase não configurado.");
    const snapshot = await getDocFromServer(doc(db, "trips", trip.id));
    if (!snapshot.exists())
      throw new Error("A viagem não está mais disponível.");
    source = { ...snapshot.data(), id: snapshot.id } as Trip;
    const rows = await getDocsFromServer(
      collection(db, "trips", trip.id, "events"),
    );
    programs = rows.docs.map((e) => ({ ...e.data(), id: e.id }) as TripEvent);
  }
  if (
    programs.some((e) => e.date < source.startDate || e.date > source.endDate)
  )
    throw new Error("Ajuste os programas fora do período antes de duplicar.");
  if (programs.length > 498)
    throw new Error(
      "Esta viagem tem muitos programas para duplicar de uma só vez.",
    );
  const copy = {
    ...tripInput(source),
    title: `${source.title.slice(0, 110)} · cópia`,
    isPublic: false,
  };
  if (demoMode) {
    const id = await saveTrip(copy);
    for (const event of programs) await saveEvent(id, eventInput(event));
    return id;
  }
  const database = db!;
  const target = doc(collection(database, "trips"));
  const batch = writeBatch(database);
  batch.set(target, {
    ...copy,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  // Keep the existing rules: the parent must exist before events are written.
  await batch.commit();
  try {
    const programsBatch = writeBatch(database);
    for (const event of programs)
      programsBatch.set(
        doc(collection(database, "trips", target.id, "events")),
        {
          ...eventInput(event),
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        },
      );
    if (programs.length) await programsBatch.commit();
  } catch {
    throw new Error(
      `A cópia privada foi criada, mas seus programas não foram copiados. Abra #/viagem/${target.id} para conferir antes de tentar novamente.`,
    );
  }
  return target.id;
}
