import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowUpRight, Plus, MapPin, Compass } from "lucide-react";
import { useAuth } from "../hooks/useAuth";
import { watchTrips } from "../services/repository";
import { TripForm } from "../components/Forms";
import type { Trip } from "../types";
import { formatDate, daysBetween } from "../utils/dates";
export function Home() {
  const { admin, loading: authLoading } = useAuth();
  const [trips, setTrips] = useState<Trip[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [create, setCreate] = useState(false);
  useEffect(() => {
    if (authLoading) return;
    return watchTrips(
      admin,
      (t) => {
        setTrips(t);
        setLoading(false);
        setError("");
      },
      () => {
        setError(
          "Não foi possível carregar as viagens. Verifique a configuração e sua conexão.",
        );
        setLoading(false);
      },
    );
  }, [admin, authLoading]);
  return (
    <main>
      <div className="page-heading">
        <div>
          <span className="eyebrow">A PRÓXIMA BOA HISTÓRIA</span>
          <h1>Para onde vamos?</h1>
          <p className="muted">
            Um lugar para todos os seus próximos dias favoritos.
          </p>
        </div>
        {admin && (
          <button className="primary" onClick={() => setCreate(true)}>
            <Plus size={18} />
            Nova viagem
          </button>
        )}
      </div>
      {loading ? (
        <p role="status" className="empty">
          Preparando suas viagens…
        </p>
      ) : error ? (
        <p className="error" role="alert">
          {error}
        </p>
      ) : trips.length === 0 ? (
        <div className="empty">
          <Compass size={42} />
          <h2>O próximo destino está em aberto.</h2>
          <p>
            {admin
              ? "Crie uma viagem e comece a imaginar seus dias."
              : "Nenhuma viagem pública disponível por aqui."}
          </p>
          {admin && (
            <button className="primary" onClick={() => setCreate(true)}>
              Criar viagem
            </button>
          )}
        </div>
      ) : (
        <div className="trip-grid">
          {trips.map((t) => (
            <Link className="trip-card" key={t.id} to={`/viagem/${t.id}`}>
              <div className="trip-cover">
                <Compass size={74} strokeWidth={1} />
                <span className="destination-word">{t.destinationCity}</span>
                <span className="cover-label">
                  {t.isPublic ? "Roteiro público" : "Viagem privada"}
                </span>
              </div>
              <div className="trip-card-body">
                <span className="eyebrow">
                  {formatDate(t.startDate)} — {formatDate(t.endDate)} ·{" "}
                  {daysBetween(t.startDate, t.endDate)} DIAS
                </span>
                <h2>
                  {t.title}
                  <ArrowUpRight size={22} />
                </h2>
                <p>
                  <MapPin size={15} />
                  {t.destinationCity}
                  {t.destinationState && `, ${t.destinationState}`} ·{" "}
                  {t.country}
                </p>
                <p className="muted">{t.description}</p>
                <div className="trip-card-footer">
                  <span>{t.travelerName || "Seu próximo roteiro"}</span>
                  <span className="badge">{t.status}</span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
      {create && admin && (
        <TripForm
          onClose={() => setCreate(false)}
          onSaved={(id) => {
            window.location.hash = `/viagem/${id}`;
          }}
        />
      )}
    </main>
  );
}
