import { useState, type FormEvent } from "react";
import type { Trip, TripEvent, EventInput } from "../types";
import { CategoryPicker } from "./ui/CategoryPicker";
import { eventInput } from "../utils/inputs";
import { saveEvent } from "../services/repository";
import { useToast } from "../hooks/useToast";
import { Modal } from "./Modal";
import { Disclosure, revealInvalidField } from "./ui/Disclosure";
import { eventLabels, priorityLabels } from "../utils/labels";
import {
  detailTypeFor,
  validDetails,
  type DetailType,
  type EventDetailsData,
} from "../data/eventDetails";
import { EventSpecificFields } from "./EventSpecificFields";
export function EventForm({
  defaultDate,
  trip,
  event,
  onClose,
  kind = "program",
  expandDetails = false,
  onSaved,
}: {
  trip: Trip;
  defaultDate?: string;
  event?: TripEvent;
  onClose: () => void;
  firstEvent?: boolean;
  kind?: "program" | "transport" | "place";
  expandDetails?: boolean;
  onSaved: (event: TripEvent) => void;
}) {
  const [showDetails, setShowDetails] = useState(expandDetails);
  const [free, setFree] = useState(event?.isFree ?? false);
  const [category, setCategory] = useState(
    event?.category ??
      (kind === "transport" ? "Voo" : kind === "place" ? "Outro" : "Café"),
  );
  const [details, setDetails] = useState(event?.details);
  const [detailDrafts, setDetailDrafts] = useState<
    Partial<Record<DetailType, EventDetailsData>>
  >({});
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const toast = useToast();
  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const f = new FormData(form);
    const s = (k: string) =>
      String(f.get(k) ?? event?.[k as keyof TripEvent] ?? "").trim();
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
      pricePerPerson: free
        ? 0
        : Number(f.get("price") ?? event?.pricePerPerson ?? 0),
      peopleCount: Number(f.get("people") ?? event?.peopleCount ?? 1),
      isFree: free,
      notes: s("notes"),
      status: (s("status") || "ideia") as EventInput["status"],
      priority: (s("priority") || "gostaria de ir") as EventInput["priority"],
      ...(details ? { details } : {}),
    };
    if (!input.title) {
      setError("Informe o nome do programa.");
      return;
    }
    if (details && !validDetails(details)) {
      setError(
        "Confira os detalhes opcionais. Use textos de até 1.000 caracteres e links válidos.",
      );
      return;
    }
    if (input.endTime && input.endTime < input.startTime) {
      setShowDetails(true);
      requestAnimationFrame(() =>
        form.querySelectorAll("details").forEach((d) => (d.open = true)),
      );
      setError("O horário final deve ser posterior ao inicial no mesmo dia.");
      return;
    }
    setBusy(true);
    setError("");
    try {
      const id = await saveEvent(
        trip.id,
        input,
        event?.id,
        event ? eventInput(event) : undefined,
      );
      toast(event ? "Alterações salvas." : "Programa adicionado.");
      onSaved({ ...input, id });
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
      title={
        event
          ? "Editar programa"
          : kind === "transport"
            ? "Adicionar transporte"
            : kind === "place"
              ? "Lugar para lembrar"
              : "Adicionar programa"
      }
      onClose={onClose}
      busy={busy}
    >
      <form
        className="progressive-form"
        onSubmit={submit}
        onInvalidCapture={revealInvalidField}
      >
        <div className="form-grid">
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
          <CategoryPicker
            value={category}
            onChange={(next) => {
              const nextType = detailTypeFor(next);
              if (nextType !== detailTypeFor(category)) {
                if (details)
                  setDetailDrafts((drafts) => ({
                    ...drafts,
                    [details.type]: details,
                  }));
                setDetails(nextType ? detailDrafts[nextType] : undefined);
              }
              setCategory(next);
            }}
          />
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
            Horário
            <input
              name="startTime"
              type="time"
              required
              defaultValue={event?.startTime ?? "09:00"}
            />
          </label>
          <label className="wide">
            Local / endereço
            <input
              name="location"
              defaultValue={event?.location}
              placeholder="Nome do lugar, bairro ou endereço"
            />
          </label>
        </div>
        {!event && (
          <p className="field-help">
            Salve o essencial. Depois, você pode adicionar mais detalhes.
          </p>
        )}
        {event && !showDetails && (
          <button
            type="button"
            className="secondary more-details"
            onClick={() => setShowDetails(true)}
          >
            Adicionar mais detalhes
          </button>
        )}
        {event?.details && event.details.type !== detailTypeFor(category) && (
          <p className="field-help">
            Ao salvar esta categoria, os detalhes específicos da categoria
            anterior serão removidos. Volte à categoria anterior para
            recuperá-los antes de salvar.
          </p>
        )}
        {showDetails && (
          <>
            <div className="optional-heading">Adicionar detalhes</div>
            <EventSpecificFields
              category={category}
              value={details}
              onChange={setDetails}
            />
            <Disclosure
              title="Preferências"
              description="Duração, status e prioridade"
            >
              <label>
                Horário final
                <input
                  type="time"
                  name="endTime"
                  defaultValue={event?.endTime}
                />
              </label>
              <label>
                Status
                <select name="status" defaultValue={event?.status ?? "ideia"}>
                  {Object.entries(eventLabels).map(([v, label]) => (
                    <option key={v} value={v}>
                      {label}
                    </option>
                  ))}
                </select>
              </label>
              <label className="wide">
                Prioridade
                <select
                  name="priority"
                  defaultValue={event?.priority ?? "gostaria de ir"}
                >
                  {Object.entries(priorityLabels).map(([v, label]) => (
                    <option key={v} value={v}>
                      {label}
                    </option>
                  ))}
                </select>
              </label>
              <label className="wide">
                Descrição
                <textarea
                  name="description"
                  rows={3}
                  defaultValue={event?.description}
                />
              </label>
            </Disclosure>
            <Disclosure
              title="Custos"
              description="Preço e número de pessoas"
              initialOpen={!!event?.pricePerPerson}
            >
              <label className="check wide">
                <input
                  type="checkbox"
                  checked={free}
                  onChange={(e) => setFree(e.target.checked)}
                />
                Programa grátis
              </label>
              <label>
                Valor por pessoa ({trip.currency})
                <input
                  name="price"
                  type="number"
                  min="0"
                  max="10000000"
                  step="0.01"
                  required
                  disabled={free}
                  defaultValue={event?.pricePerPerson ?? 0}
                />
              </label>
              <label>
                Pessoas
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
            </Disclosure>
            {!free && (
              <p className="muted">
                Preço zero em um programa pago significa “Valor a definir”.
              </p>
            )}
            <Disclosure title="Links" description="Mapa, site e Instagram">
              {[
                ["websiteUrl", "Site oficial"],
                ["mapsUrl", "Google Maps"],
                ["instagramUrl", "Instagram"],
                ["genericUrl", "Outro link"],
              ].map(([name, label]) => (
                <label key={name} className="wide">
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
            </Disclosure>
            <Disclosure title="Observações" description="O que vale lembrar">
              <label className="wide">
                Observações
                <textarea
                  name="notes"
                  rows={3}
                  defaultValue={event?.notes}
                  placeholder="Reservas, dicas e outras boas ideias"
                />
              </label>
            </Disclosure>
          </>
        )}
        {error && (
          <p className="error" role="alert">
            {error}
          </p>
        )}
        <div className="form-actions">
          <button
            type="button"
            className="ghost"
            disabled={busy}
            onClick={onClose}
          >
            Cancelar
          </button>
          <button className="primary" disabled={busy}>
            {busy
              ? "Salvando…"
              : event
                ? "Salvar alterações"
                : "Salvar programa"}
          </button>
        </div>
      </form>
    </Modal>
  );
}
