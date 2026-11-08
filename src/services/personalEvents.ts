import { addDoc, collection, deleteDoc, deleteField, doc, onSnapshot, query, serverTimestamp, updateDoc, where } from "firebase/firestore";
import { auth, db, demoMode } from "../lib/firebase";
import { sortPersonalEvents, validatePersonalEvent, type PersonalEvent, type PersonalEventInput } from "../utils/personalEvents";

const demoKey = "rumo-personal-events-v1";
function authorized(ownerId: string) {
  if (!ownerId || (!demoMode && (!db || !auth?.currentUser || auth.currentUser.isAnonymous || auth.currentUser.uid !== ownerId))) {
    throw Object.assign(new Error("Autenticação necessária."), { code: "unauthenticated" });
  }
}
function demoRead(): Record<string, PersonalEvent[]> { return JSON.parse(localStorage.getItem(demoKey) || "{}"); }
function demoWrite(ownerId: string, events: PersonalEvent[]) {
  localStorage.setItem(demoKey, JSON.stringify({ ...demoRead(), [ownerId]: events }));
  window.dispatchEvent(new Event("rumo-personal-events"));
}
export function watchPersonalEvents(ownerId: string, next: (events: PersonalEvent[]) => void, error: (cause: unknown) => void) {
  let stopped = false;
  const emit = (rows: PersonalEvent[]) => { if (!stopped) { authorized(ownerId); next(sortPersonalEvents(rows)); } };
  const fail = (cause: unknown) => { if (!stopped) error(cause); };
  try {
    authorized(ownerId);
    if (demoMode) {
      const update = () => { try { emit((demoRead()[ownerId] || []).map(event => ({ ...validatePersonalEvent(event), id: event.id, ownerId }))); } catch (cause) { fail(cause); } };
      update(); window.addEventListener("rumo-personal-events", update); window.addEventListener("storage", update);
      return () => { stopped = true; window.removeEventListener("rumo-personal-events", update); window.removeEventListener("storage", update); };
    }
    // Owner-scoped query; neither public links nor trip membership grant access here.
    const stop = onSnapshot(query(collection(db!, "personalEvents"), where("ownerId", "==", ownerId)), snapshot => {
      try { emit(snapshot.docs.map(item => {
        const data = item.data();
        if (data.ownerId !== ownerId) throw Object.assign(new Error("Acesso recusado."), { code: "permission-denied" });
        return { ...validatePersonalEvent(data as PersonalEventInput), id: item.id, ownerId };
      })); } catch (cause) { fail(cause); }
    }, fail);
    return () => { stopped = true; stop(); };
  } catch (cause) { fail(cause); return () => { stopped = true; }; }
}
export async function savePersonalEvent(ownerId: string, input: PersonalEventInput, id?: string) {
  authorized(ownerId);
  const data = validatePersonalEvent(input);
  if (demoMode) {
    const rows = demoRead()[ownerId] || [];
    if (id && !rows.some(event => event.id === id)) throw Object.assign(new Error("Evento ausente."), { code: "not-found" });
    const savedId = id || crypto.randomUUID();
    demoWrite(ownerId, [...rows.filter(event => event.id !== savedId), { ...data, id: savedId, ownerId }]); return savedId;
  }
  if (id) {
    await updateDoc(doc(db!, "personalEvents", id), { ...data,
      endTime: data.endTime ?? deleteField(), priceCents: data.priceCents ?? deleteField(), ticketUrl: data.ticketUrl ?? deleteField(), notes: data.notes ?? deleteField(), updatedAt: serverTimestamp() });
    return id;
  }
  const saved = await addDoc(collection(db!, "personalEvents"), { ...data, ownerId, createdAt: serverTimestamp(), updatedAt: serverTimestamp() });
  return saved.id;
}
export async function removePersonalEvent(ownerId: string, id: string) {
  authorized(ownerId);
  if (demoMode) { demoWrite(ownerId, (demoRead()[ownerId] || []).filter(event => event.id !== id)); return; }
  await deleteDoc(doc(db!, "personalEvents", id));
}
