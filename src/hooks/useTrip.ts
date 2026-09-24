import { useEffect, useState } from "react";
import { doc, onSnapshot } from "firebase/firestore";
import type { Trip, TripEvent } from "../types";
import { watchTrip, watchEvents } from "../services/repository";
import { useAuth } from "./useAuth";
import { db } from "../lib/firebase";
import { permissions } from "../utils/access";
export function useTrip(id: string) {
  const { user, admin, loading: authLoading } = useAuth();
  const [trip, setTrip] = useState<Trip | null>(null);
  const [events, setEvents] = useState<TripEvent[]>([]);
  const [editor, setEditor] = useState(false);
  const [loading, setLoading] = useState(true);
  const [eventsLoading, setEventsLoading] = useState(true);
  const [error, setError] = useState("");
  useEffect(() => {
    setEditor(false);
    if (!db || !user || !id) return;
    return onSnapshot(
      doc(db, "trips", id, "members", user.uid),
      (s) => setEditor(s.exists() && s.data().role === "editor"),
      () => setEditor(false),
    );
  }, [id, user]);
  useEffect(() => {
    if (authLoading || !id) return;
    setLoading(true);
    setError("");
    setTrip(null);
    setEvents([]);
    return watchTrip(
      id,
      (t) => {
        setTrip(t);
        setLoading(false);
      },
      () => {
        setTrip(null);
        setEvents([]);
        setError(
          "Esta viagem é privada, não existe ou não pôde ser carregada. Entre com a conta que participa da viagem.",
        );
        setLoading(false);
      },
    );
  }, [id, admin, authLoading, user, editor]);
  const access = trip
    ? permissions(trip, user?.uid, admin, editor)
    : {
        canRead: false,
        canEdit: false,
        canManage: false,
        owner: false,
        legacy: false,
      };
  useEffect(() => {
    if (!access.canRead) {
      setEvents([]);
      return;
    }
    setEventsLoading(true);
    return watchEvents(
      id,
      (rows) => {
        setEvents(rows);
        setEventsLoading(false);
      },
      () => {
        setEvents([]);
        setError(
          "Não foi possível carregar os programas. Confira seu acesso e a conexão.",
        );
        setEventsLoading(false);
      },
    );
  }, [id, access.canRead, user]);
  return {
    trip,
    events,
    editor,
    access,
    loading: loading || authLoading || (access.canRead && eventsLoading),
    error,
  };
}
