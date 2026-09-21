import { useEffect, useState } from "react";
import type { Trip, TripEvent } from "../types";
import { watchTrip, watchEvents } from "../services/repository";
export function useTrip(id: string, admin: boolean, authLoading: boolean) {
  const [trip, setTrip] = useState<Trip | null>(null);
  const [events, setEvents] = useState<TripEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [eventsLoading, setEventsLoading] = useState(true);
  const [error, setError] = useState("");
  useEffect(() => {
    if (authLoading) return;
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
        setError(
          "Esta viagem é privada, não existe ou não pôde ser carregada.",
        );
        setLoading(false);
      },
    );
  }, [id, admin, authLoading]);
  const accessible = !!trip && (trip.isPublic || admin);
  useEffect(() => {
    if (!accessible) return;
    setEventsLoading(true);
    return watchEvents(
      id,
      (e) => {
        setEvents(e);
        setEventsLoading(false);
      },
      () => {
        setError(
          "Não foi possível carregar os programas. Verifique a conexão.",
        );
        setEventsLoading(false);
      },
    );
  }, [id, accessible, admin]);
  return {
    trip,
    events,
    loading: loading || authLoading || (accessible && eventsLoading),
    error,
  };
}
