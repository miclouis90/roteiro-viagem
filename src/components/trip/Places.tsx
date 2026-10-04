import { MapPin, ArrowUpRight } from "lucide-react";
import type { Trip, TripEvent } from "../../types";
import { categoryOf, type Category } from "../../data/categories";
import { safeUrl } from "../../utils/money";
import { collectPlaces } from "../../utils/places";
import { formatDate } from "../../utils/dates";
import { hasProgramDate } from "../../utils/itinerary";
import { eventLabels } from "../../utils/labels";
import { EmptyState } from "../ui/Primitives";
// Destination imagery is atmospheric; it does not claim to photograph each venue.
function PlaceVisual({ category, brasilia }: { category: Category; brasilia: boolean }) {
  const Icon = category.icon;
  const scene = category.name === "Café" ? 1 : category.group === "transport" ? 0
    : category.group === "night" ? 4 : category.group === "outdoor" ? 2
    : category.group === "culture" ? 3 : null;
  const illustrated = !brasilia || scene === null;
  return <span className={`place-list-visual place-art-${category.group} ${illustrated ? "place-art-abstract" : `place-art-scene place-art-scene-${scene}`}`} aria-hidden="true">
    {illustrated && <svg className="place-artwork" viewBox="0 0 120 160" fill="none" focusable="false">
      <circle className="art-halo" cx="104" cy="19" r="56" />
      {category.group === "food" ? <>
        <circle className="art-fill" cx="44" cy="79" r="41" /><circle className="art-line" cx="44" cy="79" r="29" />
        <path className="art-line" d="M94 26v91M85 26v31q9 12 18 0V26M22 135h69" />
      </> : category.group === "night" ? <>
        <path className="art-fill" d="M23 45h78L62 95z" /><path className="art-line" d="M62 95v37m-21 0h42M18 35l78 78M37 18l78 78" />
        <circle className="art-line" cx="72" cy="72" r="42" />
      </> : category.group === "culture" ? <>
        <path className="art-fill" d="M6 70L62 25l56 45zM12 79h96v60H12z" />
        <path className="art-line" d="M8 73h105M27 81v46m22-46v46m23-46v46m22-46v46M6 140h109" />
      </> : category.group === "outdoor" ? <>
        <path className="art-fill" d="M-10 87Q31 30 83 66t47 80H-10z" />
        <path className="art-line" d="M-4 144q44-9 34-36T66 85q43 6 65-37" />
        <circle className="art-fill" cx="26" cy="33" r="17" /><circle className="art-line" cx="84" cy="36" r="23" />
      </> : category.group === "transport" ? <>
        <path className="art-route" d="M16 124q82 18 60-50T102 24" />
        <circle className="art-fill" cx="16" cy="124" r="8" /><circle className="art-line" cx="102" cy="24" r="8" />
        <path className="art-line" d="M5 44l109 66M5 54l109 66" />
      </> : <>
        <path className="art-fill" d="M-6 47l57-21 9 87-49 31zM68 21l44 11 13 94-46-12z" />
        <path className="art-line" d="M-5 77l128-28M5 101l108-30M53 20l18 132" />
        <circle className="art-line" cx="63" cy="76" r="18" />
      </>}
    </svg>}
    <span className="place-art-symbol"><Icon size={22} strokeWidth={1.6} /></span>
  </span>;
}

export function Places({ trip, events, onSelect }: { trip: Trip; events: TripEvent[]; onSelect: (e: TripEvent) => void }) {
  const brasilia = trip.destinationCity.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase() === "brasilia";
  const places = collectPlaces(events);
  return <>
    {places.length ? <div className="places-grid">{places.map((place) => {
      const event = place.events[0];
      const url = safeUrl(event.mapsUrl) || (place.location ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(place.location + " " + trip.destinationCity)}` : undefined);
      const category = categoryOf(event.category);
      const tone = category.tone;
      const Icon = category.icon;
      return <article className={`place-list-card tone-${tone}`} key={place.key}>
        <div className="place-card-face">
        <button className="place-list-main" onClick={() => onSelect(event)}>
          <PlaceVisual category={category} brasilia={brasilia} />
          <span className="place-list-copy">
            <strong>{place.name}</strong>
            <span className="place-list-address">{place.location || "Local a definir"}</span>
            <span className="place-list-meta"><span className="place-category-name"><Icon size={12} aria-hidden="true" />{event.category}</span><span aria-hidden="true">·</span><span className={`status-chip status-${event.status}`}>{eventLabels[event.status]}</span></span>
          </span>
          <ArrowUpRight className="place-list-open" size={17} aria-hidden="true" />
        </button>
        {url && <a className="place-list-map" href={url} target="_blank" rel="noopener noreferrer" aria-label={`Abrir no mapa: ${place.name}`} title="Abrir no mapa"><MapPin size={14} aria-hidden="true" /><span>Abrir no mapa</span></a>}
        </div>
        {place.events.length > 1 && <details className="expandable place-list-visits"><summary aria-label={`${place.events.length} visitas no roteiro`}>{place.events.length} visitas</summary>{place.events.map((visit) => <button className="ghost" key={visit.id} onClick={() => onSelect(visit)}>{hasProgramDate(visit) ? formatDate(visit.date) : "Sem dia definido"} {visit.startTime && `· ${visit.startTime}`} · {visit.title}</button>)}</details>}
      </article>;
    })}</div> : <EmptyState title="Sua coleção começa pelo roteiro." description="Adicione um lugar que você quer conhecer e ele aparece aqui." />}
  </>;
}
