import type { Trip, TripEvent } from "../types";
import { formatDate } from "../utils/dates";
import { categoryOf } from "../data/categories";

export function TripSidebar({
  trip,
  active,
  upcoming,
  admin,
  setDetails,
  onDelete,
}: {
  trip: Trip;
  active: TripEvent[];
  upcoming: TripEvent[];
  admin: boolean;
  setDetails: (e: TripEvent) => void;
  onDelete: () => void;
}) {
  return (
    <aside>
      <div className="aside-card">
        <span className="eyebrow">SEU PRÓXIMO ENCONTRO</span>
        <h2>Vem por aí</h2>
        {upcoming.length ? (
          upcoming.map((e) => (
            <button
              className="upcoming"
              key={e.id}
              onClick={() => setDetails(e)}
            >
              <span className={`category-icon ${categoryOf(e.category).group}`}>
                {categoryOf(e.category).icon}
              </span>
              <span>
                <small>
                  {formatDate(e.date)} · {e.startTime}
                </small>
                <strong>{e.title}</strong>
              </span>
            </button>
          ))
        ) : (
          <p className="muted">Nenhum programa futuro por enquanto.</p>
        )}
      </div>
      <div className="aside-card">
        <h3>Um pouco de tudo</h3>
        {[
          ["food", "Gastronomia"],
          ["night", "Bares & drinks"],
          ["culture", "Cultura"],
          ["outdoor", "Passeios"],
          ["other", "Outros"],
        ].map(([group, label]) => (
          <div className="category-row" key={group}>
            <span>
              <i className={group} />
              {label}
            </span>
            <strong>
              {
                active.filter((e) => categoryOf(e.category).group === group)
                  .length
              }
            </strong>
          </div>
        ))}
      </div>
      {trip.notes && (
        <div className="aside-card notes-card">
          <span className="eyebrow">PARA LEMBRAR</span>
          <p>{trip.notes}</p>
        </div>
      )}
      <p className="privacy-note">
        {trip.isPublic
          ? "Roteiro público · visitantes podem apenas visualizar."
          : "Viagem privada · acesso exclusivo de administradores."}
      </p>
      {admin && (
        <button className="text-button danger-text" onClick={onDelete}>
          Excluir viagem
        </button>
      )}
    </aside>
  );
}
