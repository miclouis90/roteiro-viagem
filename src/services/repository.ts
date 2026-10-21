import {
  addDoc,
  collection,
  deleteDoc,
  deleteField,
  doc,
  getDocs,
  getDocFromServer,
  onSnapshot,
  query,
  serverTimestamp,
  collectionGroup,
  where,
  writeBatch,
  updateDoc,
} from "firebase/firestore";
import { auth, db, demoMode } from "../lib/firebase";

import { demoTrip, demoEvents } from "../data/demo";
import type { Trip, TripEvent, TripInput, EventInput } from "../types";
import { changedFields } from "../utils/access";
import { isLodging, reservationData, splitLodgingReservation, type LodgingReservation } from "../utils/lodging";
const key = "rumo-demo-v1";
interface DemoStore {
  trips: Trip[];
  events: Record<string, TripEvent[]>;
  lodgingReservations?: Record<string, Record<string, LodgingReservation>>;
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
  uid?: string,
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
  if (!uid) { next([]); return () => {}; }
  const database = db;
  const buckets = new Map<string, Trip[]>();
  const emit = () =>
    next([
      ...new Map([...buckets.values()].flat().map((t) => [t.id, t])).values(),
    ]);
  const listen = (name: string, q: ReturnType<typeof query>) =>
    onSnapshot(
      q,
      (s) => {
        buckets.set(
          name,
          s.docs.map(
            (d) =>
              ({ ...(d.data() as Record<string, unknown>), id: d.id }) as Trip,
          ),
        );
        emit();
      },
      error,
    );
  const stops = [listen(
    "owned",
    query(collection(database, "trips"), where("ownerId", "==", uid)),
  )];
  let memberStops: (() => void)[] = [];
  let membershipVersion = 0;
  if (uid)
    stops.push(
      onSnapshot(
        query(collectionGroup(database, "members"), where("uid", "==", uid)),
        (s) => {
          const version = ++membershipVersion;
          memberStops.forEach((stop) => stop());
          for (const name of buckets.keys())
            if (name.startsWith("member:")) buckets.delete(name);
          memberStops = s.docs.filter(member => member.id === uid && member.ref.parent.parent?.parent.path === "trips").map((member) => {
            const parent = member.ref.parent.parent!;
            return onSnapshot(
              parent,
              (trip) => {
                if (version !== membershipVersion) return;
                buckets.set(
                  "member:" + parent.id,
                  trip.exists()
                    ? [{ ...trip.data(), id: trip.id } as Trip]
                    : [],
                );
                emit();
              },
              () => {
                if (version !== membershipVersion) return;
                buckets.delete("member:" + parent.id);
                emit();
              },
            );
          });
          emit();
        },
        error,
      ),
    );
  return () => {
    membershipVersion++;
    stops.forEach((stop) => stop());
    memberStops.forEach((stop) => stop());
  };
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
    (s) => {
      if (s.exists() && !s.data().ownerId) {
        try {
          const ids = new Set<string>(
            JSON.parse(localStorage.getItem("rumo-known-legacy-trips") || "[]"),
          );
          ids.add(id);
          localStorage.setItem(
            "rumo-known-legacy-trips",
            JSON.stringify([...ids]),
          );
        } catch {
          /* Optional shortcut only. */
        }
      }
      next(s.exists() ? ({ ...s.data(), id: s.id } as Trip) : null);
    },
    error,
  );
}
export function watchEvents(
  id: string,
  next: (v: TripEvent[]) => void,
  error: (e: Error) => void,
  includeReservations = false,
) {
  if (demoMode) return localListen((d) => (d.events[id] ?? []).map(event => {
    const { publicInput } = splitLodgingReservation(event);
    return includeReservations && isLodging(event)
      ? { ...publicInput, details: { ...publicInput.details!, ...d.lodgingReservations?.[id]?.[event.id] } } : publicInput;
  }), next, error);
  if (!db) return () => {};
  let events: TripEvent[] | undefined;
  let reservations: Record<string, LodgingReservation> = {};
  let privateReady = !includeReservations;
  const emit = () => {
    if (!events || !privateReady) return;
    next(events.map(event => {
      const { publicInput } = splitLodgingReservation(event);
      return includeReservations && isLodging(event)
        ? { ...publicInput, details: { ...publicInput.details!, ...reservations[event.id] } } : publicInput;
    }));
  };
  const stop = onSnapshot(
    collection(db, "trips", id, "events"),
    (s) => { events = s.docs.map((d) => ({ ...d.data(), id: d.id }) as TripEvent); emit(); },
    error,
  );
  const stopPrivate = includeReservations ? onSnapshot(collection(db, "trips", id, "lodgingReservations"), s => {
    reservations = Object.fromEntries(s.docs.map(d => [d.id, reservationData(d.data())]));
    privateReady = true; emit();
  }, () => { reservations = {}; privateReady = true; emit(); }) : undefined;
  return () => { stop(); stopPrivate?.(); };
}
export async function saveTrip(
  input: TripInput,
  id?: string,
  baseline?: TripInput,
) {
  if (demoMode) {
    const data = read();
    const next = { ...input, id: id ?? crypto.randomUUID() };
    data.trips = [...data.trips.filter((t) => t.id !== next.id), next];
    write(data);
    return next.id;
  }
  if (!db) throw new Error("Firebase não configurado");
  if (id) {
    const content = { ...input };
    delete content.ownerId;
    delete content.access;
    const patch = baseline
      ? changedFields(content, {
          ...baseline,
          ownerId: undefined,
          access: undefined,
        })
      : content;
    delete patch.isPublic;
    await updateDoc(doc(db, "trips", id), {
      ...patch,
      updatedAt: serverTimestamp(),
    });
    return id;
  }
  const created = await addDoc(collection(db, "trips"), {
    ...input,
    ownerId: auth!.currentUser!.uid,
    access: input.isPublic ? "PUBLIC" : "PRIVATE",
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  return created.id;
}
export async function saveEvent(
  tripId: string,
  input: EventInput,
  id?: string,
  baseline?: EventInput,
) {
  if (demoMode) {
    const data = read();
    const { publicInput, reservation } = splitLodgingReservation(input);
    const next = { ...publicInput, id: id ?? crypto.randomUUID() };
    if (isLodging(input) && (Object.keys(reservation).length || (baseline && Object.keys(splitLodgingReservation(baseline).reservation).length))) {
      data.lodgingReservations ??= {};
      data.lodgingReservations[tripId] ??= {};
      data.lodgingReservations[tripId][next.id] = reservation;
    } else if (!isLodging(input) && data.lodgingReservations?.[tripId]) delete data.lodgingReservations[tripId][next.id];
    data.events[tripId] = [
      ...(data.events[tripId] ?? []).filter((e) => e.id !== next.id),
      next,
    ];
    write(data);
    return next.id;
  }
  if (!db) throw new Error("Firebase não configurado");
  const events = collection(db, "trips", tripId, "events");
  if (isLodging(input) || (baseline && isLodging(baseline))) {
    const { publicInput, reservation } = splitLodgingReservation(input);
    const old = baseline ? splitLodgingReservation(baseline) : undefined;
    const target = id ? doc(events, id) : doc(events);
    const batch = writeBatch(db);
    if (id) {
      const patch = old ? changedFields({ ...publicInput }, { ...old.publicInput }) : { ...publicInput, details: publicInput.details };
      batch.update(target, { ...Object.fromEntries(Object.entries(patch).map(([key, value]) => [key, value === undefined ? deleteField() : value])), updatedAt: serverTimestamp() });
    } else batch.set(target, { ...publicInput, createdAt: serverTimestamp(), updatedAt: serverTimestamp() });
    const reservationRef = doc(db, "trips", tripId, "lodgingReservations", target.id);
    if (!isLodging(input) && old && Object.keys(old.reservation).length) batch.delete(reservationRef);
    else {
      const patch = old ? changedFields(reservation, old.reservation) : reservation;
      if (Object.keys(patch).length) batch.set(reservationRef, {
        ...Object.fromEntries(Object.entries(patch).map(([key, value]) => [key, value === undefined ? deleteField() : value])),
        updatedAt: serverTimestamp(),
      }, { merge: true });
    }
    await batch.commit();
    return target.id;
  }
  if (id) {
    const patch = baseline
      ? changedFields({ ...input }, { ...baseline })
      : { ...input, details: input.details };
    await updateDoc(doc(events, id), {
      ...Object.fromEntries(
        Object.entries(patch).map(([key, value]) => [
          key,
          value === undefined ? deleteField() : value,
        ]),
      ),
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
export async function removeEvent(tripId: string, id: string, removeReservation = false) {
  if (demoMode) {
    const data = read();
    data.events[tripId] = (data.events[tripId] ?? []).filter(
      (e) => e.id !== id,
    );
    if (data.lodgingReservations?.[tripId]) delete data.lodgingReservations[tripId][id];
    write(data);
    return;
  }
  if (db && removeReservation) {
    const batch = writeBatch(db);
    batch.delete(doc(db, "trips", tripId, "events", id));
    batch.delete(doc(db, "trips", tripId, "lodgingReservations", id));
    await batch.commit();
  } else if (db) await deleteDoc(doc(db, "trips", tripId, "events", id));
}
export async function removeTrip(id: string) {
  if (demoMode) {
    const data = read();
    data.trips = data.trips.filter((t) => t.id !== id);
    delete data.events[id];
    if (data.lodgingReservations) delete data.lodgingReservations[id];
    write(data);
    return;
  }
  if (!db) throw new Error("Firebase não configurado");
  const parent = await getDocFromServer(doc(db, "trips", id));
  if (
    !auth?.currentUser ||
    !parent.exists() ||
    parent.data().ownerId !== auth.currentUser.uid
  )
    throw new Error("Somente o proprietário pode excluir a viagem.");
  const snapshot = await getDocs(collection(db, "trips", id, "events"));
  for (let i = 0; i < snapshot.docs.length; i += 450) {
    const batch = writeBatch(db);
    snapshot.docs.slice(i, i + 450).forEach((d) => batch.delete(d.ref));
    await batch.commit();
  }
  const reservations = await getDocs(collection(db, "trips", id, "lodgingReservations"));
  for (let i = 0; i < reservations.docs.length; i += 450) {
    const batch = writeBatch(db);
    reservations.docs.slice(i, i + 450).forEach(d => batch.delete(d.ref));
    await batch.commit();
  }
  const members = await getDocs(collection(db, "trips", id, "members"));
  for (let i = 0; i < members.docs.length; i += 450) {
    const batch = writeBatch(db);
    members.docs.slice(i, i + 450).forEach((d) => batch.delete(d.ref));
    await batch.commit();
  }
  await deleteDoc(doc(db, "trips", id));
}
