import {
  collection,
  doc,
  getDocFromServer,
  getDocsFromServer,
  query,
  runTransaction,
  serverTimestamp,
  where,
  type Firestore,
} from "firebase/firestore";
import type { Auth } from "firebase/auth";
import {
  assertMelSeedTarget,
  matchesMelTrip,
  melTrip,
  melTripId,
} from "../data/melTrip";
export interface SeedResult {
  id: string;
  created: boolean;
}
// Uses the regular client SDK and the existing security rules; never Admin SDK.
export async function seedMelTrip(
  db: Firestore,
  auth: Auth,
  demo: boolean,
): Promise<SeedResult> {
  assertMelSeedTarget(db.app.options.projectId, demo);
  assertMelSeedTarget(auth.app.options.projectId, demo);
  const user = auth.currentUser;
  if (!user) throw new Error("Entre com Google antes de cadastrar a viagem.");
  const admin = await getDocFromServer(doc(db, "platformAdmins", user.uid));
  if (!admin.exists() || admin.data().active !== true) {
    throw new Error("Esta conta não possui permissão administrativa.");
  }
  // Filter the date locally so no new composite index is needed.
  // A failed/offline read must abort, never be treated as an empty result.
  const candidates = await getDocsFromServer(
    query(collection(db, "trips"), where("title", "==", melTrip.title)),
  );
  const existing = candidates.docs.find((snapshot) =>
    matchesMelTrip(snapshot.data()),
  );
  if (existing) return { id: existing.id, created: false };
  const target = doc(db, "trips", melTripId);
  return runTransaction(db, async (transaction) => {
    const snapshot = await transaction.get(target);
    if (snapshot.exists()) {
      if (matchesMelTrip(snapshot.data()))
        return { id: snapshot.id, created: false };
      throw new Error(
        "O identificador brasilia-da-mel-2026 já pertence a outra viagem. Nenhum dado foi alterado.",
      );
    }
    // The transaction retries on conflict: parallel seed runs cannot overwrite
    // each other or create two documents with this deterministic ID.
    transaction.set(target, {
      ...melTrip,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    return { id: target.id, created: true };
  });
}
