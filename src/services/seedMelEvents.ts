import type { Auth } from "firebase/auth";
import {
  doc,
  getDocFromServer,
  runTransaction,
  serverTimestamp,
  type Firestore,
} from "firebase/firestore";
import {
  assertMelSeedTarget,
  matchesMelTrip,
  melTrip,
  melTripId,
} from "../data/melTrip";
import { melEvents } from "../data/melEvents";

export interface MelEventsResult {
  created: string[];
  existing: string[];
}

function seedRefs(db: Firestore, auth: Auth, demo: boolean) {
  assertMelSeedTarget(db.app.options.projectId, demo);
  assertMelSeedTarget(auth.app.options.projectId, demo);
  if (!auth.currentUser)
    throw new Error("Entre com Google antes de cadastrar o roteiro.");
  return {
    admin: doc(db, "platformAdmins", auth.currentUser.uid),
    trip: doc(db, "trips", melTripId),
  };
}

function assertTrip(data: Record<string, unknown>) {
  if (!matchesMelTrip(data) || data.endDate !== melTrip.endDate) {
    throw new Error(
      "A viagem encontrada não corresponde a Brasília da Mel de 29/10 a 02/11/2026. Nenhum dado foi alterado.",
    );
  }
}

// Server-only inspection: failures must never be interpreted as a missing trip.
export async function inspectMelTrip(db: Firestore, auth: Auth, demo: boolean) {
  const refs = seedRefs(db, auth, demo);
  const admin = await getDocFromServer(refs.admin);
  if (!admin.exists() || admin.data().active !== true)
    throw new Error("Esta conta não possui permissão administrativa ativa.");
  const trip = await getDocFromServer(refs.trip);
  if (trip.exists()) assertTrip(trip.data());
  return trip.exists();
}

export async function seedMelEvents(
  db: Firestore,
  auth: Auth,
  demo: boolean,
): Promise<MelEventsResult> {
  const refs = seedRefs(db, auth, demo);
  // All reads precede writes. Retried transactions recheck IDs and never replace
  // existing documents, including edits made while another seed is running.
  return runTransaction(db, async (transaction) => {
    const admin = await transaction.get(refs.admin);
    if (!admin.exists() || admin.data().active !== true)
      throw new Error("Esta conta não possui permissão administrativa ativa.");
    const trip = await transaction.get(refs.trip);
    if (!trip.exists())
      throw new Error(
        "A viagem trips/brasilia-da-mel-2026 não existe. O roteiro não foi cadastrado.",
      );
    assertTrip(trip.data());
    const targets = melEvents.map((event) =>
      doc(db, "trips", melTripId, "events", event.id),
    );
    const snapshots = await Promise.all(
      targets.map((target) => transaction.get(target)),
    );
    const result: MelEventsResult = { created: [], existing: [] };
    melEvents.forEach(({ id, ...event }, index) => {
      if (snapshots[index].exists()) {
        result.existing.push(id);
      } else {
        transaction.set(targets[index], {
          ...event,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
        result.created.push(id);
      }
    });
    return result;
  });
}
