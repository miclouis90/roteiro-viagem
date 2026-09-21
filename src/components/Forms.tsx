import { useState, type FormEvent } from "react";
import type { Trip, TripInput, TripEvent, EventInput } from "../types";
import { categories } from "../data/categories";
import { daysBetween, dateKey } from "../utils/dates";
import { saveTrip, saveEvent } from "../services/repository";
import { useToast } from "../hooks/useToast";
import { Modal } from "./Modal";
export function TripForm({
  trip,
  onClose,
  onSaved,
}: {
  trip?: Trip;
  onClose: () => void;
  onSaved: (id: string) => void;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const toast = useToast();
  const [start, setStart] = useState(trip?.startDate ?? dateKey());
  const [end, setEnd] = useState(trip?.endDate ?? dateKey());
  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    if (daysBetween(start, end) < 1 || daysBetween(start, end) > 366) {
      setError("Escolha um período de 1 a 366 dias.");
      return;
    }
    const f = new FormData(e.currentTarget);
    const input: TripInput = {
      title: String(f.get("title")).trim(),
      destinationCity: String(f.get("city")).trim(),
      destinationState: String(f.get("state")).trim(),
      country: String(f.get("country")).trim(),
      startDate: start,
      endDate: end,
      travelerName: String(f.get("traveler")).trim(),
      description: String(f.get("description")),
      notes: String(f.get("notes")),
      status: String(f.get("status")) as TripInput["status"],
      isPublic: f.get("public") === "on",
      currency: String(f.get("currency")),
    };
    if (!input.title || !input.destinationCity || !input.country) {
      setError("Preencha título, cidade e país.");
      return;
    }
    setBusy(true);
    try {
      const id = await saveTrip(input, trip?.id);
      toast("Viagem salva.");
      onSaved(id);
    } catch {
      setError(
        "Não foi possível salvar. Verifique a conexão e suas permissões.",
      );
    } finally {
      setBusy(false);
    }
  }
  return (
    <Modal title={trip ? "Editar viagem" : "Uma nova viagem"} onClose={onClose}>
      <form onSubmit={submit} className="form-grid">
        <label className="wide">
          Título
          <input
            name="title"
            required
            maxLength={120}
            defaultValue={trip?.title}
            placeholder="Um feriado para descobrir Lisboa"
          />
        </label>
        <label>
          Cidade
          <input name="city" required defaultValue={trip?.destinationCity} />
        </label>
        <label>
          Estado / região
          <input name="state" defaultValue={trip?.destinationState} />
        </label>
        <label>
          País
          <input
            name="country"
            required
            defaultValue={trip?.country ?? "Brasil"}
          />
        </label>
        <label>
          Pessoa ou grupo
          <input name="traveler" defaultValue={trip?.travelerName} />
        </label>
        <label>
          Chegada
          <input
            type="date"
            value={start}
            onChange={(e) => setStart(e.target.value)}
            required
          />
        </label>
        <label>
          Saída
          <input
            type="date"
            min={start}
            value={end}
            onChange={(e) => setEnd(e.target.value)}
            required
          />
        </label>
        <p className="wide muted">
          {Math.max(0, daysBetween(start, end))} dias de descobertas · chegada e
          saída incluídas
        </p>
        <label>
          Status
          <select name="status" defaultValue={trip?.status}>
            {["planejamento", "confirmada", "concluída"].map((s) => (
              <option key={s}>{s}</option>
            ))}
          </select>
        </label>
        <label>
          Moeda
          <select name="currency" defaultValue={trip?.currency ?? "BRL"}>
            {[
              "BRL",
              "USD",
              "EUR",
              "GBP",
              "ARS",
              "CLP",
              "JPY",
              "CAD",
              "AUD",
              "CHF",
              "MXN",
              "UYU",
              "COP",
              "PEN",
            ].map((s) => (
              <option key={s}>{s}</option>
            ))}
          </select>
        </label>
        <label className="wide">
          Descrição
          <textarea
            name="description"
            defaultValue={trip?.description}
            rows={3}
          />
        </label>
        <label className="wide">
          Observações
          <textarea name="notes" defaultValue={trip?.notes} rows={2} />
        </label>
        <label className="check wide">
          <input
            name="public"
            type="checkbox"
            defaultChecked={trip?.isPublic ?? false}
          />
          Viagem pública — qualquer pessoa com o link pode visualizar
        </label>
        {error && (
          <p className="error wide" role="alert">
            {error}
          </p>
        )}
        <div className="form-actions wide">
          <button
            type="button"
            className="secondary"
            onClick={onClose}
            disabled={busy}
          >
            Cancelar
          </button>
          <button className="primary" disabled={busy}>
            {busy ? "Salvando…" : "Salvar viagem"}
          </button>
        </div>
      </form>
    </Modal>
  );
}
export function EventForm({
  defaultDate,
  trip,
  event,
  onClose,
}: {
  trip: Trip;
  defaultDate?: string;
  event?: TripEvent;
  onClose: () => void;
}) {
  const [free, setFree] = useState(event?.isFree ?? false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const toast = useToast();
  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const s = (k: string) => String(f.get(k) ?? "").trim();
    const input: EventInput = {
      title: s("title"),
      description: s("description"),
      date: s("date"),
      startTime: s("startTime"),
      endTime: s("endTime"),
      location: s("location"),
      category: s("category"),
      websiteUrl: s("websiteUrl"),
      instagramUrl: s("instagramUrl"),
      mapsUrl: s("mapsUrl"),
      genericUrl: s("genericUrl"),
      pricePerPerson: free ? 0 : Number(f.get("price")),
      peopleCount: Number(f.get("people")),
      isFree: free,
      notes: s("notes"),
      status: s("status") as EventInput["status"],
      priority: s("priority") as EventInput["priority"],
    };
    if (!input.title) {
      setError("Informe o nome do programa.");
      return;
    }
    if (input.endTime && input.endTime < input.startTime) {
      setError("O horário final deve ser posterior ao inicial no mesmo dia.");
      return;
    }
    setBusy(true);
    setError("");
    try {
      await saveEvent(trip.id, input, event?.id);
      toast(event ? "Alterações salvas." : "Programa adicionado ao roteiro.");
      onClose();
    } catch {
      setError(
        "Não foi possível salvar. Verifique a conexão e suas permissões.",
      );
    } finally {
      setBusy(false);
    }
  }
  return (
    <Modal
      title={event ? "Editar programa" : "Adicionar um programa"}
      onClose={onClose}
    >
      <form onSubmit={submit} className="form-grid">
        <label className="wide">
          Nome
          <input
            name="title"
            required
            maxLength={120}
            defaultValue={event?.title}
            placeholder="O que vamos fazer?"
          />
        </label>
        <label>
          Data
          <input
            name="date"
            type="date"
            min={trip.startDate}
            max={trip.endDate}
            defaultValue={event?.date ?? (defaultDate || trip.startDate)}
            required
          />
        </label>
        <label>
          Categoria
          <select name="category" defaultValue={event?.category ?? "Café"}>
            {categories.map((c) => (
              <option key={c.name}>{c.name}</option>
            ))}
          </select>
        </label>
        <label>
          Horário inicial
          <input
            type="time"
            name="startTime"
            required
            defaultValue={event?.startTime ?? "09:00"}
          />
        </label>
        <label>
          Horário final
          <input type="time" name="endTime" defaultValue={event?.endTime} />
        </label>
        <label className="wide">
          Local / endereço
          <input name="location" defaultValue={event?.location} />
        </label>
        <label className="wide">
          Descrição
          <textarea
            name="description"
            rows={3}
            defaultValue={event?.description}
          />
        </label>
        <label>
          Status
          <select name="status" defaultValue={event?.status ?? "ideia"}>
            {["ideia", "reservado", "confirmado", "realizado", "cancelado"].map(
              (s) => (
                <option key={s}>{s}</option>
              ),
            )}
          </select>
        </label>
        <label>
          Prioridade
          <select
            name="priority"
            defaultValue={event?.priority ?? "gostaria de ir"}
          >
            {["imperdível", "gostaria de ir", "opcional"].map((s) => (
              <option key={s}>{s}</option>
            ))}
          </select>
        </label>
        <label className="check wide">
          <input
            type="checkbox"
            checked={free}
            onChange={(e) => setFree(e.target.checked)}
          />
          Atividade gratuita
        </label>
        <label>
          Valor por pessoa ({trip.currency})
          <input
            name="price"
            type="number"
            step="0.01"
            min="0"
            max="10000000"
            required
            disabled={free}
            defaultValue={event?.pricePerPerson ?? 0}
          />
        </label>
        <label>
          Quantidade de pessoas
          <input
            name="people"
            type="number"
            min="1"
            max="10000"
            step="1"
            required
            defaultValue={event?.peopleCount ?? 1}
          />
        </label>
        {[
          ["websiteUrl", "Site oficial"],
          ["mapsUrl", "Google Maps"],
          ["instagramUrl", "Instagram"],
          ["genericUrl", "Outro link"],
        ].map(([name, label]) => (
          <label key={name}>
            {label}
            <input
              name={name}
              type="url"
              pattern="https?://.*"
              placeholder="https://"
              defaultValue={event?.[name as keyof TripEvent] as string}
            />
          </label>
        ))}
        <label className="wide">
          Observações
          <textarea name="notes" rows={2} defaultValue={event?.notes} />
        </label>
        {error && (
          <p role="alert" className="error wide">
            {error}
          </p>
        )}
        <div className="form-actions wide">
          <button
            type="button"
            className="secondary"
            disabled={busy}
            onClick={onClose}
          >
            Cancelar
          </button>
          <button className="primary" disabled={busy}>
            {busy ? "Salvando…" : "Salvar programa"}
          </button>
        </div>
      </form>
    </Modal>
  );
}
