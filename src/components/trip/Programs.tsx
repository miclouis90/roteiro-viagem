import { useState } from "react";
import { Download, Map as MapIcon } from "lucide-react";
import { Modal } from "../Modal";
import { useToast } from "../../hooks/useToast";
import type { Trip, TripEvent } from "../../types";
import type { ItineraryType } from "../../utils/tripView";
import { datesBetween, dateKey, formatDate } from "../../utils/dates";
import { spendingLabel } from "../../utils/spending";
import { hasProgramDate, itineraryResults } from "../../utils/itinerary";
import { collectPlaces } from "../../utils/places";
import { EventCard } from "../Events";
import { EventFilters, emptyFilters } from "./EventFilters";
import { EmptyState } from "../ui/Primitives";
import { Places } from "./Places";
import { TripCalendar } from "../TripCalendar";
import { exportTrip, type ExportFormat } from "../../services/exportTrip";

export function Programs({ trip, events, admin, selectedDate, onDayChange, initialPriority, onSelect, type, onTypeChange, onMap }: {
  trip: Trip;
  events: TripEvent[];
  admin: boolean;
  selectedDate: string;
  onDayChange: (date: string) => void;
  initialPriority: string;
  onSelect: (event: TripEvent) => void;
  type: ItineraryType;
  onTypeChange: (type: ItineraryType) => void;
  onMap: (day: string) => void;
}) {
  const days = datesBetween(trip.startDate, trip.endDate);
  const today = dateKey();
  const day = hasProgramDate({ date: selectedDate }) ? selectedDate : days.includes(today) ? today : trip.startDate;
  const [filters, setFilters] = useState({ ...emptyFilters, priority: initialPriority });
  const [exportOpen, setExportOpen] = useState(false);
  const [exportBusy, setExportBusy] = useState(false);
  const [exportError, setExportError] = useState("");
  const toast = useToast();
  async function chooseExport(format: ExportFormat) {
    if (exportBusy) return;
    setExportBusy(true);
    setExportError("");
    try {
      await exportTrip(trip, events, format);
      setExportOpen(false);
      toast("Arquivo preparado.");
    } catch { setExportError("Não foi possível exportar o roteiro."); }
    finally { setExportBusy(false); }
  }
  const result = itineraryResults(events, filters, day, type);
  const placeCount = collectPlaces(result.places).length;
  const hasFilters = Object.values(filters).some(Boolean);
  const extra = result.outside.filter(event => (event.date < trip.startDate || event.date > trip.endDate) && event.date !== day);
  const groups = new Map<string, TripEvent[]>();
  for (const event of result.programs) groups.set(event.date, [...(groups.get(event.date) || []), event]);
  function timeline(programs: TripEvent[]) {
    return <div className="timeline">{programs.map(event => <EventCard key={event.id} visual itinerary event={event} currency={trip.currency} onClick={() => onSelect(event)} />)}</div>;
  }
  return <section className="programs itinerary-programs unified-programs">
    <TripCalendar trip={trip} days={days} events={events} selectedDate={day} onDayChange={onDayChange} />
    <div className="itinerary-tools">
      <EventFilters value={filters} onChange={setFilters} type={type} onTypeChange={onTypeChange} />
      <button className="itinerary-export" onClick={() => setExportOpen(true)}><Download size={15} aria-hidden="true" />Exportar</button>
    </div>
    <section className="unified-schedule" aria-labelledby="itinerary-results-title">
      <header className="unified-schedule-header">
        <div className="timeline-heading">
          <h2 id="itinerary-results-title">{type === "places" ? "Lugares salvos" : result.searching ? "Resultados do roteiro" : formatDate(day, { weekday: "long", day: "numeric", month: "long" })}</h2>
          <span aria-live="polite">{type === "places" ? placeCount + (placeCount === 1 ? " lugar" : " lugares") : result.programs.length + (result.programs.length === 1 ? " programa" : " programas") + (result.programs.length ? " · " + spendingLabel(result.programs, trip.currency) : "")}</span>
        </div>
        {!result.searching && type !== "places" && events.some(event => event.date === day) && <button className="calendar-map" onClick={() => onMap(day)}><MapIcon size={15} aria-hidden="true" />Ver no mapa</button>}
      </header>
      {type !== "places" && (result.programs.length ? result.searching ? [...groups].map(([date, programs]) => <section className="itinerary-search-day" key={date}><h3>{formatDate(date, { weekday: "long", day: "numeric", month: "long" })}</h3>{timeline(programs)}</section>) : timeline(result.programs) : <EmptyState title={hasFilters ? "Nenhum programa encontrado." : events.length ? "Esse dia está em aberto." : "Seu roteiro começa aqui."} description={hasFilters ? "Experimente mudar os filtros." : admin ? "Adicione cafés, restaurantes, passeios e tudo que você não quer esquecer." : "Um dia livre para descobrir a cidade no seu ritmo."} />)}
      {(type === "places" || result.places.length > 0) && <section className="saved-places places-programs" aria-label="Lugares salvos">
        {type !== "places" && <div className="saved-places-heading"><h3>Lugares salvos</h3><p>Ainda sem dia definido.</p></div>}
        <Places trip={trip} events={result.places} onSelect={onSelect} />
      </section>}
    </section>
    {!result.searching && type !== "places" && extra.length > 0 && <details className="expandable outside-events">
      <summary>{extra.length} programa(s) fora do período da viagem</summary><p className="muted">Confira as datas destes programas.</p>{timeline(extra)}
    </details>}
    {exportOpen && <Modal title="Exportar roteiro" onClose={() => setExportOpen(false)} busy={exportBusy}>
      <p className="muted" role="status">{exportBusy ? "Preparando arquivo..." : "Escolha o formato para baixar o roteiro completo."}</p>
      {exportError && <p className="error" role="alert">{exportError}</p>}
      <div className="quick-actions">{([{format:"PDF",label:"PDF"},{format:"Excel",label:"Excel (XLSX)"},{format:"CSV",label:"CSV"}] as const).map(({format,label}) => <button key={format} className="secondary" disabled={exportBusy} onClick={() => chooseExport(format)}>{label}</button>)}</div>
    </Modal>}
  </section>;
}
