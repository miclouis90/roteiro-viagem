import {
  addDoc,
  collection,
  deleteDoc,
  deleteField,
  doc,
  getDocs,
  onSnapshot,
  query,
  serverTimestamp,
  setDoc,
  where,
  writeBatch,
  updateDoc,
} from "firebase/firestore";
import { db, demoMode } from "../lib/firebase";
import { demoTrip, demoEvents } from "../data/demo";
import type { Trip, TripEvent, TripInput, EventInput } from "../types";
const key = "rumo-demo-v1";
interface DemoStore {
  trips: Trip[];
  events: Record<string, TripEvent[]>;
}
function read(): DemoStore {
  const raw = localStorage.getItem(key);
  return raw
    ? JSON.parse(raw)
    : { trips: [demoTrip], events: { [demoTrip.id]: demoEvents } };
}
function write(data: DemoStore) {
  localStorage.setItem(key, JSON.stringify(data));
  window.dispatchEvent(new Event("rumo-data"));
}
function localListen<T>(
  select: (d: DemoStore) => T,
  next: (v: T) => void,
  error: (e: Error) => void,
) {
  const update = () => {
    try {
      next(select(read()));
    } catch {
      error(new Error("Não foi possível ler a demonstração local."));
    }
  };
  update();
  window.addEventListener("rumo-data", update);
  window.addEventListener("storage", update);
  return () => {
    window.removeEventListener("rumo-data", update);
    window.removeEventListener("storage", update);
  };
}
export function watchTrips(
  admin: boolean,
  next: (v: Trip[]) => void,
  error: (e: Error) => void,
) {
  if (demoMode)
    return localListen(
      (d) => d.trips.filter((t) => admin || t.isPublic),
      next,
      error,
    );
  if (!db) {
    error(
      new Error(
        "Configure o Firebase ou habilite a demonstração no arquivo .env.",
      ),
    );
    return () => {};
  }
  return onSnapshot(
    admin
      ? collection(db, "trips")
      : query(collection(db, "trips"), where("isPublic", "==", true)),
    (s) => next(s.docs.map((d) => ({ ...d.data(), id: d.id }) as Trip)),
    error,
  );
}
export function watchTrip(
  id: string,
  next: (v: Trip | null) => void,
  error: (e: Error) => void,
) {
  if (demoMode)
    return localListen(
      (d) => d.trips.find((t) => t.id === id) ?? null,
      next,
      error,
    );
  if (!db) {
    error(new Error("Firebase não configurado."));
    return () => {};
  }
  return onSnapshot(
    doc(db, "trips", id),
    (s) => next(s.exists() ? ({ ...s.data(), id: s.id } as Trip) : null),
    error,
  );
}
export function watchEvents(
  id: string,
  next: (v: TripEvent[]) => void,
  error: (e: Error) => void,
) {
  if (demoMode) return localListen((d) => d.events[id] ?? [], next, error);
  if (!db) return () => {};
  return onSnapshot(
    collection(db, "trips", id, "events"),
    (s) => next(s.docs.map((d) => ({ ...d.data(), id: d.id }) as TripEvent)),
    error,
  );
}
export async function saveTrip(input: TripInput, id?: string) {
  if (demoMode) {
    const data = read();
    const next = { ...input, id: id ?? crypto.randomUUID() };
    data.trips = [...data.trips.filter((t) => t.id !== next.id), next];
    write(data);
    return next.id;
  }
  if (!db) throw new Error("Firebase não configurado");
  if (id) {
    await setDoc(
      doc(db, "trips", id),
      { ...input, updatedAt: serverTimestamp() },
      { merge: true },
    );
    return id;
  }
  const created = await addDoc(collection(db, "trips"), {
    ...input,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  return created.id;
}
export async function saveEvent(
  tripId: string,
  input: EventInput,
  id?: string,
) {
  if (demoMode) {
    const data = read();
    const next = { ...input, id: id ?? crypto.randomUUID() };
    data.events[tripId] = [
      ...(data.events[tripId] ?? []).filter((e) => e.id !== next.id),
      next,
    ];
    write(data);
    return next.id;
  }
  if (!db) throw new Error("Firebase não configurado");
  const events = collection(db, "trips", tripId, "events");
  if (id) {
    await updateDoc(doc(events, id), {
      ...input,
      details: input.details ?? deleteField(),
      updatedAt: serverTimestamp(),
    });
    return id;
  } else {
    const created = await addDoc(events, {
      ...input,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    return created.id;
  }
}
export async function removeEvent(tripId: string, id: string) {
  if (demoMode) {
    const data = read();
    data.events[tripId] = (data.events[tripId] ?? []).filter(
      (e) => e.id !== id,
    );
    write(data);
    return;
  }
  if (db) await deleteDoc(doc(db, "trips", tripId, "events", id));
}
export async function removeTrip(id: string) {
  if (demoMode) {
    const data = read();
    data.trips = data.trips.filter((t) => t.id !== id);
    delete data.events[id];
    write(data);
    return;
  }
  if (!db) throw new Error("Firebase não configurado");
  const snapshot = await getDocs(collection(db, "trips", id, "events"));
  for (let i = 0; i < snapshot.docs.length; i += 450) {
    const batch = writeBatch(db);
    snapshot.docs.slice(i, i + 450).forEach((d) => batch.delete(d.ref));
    await batch.commit();
  }
  await deleteDoc(doc(db, "trips", id));
}
