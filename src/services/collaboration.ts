import {
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  runTransaction,
  serverTimestamp,
  updateDoc,
} from "firebase/firestore";
import { auth, db } from "../lib/firebase";
import type { TripAccess, TripMember } from "../types";
function database() {
  if (!db || !auth?.currentUser || auth.currentUser.isAnonymous)
    throw new Error("Entre com Google para continuar.");
  return db;
}
export async function claimOwnership(id: string) {
  const databaseRef = database();
  const ref = doc(databaseRef, "trips", id);
  await runTransaction(databaseRef, async (transaction) => {
    const trip = await transaction.get(ref);
    if (!trip.exists() || trip.data().ownerId)
      throw new Error(
        "Esta viagem já tem proprietário ou não está disponível.",
      );
    transaction.update(ref, {
      ownerId: auth!.currentUser!.uid,
      access: trip.data().isPublic ? "PUBLIC" : "PRIVATE",
      updatedAt: serverTimestamp(),
    });
  });
}
export async function setTripAccess(id: string, access: TripAccess) {
  await updateDoc(doc(database(), "trips", id), {
    access,
    isPublic: access === "PUBLIC" || access === "PUBLIC_EDIT",
    updatedAt: serverTimestamp(),
  });
}
export async function joinTrip(id: string) {
  const databaseRef = database(),
    user = auth!.currentUser!;
  const ref = doc(databaseRef, "trips", id, "members", user.uid);
  await runTransaction(databaseRef, async (transaction) => {
    const existing = await transaction.get(ref);
    if (existing.exists()) return;
    transaction.set(ref, {
      uid: user.uid,
      role: "editor",
      displayName: user.displayName ?? "",
      email: user.email ?? "",
      addedAt: serverTimestamp(),
    });
  });
}
export async function removeMember(id: string, uid: string) {
  await deleteDoc(doc(database(), "trips", id, "members", uid));
}
export function watchMembers(
  id: string,
  next: (members: TripMember[]) => void,
  error: (e: Error) => void,
) {
  if (!db) return () => {};
  return onSnapshot(
    collection(db, "trips", id, "members"),
    (snapshot) => next(snapshot.docs.map((d) => d.data() as TripMember)),
    error,
  );
}
