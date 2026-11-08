import { useState } from "react";
import { CalendarDays, Clock, MapPin, Pencil, Ticket, Trash2 } from "lucide-react";
import { Modal } from "../Modal";
import { PersonalEventForm } from "./PersonalEventForm";
import { useToast } from "../../hooks/useToast";
import { removePersonalEvent } from "../../services/personalEvents";
import { personalEventVisuals } from "../../data/personalEventCategories";
import { personalEventError, personalEventOvernight, personalEventPrice, type PersonalEvent } from "../../utils/personalEvents";
import { formatDate } from "../../utils/dates";

export function PersonalEventDialog({ event, ownerId, onClose, onDeleted = onClose }: { event: PersonalEvent; ownerId: string; onClose: () => void; onDeleted?: () => void }) {
  const [mode, setMode] = useState<"view" | "edit" | "delete">("view");
  const [busy, setBusy] = useState(false), [error, setError] = useState("");
  const toast = useToast();
  async function remove() {
    if (busy) return;
    setBusy(true); setError("");
    try { await removePersonalEvent(ownerId, event.id); onDeleted(); toast("Evento excluído."); }
    catch (cause) { setError(personalEventError(cause)); }
    finally { setBusy(false); }
  }
  if (mode === "edit") return <PersonalEventForm ownerId={ownerId} event={event} onClose={() => setMode("view")} onSaved={() => { setMode("view"); toast("Evento salvo."); }} />;
  if (mode === "delete") return <Modal title="Excluir evento?" busy={busy} onClose={() => setMode("view")}><p>“{event.title}” será excluído. Esta ação não pode ser desfeita.</p>{error && <p className="error" role="alert">{error}</p>}<div className="form-actions"><button className="secondary" disabled={busy} onClick={() => setMode("view")}>Cancelar</button><button className="danger" disabled={busy} onClick={remove}>{busy ? "Excluindo…" : "Excluir evento"}</button></div></Modal>;
  return <Modal title={event.title} onClose={onClose}>
    <div className="personal-event-details">
      <p className="personal-detail-type">{personalEventVisuals[event.category].label} · Privado</p>
      <p><CalendarDays size={18} aria-hidden="true" />{formatDate(event.date, { weekday: "long", day: "numeric", month: "long", year: "numeric" })}</p>
      <p><Clock size={18} aria-hidden="true" />{event.startTime}{event.endTime && ` – ${event.endTime}${personalEventOvernight(event) ? " (dia seguinte)" : ""}`}</p>
      <p><MapPin size={18} aria-hidden="true" /><span>{event.location}<small>{event.city}</small></span></p>
      {event.priceCents !== undefined && <p className="personal-detail-price">{personalEventPrice(event.priceCents)}</p>}
      {event.ticketUrl && <a className="secondary" href={event.ticketUrl} target="_blank" rel="noopener noreferrer"><Ticket size={18} aria-hidden="true" />Ver ingresso</a>}
      {event.notes && <div className="personal-detail-notes"><h3>Observações</h3><p>{event.notes}</p></div>}
    </div>
    <div className="form-actions personal-event-actions"><button className="ghost danger-text" onClick={() => setMode("delete")}><Trash2 size={16} aria-hidden="true" />Excluir</button><button className="primary" onClick={() => setMode("edit")}><Pencil size={16} aria-hidden="true" />Editar evento</button></div>
  </Modal>;
}
