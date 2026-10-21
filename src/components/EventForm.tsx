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
import { isLodgingCategory, lodgingCheckOut } from "../utils/lodging";
import { hasProgramDate } from "../utils/itinerary";
import { eventSaveFailure } from "../utils/eventSaveError";
export function EventForm({
  defaultDate,
  trip,
  event,
  onClose,
  kind = "program",
  expandDetails = false,
  onSaved,
  privateReservationAllowed = true,
}: {
  trip: Trip;
  defaultDate?: string;
  event?: TripEvent;
  onClose: () => void;
  firstEvent?: boolean;
  kind?: "program" | "transport" | "place" | "lodging";
  expandDetails?: boolean;
  onSaved: (event: TripEvent) => void;
  privateReservationAllowed?: boolean;
}) {
  const [showDetails, setShowDetails] = useState(expandDetails);
  const [free, setFree] = useState(event?.isFree ?? false);
  const [category, setCategory] = useState(
    event?.category ??
      (kind === "lodging" ? "Hotel" : kind === "transport" ? "Voo" : kind === "place" ? "Outro" : "Café"),
  );
  const [details, setDetails] = useState(event?.details);
  const [startTime, setStartTime] = useState(event?.startTime ?? "09:00");
  const [endTime, setEndTime] = useState(event?.endTime ?? "");
  const [checkOutDate, setCheckOutDate] = useState(event ? lodgingCheckOut(event) : "");
  const [checkInTime, setCheckInTime] = useState(event?.details?.type === "lodging" ? event.startTime : "");
  const isStay = isLodgingCategory(category);
  const [arrivalTime, setArrivalTime] = useState(() =>
    String(
      (event?.details?.type === "flight" && event.details.arrivalTime) ||
        event?.endTime || "",
    ),
  );
  const [departureEdited, setDepartureEdited] = useState(false);
  const [arrivalEdited, setArrivalEdited] = useState(false);
  const isFlight = category === "Voo";
  const legacyDeparture = details?.type === "flight"
    ? String(details.departureTime || "") : "";
  const departureConflict = isFlight && !departureEdited &&
    !!legacyDeparture && legacyDeparture !== startTime;
  const arrivalConflict = isFlight && !arrivalEdited &&
    !!endTime && !!arrivalTime && endTime !== arrivalTime;
  const legacyOvernight = isFlight && !arrivalEdited && !departureEdited &&
    !!endTime && endTime < startTime;
  function changeDeparture(time: string) {
    setStartTime(time);
    if (isFlight) setDepartureEdited(true);
  }
  function changeArrival(time: string) {
    setArrivalTime(time);
    setArrivalEdited(true);
    setDetails((current) => {
      const next: EventDetailsData = {
        ...(current?.type === "flight" ? current : { type: "flight" }),
        arrivalTime: time,
      };
      if (!time) delete next.arrivalTime;
      return Object.keys(next).length > 1 ? next : undefined;
    });
  }
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
    if (isStay) {
      input.startTime = checkInTime;
      input.endTime = "";
      // The existing price field holds the whole stay. Guests never multiply its cost.
      input.peopleCount = 1;
      input.details = { ...(details?.type === "lodging" ? details : {}), type: "lodging", checkOutDate };
      if (!hasProgramDate({ date: input.date }) || input.date < trip.startDate || input.date > trip.endDate) {
        setError("Informe uma data de check-in válida dentro do período da viagem.");
        return;
      }
      if (!hasProgramDate({ date: checkOutDate }) || checkOutDate <= input.date || checkOutDate > trip.endDate) {
        setError("O check-out deve ser posterior ao check-in e estar dentro do período da viagem.");
        return;
      }
      if (!input.location) { setError("Informe o local ou endereço da hospedagem."); return; }
      if (!Number.isFinite(input.pricePerPerson) || input.pricePerPerson < 0 || input.pricePerPerson > 10000000) {
        setError("Informe um valor total válido entre zero e 10.000.000.");
        return;
      }
      if (checkInTime && !/^([01]\d|2[0-3]):[0-5]\d$/.test(checkInTime)) {
        setError("Informe um horário de check-in válido.");
        return;
      }
    }
    if (isFlight) {
      input.endTime = endTime;
      // Only an explicit edit/choice reconciles legacy duplicates. Unrelated saves preserve them.
      if (departureEdited && legacyDeparture && input.details?.type === "flight") {
        input.details = { ...input.details, departureTime: input.startTime };
      }
      if (endTime && (arrivalEdited || departureEdited) && !arrivalConflict) {
        input.endTime = arrivalTime >= input.startTime ? arrivalTime : "";
        if (arrivalTime) input.details = { ...(input.details ?? { type: "flight" }), arrivalTime };
      }
    }
    if (!input.title) {
      setError("Informe o nome do programa.");
      return;
    }
    if (input.details && !validDetails(input.details)) {
      setError(
        isStay ? "Confira os detalhes da hospedagem: horários válidos, quantidade inteira de hóspedes entre 1 e 10.000 e links http(s). Use textos de até 1.000 caracteres."
          : "Confira os detalhes opcionais. Use textos de até 1.000 caracteres e links válidos.",
      );
      return;
    }
    if (input.endTime && input.endTime < input.startTime) {
      setShowDetails(true);
      requestAnimationFrame(() =>
        form.querySelectorAll("details").forEach((d) => (d.open = true)),
      );
      setError(isFlight
        ? "Confira e confirme a chegada do voo antes de salvar. O horário final antigo conflita com a partida."
        : "O horário final deve ser posterior ao inicial no mesmo dia.");
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
      toast(event ? "Alterações salvas." : isStay ? "Hospedagem adicionada." : "Programa adicionado.");
      onSaved({ ...input, id });
    } catch (cause) {
      const failure = eventSaveFailure(cause, isStay);
      console.warn("Rumo: falha ao salvar programa", failure.diagnostic);
      setError(failure.message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <Modal
      title={
        event
          ? isStay ? "Editar hospedagem" : "Editar programa"
          : isStay ? "Adicionar hospedagem" : kind === "transport"
            ? "Adicionar transporte"
            : kind === "place"
              ? "Lugar para lembrar"
              : "Adicionar programa"
      }
      onClose={onClose}
      busy={busy}
    >
      <form
        className="progressive-form event-edit-form"
        onSubmit={submit}
        onInvalidCapture={revealInvalidField}
      >
        <p className="form-intro">
          {event ? "Edite o essencial. Os demais detalhes são opcionais." : "Só o essencial para começar."} Campos com * são obrigatórios.
        </p>
        <div className="form-grid">
          <label className="wide">
            {isStay ? "Nome da hospedagem *" : "Nome *"}
            <input
              name="title"
              required
              maxLength={120}
              defaultValue={event?.title}
              placeholder={isStay ? "Onde vamos ficar?" : "O que vamos fazer?"}
            />
          </label>
          <CategoryPicker
            value={category}
            onChange={(next) => {
              const nextType = detailTypeFor(next);
              const currentType = detailTypeFor(category);
              const nextDetails = nextType === currentType
                ? details : nextType ? detailDrafts[nextType] : undefined;
              if (nextType !== currentType) {
                if (details)
                  setDetailDrafts((drafts) => ({
                    ...drafts,
                    [details.type]: details,
                  }));
                setDetails(nextDetails);
              }
              if (next === "Voo" && category !== "Voo") {
                setArrivalTime(String(
                  (nextDetails?.type === "flight" && nextDetails.arrivalTime) ||
                    endTime || "",
                ));
                setArrivalEdited(false);
              }
              setCategory(next);
            }}
          />
          <label>
            {isStay ? "Data de check-in *" : isFlight ? "Data da partida *" : "Data *"}
            <input
              name="date"
              type="date"
              min={trip.startDate}
              max={trip.endDate}
              defaultValue={event?.date ?? (defaultDate || trip.startDate)}
              required
            />
          </label>
          {isStay ? <label>
            Data de check-out *
            <input name="checkOutDate" type="date" min={trip.startDate} max={trip.endDate} required
              value={checkOutDate} onChange={e => setCheckOutDate(e.target.value)} />
          </label> :
          <label>
            {isFlight ? "Horário da partida *" : "Horário *"}
            <input
              name="startTime"
              type="time"
              required
              value={startTime}
              onChange={(e) => changeDeparture(e.target.value)}
            />
          </label>}
          <label className="wide">
            {isStay ? "Local / endereço *" : "Local / endereço · opcional"}
            <input
              name="location"
              required={isStay}
              defaultValue={event?.location}
              placeholder="Nome do lugar, bairro ou endereço"
            />
          </label>
        </div>
        {(departureConflict || arrivalConflict || legacyOvernight) && (
          <section className="flight-time-review" aria-label="Conferir horários do voo">
            <p className="field-help">
              Este voo tem horários antigos para conferir. Escolha qual usar para
              unificar. Sem uma escolha ou edição do horário, os valores anteriores
              serão preservados.
            </p>
            {departureConflict && <div>
              <p>Partida no roteiro: <strong>{startTime}</strong>. Partida nas informações do voo: <strong>{legacyDeparture}</strong>.</p>
              <div className="quick-actions">
                <button type="button" className="ghost" onClick={() => setDepartureEdited(true)}>
                  Usar partida {startTime}
                </button>
                <button type="button" className="ghost" onClick={() => changeDeparture(legacyDeparture)}>
                  Usar partida {legacyDeparture}
                </button>
              </div>
            </div>}
            {arrivalConflict && <div>
              <p>Chegada nas informações do voo: <strong>{arrivalTime}</strong>. Horário final antigo: <strong>{endTime}</strong>.</p>
              <div className="quick-actions">
                <button type="button" className="ghost" onClick={() => changeArrival(arrivalTime)}>
                  Usar chegada {arrivalTime}
                </button>
                <button type="button" className="ghost" onClick={() => changeArrival(endTime)}>
                  Usar chegada {endTime}
                </button>
              </div>
            </div>}
            {legacyOvernight && !arrivalConflict && <div>
              <p>A chegada antiga é anterior à partida no relógio. Confira também a data e o fuso nas Notas do voo.</p>
              <button type="button" className="ghost" onClick={() => changeArrival(arrivalTime)}>
                Confirmar chegada {arrivalTime}
              </button>
            </div>}
          </section>
        )}
        {!event && (
          <p className="field-help">
            Salve o essencial. Depois, você pode adicionar mais detalhes.
          </p>
        )}
        {(event || isStay) && !showDetails && (
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
              flightArrivalTime={isFlight ? arrivalTime : undefined}
              onFlightArrivalChange={isFlight ? changeArrival : undefined}
              privateReservationAllowed={privateReservationAllowed}
              leadingFields={isStay ? <label>Horário de check-in<input type="time" value={checkInTime} onChange={e => setCheckInTime(e.target.value)} /></label> : undefined}
            />
            <Disclosure
              title="Preferências"
              description={isFlight || isStay ? "Status e prioridade" : "Duração, status e prioridade"}
            >
              {!isFlight && !isStay && <label>
                Horário final
                <input
                  type="time"
                  name="endTime"
                  value={endTime}
                  onChange={(e) => setEndTime(e.target.value)}
                />
              </label>}
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
              description={isStay ? "Valor total da estadia" : "Preço e número de pessoas"}
              initialOpen={!!event?.pricePerPerson}
            >
              <label className="check wide">
                <input
                  type="checkbox"
                  checked={free}
                  onChange={(e) => setFree(e.target.checked)}
                />
                {isStay ? "Hospedagem gratuita" : "Programa grátis"}
              </label>
              <label>
                {isStay ? "Valor total da hospedagem" : "Valor por pessoa"} ({trip.currency})
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
              {!isStay && <label>
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
              </label>}
            </Disclosure>
            {!free && (
              <p className="muted">
                {isStay ? "O valor total é contado uma única vez, no dia do check-in. Zero sem marcar gratuita significa valor a definir." : "Preço zero em um programa pago significa “Valor a definir”."}
              </p>
            )}
            {!isStay && <Disclosure title="Links" description="Mapa, site e Instagram">
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
            </Disclosure>}
            {!isStay && <Disclosure title="Observações" description="O que vale lembrar">
              <label className="wide">
                Observações
                <textarea
                  name="notes"
                  rows={3}
                  defaultValue={event?.notes}
                  placeholder="Reservas, dicas e outras boas ideias"
                />
              </label>
            </Disclosure>}
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
                : isStay ? "Salvar hospedagem" : "Salvar programa"}
          </button>
        </div>
      </form>
    </Modal>
  );
}
