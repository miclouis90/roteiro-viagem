import { Disclosure, revealInvalidField } from "./ui/Disclosure";
import { tripLabels } from "../utils/labels";
import { useState, type FormEvent } from "react";
import type { Trip, TripInput } from "../types";

import { daysBetween, dateKey } from "../utils/dates";
import { saveTrip } from "../services/repository";
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
    <Modal
      title={trip ? "Editar viagem" : "Uma nova viagem"}
      onClose={onClose}
      busy={busy}
    >
      <form
        onSubmit={submit}
        className="form-grid"
        onInvalidCapture={revealInvalidField}
      >
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
        <div className="wide">
          <Disclosure
            title="Detalhes da viagem"
            description="Status, moeda, descrição e privacidade"
          >
            {" "}
            <label>
              Status
              <select name="status" defaultValue={trip?.status}>
                {["planejamento", "confirmada", "concluída"].map((s) => (
                  <option key={s} value={s}>
                    {tripLabels[s as keyof typeof tripLabels] ?? s}
                  </option>
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
                  <option key={s} value={s}>
                    {tripLabels[s as keyof typeof tripLabels] ?? s}
                  </option>
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
          </Disclosure>
        </div>{" "}
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
