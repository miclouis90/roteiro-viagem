import { useState, type FormEvent } from "react";
import { Modal } from "../Modal";
import { Disclosure, revealInvalidField } from "../ui/Disclosure";
import { dateKey } from "../../utils/dates";
import { personalEventCategories, parsePersonalPrice, personalEventOvernight, personalEventError, type PersonalEvent, type PersonalEventInput } from "../../utils/personalEvents";
import { personalEventVisuals } from "../../data/personalEventCategories";
import { savePersonalEvent } from "../../services/personalEvents";
import "./personal-events.css";

export function PersonalEventForm({ ownerId, event, onClose, onSaved }: {
  ownerId: string; event?: PersonalEvent; onClose: () => void; onSaved: (id: string) => void;
}) {
  const [busy, setBusy] = useState(false), [error, setError] = useState("");
  const [startTime, setStartTime] = useState(event?.startTime || ""), [endTime, setEndTime] = useState(event?.endTime || "");
  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault(); if (busy) return;
    const fields = new FormData(e.currentTarget);
    const price = parsePersonalPrice(String(fields.get("price") || ""));
    const input: PersonalEventInput = {
      title: String(fields.get("title") || ""), category: String(fields.get("category")) as PersonalEventInput["category"],
      date: String(fields.get("date") || ""), startTime, city: String(fields.get("city") || ""), location: String(fields.get("location") || ""),
      ...(endTime ? { endTime } : {}), ...(price !== undefined ? { priceCents: price } : {}),
      ticketUrl: String(fields.get("ticketUrl") || ""), notes: String(fields.get("notes") || ""),
    };
    setBusy(true); setError("");
    try { const id = await savePersonalEvent(ownerId, input, event?.id); onSaved(id); }
    catch (cause) { setError(personalEventError(cause)); }
    finally { setBusy(false); }
  }
  return <Modal title={event ? "Editar evento" : "Novo evento"} busy={busy} onClose={onClose}>
    <form className="personal-event-form" onSubmit={submit} onInvalidCapture={revealInvalidField}>
      <p className="field-help">Só você tem acesso. Os campos com * são obrigatórios.</p>
      <fieldset disabled={busy}>
        <label>Título *<input name="title" required maxLength={120} defaultValue={event?.title} placeholder="Qual experiência vem aí?" /></label>
        <label>Tipo *<select name="category" aria-label="Tipo *" defaultValue={event?.category || "show"}>{personalEventCategories.map(category => <option key={category} value={category}>{personalEventVisuals[category].label}</option>)}</select></label>
        <div className="personal-event-two-fields">
          <label>Data *<input name="date" type="date" required min="1000-01-01" max="9999-12-31" defaultValue={event?.date || dateKey()} /></label>
          <label>Horário *<input name="startTime" type="time" required value={startTime} onChange={e => setStartTime(e.target.value)} /></label>
        </div>
        <label>Cidade *<input name="city" required maxLength={120} defaultValue={event?.city} autoComplete="address-level2" /></label>
        <label>Local ou endereço *<input name="location" required maxLength={300} defaultValue={event?.location} /></label>
        <Disclosure title="Adicionar detalhes" description="Horário final, valor, ingresso e observações" initialOpen={!!event && [event.endTime, event.priceCents !== undefined, event.ticketUrl, event.notes].some(Boolean)}>
          <label>Horário final<input name="endTime" type="time" value={endTime} onChange={e => setEndTime(e.target.value)} /></label>
          <label>Valor (R$)<input name="price" inputMode="decimal" placeholder="A definir" defaultValue={event?.priceCents !== undefined ? (event.priceCents / 100).toFixed(2).replace(".", ",") : ""} /></label>
          {personalEventOvernight({ startTime, endTime }) && <p className="field-help wide">O horário final é no dia seguinte.</p>}
          <p className="field-help wide">Valor total do evento em BRL. Informe 0 para gratuito; deixe vazio se ainda não souber.</p>
          <label className="wide">Link de ingresso<input name="ticketUrl" type="url" maxLength={2048} defaultValue={event?.ticketUrl} placeholder="https://" /></label>
          <label className="wide">Observações<textarea name="notes" aria-label="Observações" maxLength={3000} defaultValue={event?.notes} rows={3} /></label>
        </Disclosure>
      </fieldset>
      {error && <p className="error" role="alert">{error}</p>}
      <div className="form-actions"><button type="button" className="secondary" disabled={busy} onClick={onClose}>Cancelar</button><button className="primary" disabled={busy}>{busy ? "Salvando…" : "Salvar evento"}</button></div>
    </form>
  </Modal>;
}
