import { useEffect, useState } from "react";
import { Plus } from "lucide-react";
import { useAuth } from "../hooks/useAuth";
import { watchTrips } from "../services/repository";
import { TripCard } from "../components/TripCard";
import { EmptyState } from "../components/ui/Primitives";
import type { Trip } from "../types";
import { homeTrips } from "../utils/homeTrips";
import { dateKey } from "../utils/dates";
export function Home({ onCreate }: { onCreate: () => void }) {
  const { admin, user, loading: authLoading } = useAuth();
  const [trips, setTrips] = useState<Trip[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  useEffect(() => {
    if (authLoading) return;
    setLoading(true);
    setTrips([]);
    return watchTrips(
      admin,
      (t) => {
        setTrips(t);
        setLoading(false);
        setError("");
      },
      () => {
        setError(
          "Não foi possível carregar as viagens. Verifique sua conexão.",
        );
        setLoading(false);
      },
      user?.uid,
    );
  }, [admin, authLoading, user?.uid]);
  const { featured, others } = homeTrips(trips);
  return (
    <main className="home">
      <section className="home-intro">
        <span className="eyebrow">Sua próxima história</span>
        <h1>
          {featured
            ? featured.endDate < dateKey()
              ? "Histórias para lembrar."
              : featured.startDate <= dateKey()
                ? "Sua viagem está acontecendo."
                : "Sua próxima viagem."
            : "Para onde vamos?"}
        </h1>
        <p>
          {featured
            ? "Os lugares, os planos e a vontade de ir."
            : "Organize lugares, momentos e boas ideias em um só lugar."}
        </p>
      </section>
      {loading ? (
        <div className="loading-state" role="status">
          Preparando suas viagens…
        </div>
      ) : error ? (
        <p className="error" role="alert">
          {error}
        </p>
      ) : trips.length === 0 ? (
        <EmptyState
          title="Sua próxima história começa aqui."
          description={
            admin
              ? "Escolha um destino. O resto a gente organiza pelo caminho."
              : "Nenhuma viagem pública por enquanto."
          }
        >
          {admin && (
            <button className="primary" onClick={onCreate}>
              <Plus size={18} />
              Criar viagem
            </button>
          )}
        </EmptyState>
      ) : (
        featured && (
          <>
            <TripCard trip={featured} featured admin={admin} />
            {others.length > 0 && (
              <section className="other-trips">
                <div className="section-heading">
                  <h2>Outras viagens</h2>
                </div>
                <div className="trip-grid">
                  {[...others]
                    .sort((a, b) => a.startDate.localeCompare(b.startDate))
                    .map((t) => (
                      <TripCard key={t.id} trip={t} admin={admin} />
                    ))}
                </div>
              </section>
            )}
          </>
        )
      )}
    </main>
  );
}
