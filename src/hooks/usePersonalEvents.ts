import { useEffect, useState } from "react";
import { watchPersonalEvents } from "../services/personalEvents";
import { personalEventError, type PersonalEvent } from "../utils/personalEvents";

const empty: PersonalEvent[] = [];
export function usePersonalEvents(ownerId: string) {
  const [snapshot, setSnapshot] = useState({ ownerId: "", events: empty, loading: false, error: "" });
  useEffect(() => {
    if (!ownerId) return;
    let active = true;
    setSnapshot({ ownerId, events: empty, loading: true, error: "" });
    const stop = watchPersonalEvents(ownerId,
      events => { if (active) setSnapshot({ ownerId, events, loading: false, error: "" }); },
      cause => { if (active) setSnapshot({ ownerId, events: empty, loading: false, error: personalEventError(cause) }); });
    return () => { active = false; stop(); };
  }, [ownerId]);
  // Never expose a previous account's snapshot, even before effect cleanup runs.
  return ownerId && snapshot.ownerId === ownerId ? snapshot : { ownerId, events: empty, loading: !!ownerId, error: "" };
}
