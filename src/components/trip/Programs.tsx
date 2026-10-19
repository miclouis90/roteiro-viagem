import { lazy, Suspense, useState } from "react";
import { Compass, Download, Map as MapIcon } from "lucide-react";
import { Modal } from "../Modal";
import { useToast } from "../../hooks/useToast";
import type { Trip, TripEvent } from "../../types";
import type { ItineraryType } from "../../utils/tripView";
import { datesBetween, dateKey } from "../../utils/dates";
import { spendingLabel } from "../../utils/spending";
import { hasProgramDate, explorationResults } from "../../utils/itinerary";
import { collectPlaces } from "../../utils/places";
import { categoryGroups, categoryOf } from "../../data/categories";
import { ExploreProgramCard } from "./ExploreProgramCard";
import { EventFilters, emptyFilters } from "./EventFilters";
import { EmptyState } from "../ui/Primitives";
import { Places } from "./Places";
import { TripCalendar } from "../TripCalendar";
import { LoadingState } from "../ui/LoadingState";
import { exportTrip, type ExportFormat } from "../../services/exportTrip";

const DayMap = lazy(() => import("./DayMap"));

export function Programs({ trip, events, admin, selectedDate, onDayChange, initialPriority, onSelect, type, onTypeChange, mode, onModeChange }: {
  trip: Trip;
  events: TripEvent[];
  admin: boolean;
  selectedDate: string;
  onDayChange: (date: string) => void;
  initialPriority: string;
  onSelect: (event: TripEvent) => void;
  type: ItineraryType;
  onTypeChange: (type: ItineraryType) => void;
  mode: "list" | "map";
  onModeChange: (mode: "list" | "map") => void;
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
  const result = explorationResults(events, filters, type);
  const placeCount = collectPlaces(result.places).length;
  const hasFilters = Object.values(filters).some(Boolean) || type !== "all";
  function changeGroup(group: string) {
    setFilters(current => ({ ...current, group, category: current.category && categoryOf(current.category).group === group ? current.category : "" }));
  }
  return <section className="programs itinerary-programs unified-programs">
    <div className="itinerary-map-dates" hidden={mode !== "map"}>
    <TripCalendar trip={trip} days={days} events={events} selectedDate={day} onDayChange={onDayChange} visible={mode === "map"} />
    </div>
    <div className="itinerary-mode-switch" role="group" aria-label="Visualização do roteiro">
      <button type="button" aria-pressed={mode === "list"} onClick={() => onModeChange("list")}><Compass size={17} aria-hidden="true" />Explorar</button>
      <button type="button" aria-pressed={mode === "map"} onClick={() => onModeChange("map")}><MapIcon size={17} aria-hidden="true" />Mapa</button>
    </div>
    <div className="itinerary-list itinerary-explore" hidden={mode === "map"}>
    <div className="itinerary-tools">
      <EventFilters value={filters} onChange={setFilters} type={type} onTypeChange={onTypeChange} />
    </div>
    <div className="explore-categories" role="group" aria-label="Categorias do roteiro">
      <button type="button" aria-pressed={!filters.group && !filters.category} onClick={() => changeGroup("")}>Todos</button>
      {categoryGroups.map(({ id, label, tone, icon: Icon }) => <button type="button" key={id} className={`tone-${tone}`} aria-pressed={filters.group === id} onClick={() => changeGroup(id)}><Icon size={14} aria-hidden="true" />{label}</button>)}
    </div>
    <section className="unified-schedule" aria-labelledby="itinerary-results-title">
      <header className="unified-schedule-header">
        <div className="timeline-heading">
          <h2 id="itinerary-results-title">{type === "places" ? "Lugares salvos" : filters.search.trim() ? "Resultados da busca" : "Todos os programas"}</h2>
          <span aria-live="polite">{type === "places" ? placeCount + (placeCount === 1 ? " lugar" : " lugares") : result.programs.length + (result.programs.length === 1 ? " programa" : " programas") + (result.programs.length ? " · " + spendingLabel(result.programs, trip.currency) : "")}</span>
        </div>
        <button type="button" className="itinerary-export" onClick={() => setExportOpen(true)}><Download size={15} aria-hidden="true" />Exportar</button>
      </header>
      {type !== "places" && (result.programs.length ? <div className="explore-programs" aria-label="Programas da viagem">{result.programs.map(event => <ExploreProgramCard key={event.id} event={event} currency={trip.currency} onSelect={onSelect} />)}</div> : <EmptyState title={hasFilters ? "Nenhum programa encontrado." : "Seu roteiro começa aqui."} description={hasFilters ? "Experimente mudar os filtros." : admin ? "Adicione cafés, restaurantes, passeios e tudo que você não quer esquecer." : "Os programas desta viagem aparecerão aqui."} />)}
      {(type === "places" || result.places.length > 0) && <section className="saved-places places-programs" aria-label="Lugares salvos">
        <div className="saved-places-heading">{type !== "places" && <h3>Lugares salvos</h3>}<p>{type === "places" ? "Sua coleção de lugares, com ou sem dia definido." : "Sem data definida."}</p></div>
        <Places trip={trip} events={result.places} onSelect={onSelect} />
      </section>}
    </section>
    </div>
    {mode === "map" && <Suspense fallback={<LoadingState label="Preparando o mapa do dia…" />}>
      <DayMap trip={trip} events={events} day={day} onSelect={onSelect} />
    </Suspense>}
    {exportOpen && <Modal title="Exportar roteiro" onClose={() => setExportOpen(false)} busy={exportBusy}>
      <p className="muted" role="status">{exportBusy ? "Preparando arquivo..." : "Escolha o formato para baixar o roteiro completo."}</p>
      {exportError && <p className="error" role="alert">{exportError}</p>}
      <div className="quick-actions">{([{format:"PDF",label:"PDF"},{format:"Excel",label:"Excel (XLSX)"},{format:"CSV",label:"CSV"}] as const).map(({format,label}) => <button key={format} className="secondary" disabled={exportBusy} onClick={() => chooseExport(format)}>{label}</button>)}</div>
    </Modal>}
  </section>;
}
