import {
  collection,
  doc,
  getDocFromServer,
  getDocsFromServer,
  serverTimestamp,
  writeBatch,
} from "firebase/firestore";
import { auth, db, demoMode } from "../lib/firebase";
import { saveTrip, saveEvent } from "./repository";
import { tripInput, eventInput } from "../utils/inputs";
import type { Trip, TripEvent } from "../types";
import { isLodging, reservationData, splitLodgingReservation } from "../utils/lodging";
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
    if (programs.some(isLodging)) {
      const reservations = await getDocsFromServer(collection(db, "trips", trip.id, "lodgingReservations"));
      const privateById = new Map(reservations.docs.map(d => [d.id, reservationData(d.data())]));
      programs = programs.map(event => isLodging(event) ? { ...event, details: { ...event.details!, ...privateById.get(event.id) } } : event);
    }
  }
  if (
    programs.some((e) => e.date < source.startDate || e.date > source.endDate)
  )
    throw new Error("Ajuste os programas fora do período antes de duplicar.");
  if (programs.length + programs.filter(event => Object.keys(splitLodgingReservation(event).reservation).length > 0).length > 498)
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
    ownerId: auth!.currentUser!.uid,
    access: "PRIVATE",
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  // Keep the existing rules: the parent must exist before events are written.
  await batch.commit();
  try {
    // Private reservations validate their associated event with getAfter.
    // Keep lodging batches below the rules document-access limit.
    const batchSize = programs.some(isLodging) ? 8 : Math.max(1, programs.length);
    for (let offset = 0; offset < programs.length; offset += batchSize) {
      const programsBatch = writeBatch(database);
      for (const event of programs.slice(offset, offset + batchSize)) {
        const eventRef = doc(collection(database, "trips", target.id, "events"));
        const { publicInput, reservation } = splitLodgingReservation(eventInput(event));
        programsBatch.set(eventRef, {
          ...publicInput,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
        if (Object.keys(reservation).length) {
          programsBatch.set(
            doc(database, "trips", target.id, "lodgingReservations", eventRef.id),
            { ...reservation, updatedAt: serverTimestamp() },
          );
        }
      }
      await programsBatch.commit();
    }
  } catch {
    throw new Error(
      `A cópia privada foi criada, mas seus programas não foram copiados. Abra #/viagem/${target.id} para conferir antes de tentar novamente.`,
    );
  }
  return target.id;
}
