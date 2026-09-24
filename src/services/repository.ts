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
import { melTripId } from "../data/melTrip";
import { demoTrip, demoEvents } from "../data/demo";
import type { Trip, TripEvent, TripInput, EventInput } from "../types";
import { changedFields } from "../utils/access";
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
  const stops = [
    listen(
      "public",
      query(collection(database, "trips"), where("isPublic", "==", true)),
    ),
  ];
  if (uid)
    stops.push(
      listen(
        "owned",
        query(collection(database, "trips"), where("ownerId", "==", uid)),
      ),
    );
  // Old private trips remain accessible by their existing links; no ownership migration on read.
  if (admin) {
    let known = [melTripId];
    try {
      known = [
        ...new Set([
          ...known,
          ...(JSON.parse(
            localStorage.getItem("rumo-known-legacy-trips") || "[]",
          ) as string[]),
        ]),
      ];
    } catch {
      /* Optional local shortcuts. */
    }
    for (const id of known)
      stops.push(
        onSnapshot(
          doc(database, "trips", id),
          (s) => {
            buckets.set(
              "legacy:" + id,
              s.exists() ? [{ ...s.data(), id: s.id } as Trip] : [],
            );
            emit();
          },
          () => {},
        ),
      );
  }
  let memberStops: (() => void)[] = [];
  if (uid)
    stops.push(
      onSnapshot(
        query(collectionGroup(database, "members"), where("uid", "==", uid)),
        (s) => {
          memberStops.forEach((stop) => stop());
          for (const name of buckets.keys())
            if (name.startsWith("member:")) buckets.delete(name);
          memberStops = s.docs.map((member) => {
            const parent = member.ref.parent.parent!;
            return onSnapshot(
              parent,
              (trip) => {
                buckets.set(
                  "member:" + parent.id,
                  trip.exists()
                    ? [{ ...trip.data(), id: trip.id } as Trip]
                    : [],
                );
                emit();
              },
              () => {
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
) {
  if (demoMode) return localListen((d) => d.events[id] ?? [], next, error);
  if (!db) return () => {};
  return onSnapshot(
    collection(db, "trips", id, "events"),
    (s) => next(s.docs.map((d) => ({ ...d.data(), id: d.id }) as TripEvent)),
    error,
  );
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
  const members = await getDocs(collection(db, "trips", id, "members"));
  for (let i = 0; i < members.docs.length; i += 450) {
    const batch = writeBatch(db);
    members.docs.slice(i, i + 450).forEach((d) => batch.delete(d.ref));
    await batch.commit();
  }
  await deleteDoc(doc(db, "trips", id));
}
