import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { auth, db, demoMode, configured } from "../lib/firebase";
import { useAuth } from "../hooks/useAuth";
import { melTrip, melTripId } from "../data/melTrip";
import { melEvents } from "../data/melEvents";
import { formatDate } from "../utils/dates";
import { eventPriceLabel } from "../utils/eventPrice";
import { seedMelTrip } from "../services/seedMelTrip";
import {
  inspectMelTrip,
  seedMelEvents,
  type MelEventsResult,
} from "../services/seedMelEvents";

export function SeedMelPage() {
  const { admin, loading, user } = useAuth();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [tripExists, setTripExists] = useState<boolean | null>(null);
  const [result, setResult] = useState<MelEventsResult | null>(null);
  const [refresh, setRefresh] = useState(0);
  const allowed =
    configured &&
    !demoMode &&
    db?.app.options.projectId === "rumos-bsb" &&
    auth?.app.options.projectId === "rumos-bsb";
  useEffect(() => {
    let active = true;
    setTripExists(null);
    setResult(null);
    setError("");
    if (allowed && admin && user && db && auth) {
      inspectMelTrip(db, auth, demoMode)
        .then((exists) => {
          if (active) setTripExists(exists);
        })
        .catch((e: unknown) => {
          if (active)
            setError(
              e instanceof Error
                ? e.message
                : "Não foi possível verificar a viagem.",
            );
        });
    }
    return () => {
      active = false;
    };
  }, [allowed, admin, user, refresh]);

  async function insert(kind: "trip" | "events") {
    if (!allowed || !db || !auth || !admin || !user || busy) return;
    setBusy(true);
    setError("");
    setResult(null);
    try {
      if (kind === "events") {
        setResult(await seedMelEvents(db, auth, demoMode));
      } else {
        const tripResult = await seedMelTrip(db, auth, demoMode);
        if (tripResult.id !== melTripId)
          throw new Error(
            "A viagem já existe com outro identificador. Nenhum roteiro foi cadastrado.",
          );
        setTripExists(true);
      }
    } catch (e) {
      setError(
        e instanceof Error
          ? e.message
          : "Não foi possível cadastrar. Verifique sua conexão e permissão.",
      );
    } finally {
      setBusy(false);
    }
  }
  const ready = allowed && !loading && admin && !!user;
  return (
    <main className="seed-page">
      <span className="eyebrow">Pré-cadastro · rumos-bsb</span>
      <h1>{melTrip.title}</h1>
      <p className="muted">
        29 de outubro a 2 de novembro de 2026 · Brasília, DF
      </p>
      {!allowed ? (
        <p className="error" role="alert">
          Cadastro bloqueado. Use a configuração de rumos-bsb no .env e
          VITE_DEMO_MODE=false.
        </p>
      ) : loading ? (
        <p role="status">Verificando acesso…</p>
      ) : !user ? (
        <p>
          Use “Entrar com Google” no cabeçalho com sua conta administrativa.
        </p>
      ) : !admin ? (
        <p className="error">
          Sua conta precisa ser um platformAdmin ativo em rumos-bsb.
        </p>
      ) : tripExists === null && !error ? (
        <p role="status">Verificando viagem no Firestore…</p>
      ) : null}
      {ready && tripExists !== null && (
        <section className="summary-section">
          <p role="status">
            {tripExists
              ? "Viagem cadastrada ✓"
              : "Viagem ainda não encontrada."}
          </p>
          {!tripExists && (
            <button
              className="secondary"
              disabled={busy}
              onClick={() => insert("trip")}
            >
              Cadastrar viagem privada no Firestore
            </button>
          )}
          {tripExists && (
            <Link className="secondary" to={`/viagem/${melTripId}`}>
              Abrir viagem
            </Link>
          )}
        </section>
      )}
      <section className="summary-section">
        <h2>Roteiro: {melEvents.length} programas</h2>
        <p className="muted">
          2 de novembro permanece livre. Os programas existentes serão
          preservados, sem alterar a viagem ou sua privacidade.
        </p>
        <button
          className="primary"
          disabled={!ready || tripExists !== true || busy}
          onClick={() => insert("events")}
        >
          {busy
            ? "Verificando e cadastrando…"
            : "Cadastrar roteiro Brasília da Mel"}
        </button>
        {ready && result && (
          <div role="status" className="seed-result">
            <p>
              <strong>{result.created.length} criados</strong> ·{" "}
              {result.existing.length} já existentes
            </p>
            <ul>
              {melEvents.map((event) => (
                <li key={event.id}>
                  {event.title} —{" "}
                  {result.created.includes(event.id)
                    ? "Criado"
                    : "Já existente, preservado"}
                </li>
              ))}
            </ul>
            <Link className="secondary" to={`/viagem/${melTripId}`}>
              Abrir viagem
            </Link>
          </div>
        )}
      </section>
      {error && (
        <div role="alert">
          <p className="error">{error}</p>
          {ready && (
            <button
              className="secondary"
              disabled={busy}
              onClick={() => setRefresh((v) => v + 1)}
            >
              Verificar novamente
            </button>
          )}
        </div>
      )}
      {ready && (
        <details className="summary-section expandable">
          <summary>Conferir os 12 programas antes de cadastrar</summary>
          <ol className="seed-preview">
            {melEvents.map((event) => (
              <li key={event.id}>
                <strong>{event.title}</strong>
                <p>
                  {formatDate(event.date)} · {event.startTime}–{event.endTime} ·{" "}
                  {event.category}
                </p>
                <p className="muted">
                  {event.location} · {eventPriceLabel(event, "BRL")}
                </p>
                <p className="muted">{event.notes}</p>
              </li>
            ))}
          </ol>
        </details>
      )}
    </main>
  );
}
