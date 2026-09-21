import { useState } from "react";
import { Link } from "react-router-dom";
import { auth, db, demoMode, configured } from "../lib/firebase";
import { useAuth } from "../hooks/useAuth";
import { melTrip } from "../data/melTrip";
import { daysBetween, formatDate } from "../utils/dates";
import { seedMelTrip, type SeedResult } from "../services/seedMelTrip";
export function SeedMelPage() {
  const { admin, loading, user } = useAuth();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<SeedResult | null>(null);
  const allowed =
    configured &&
    !demoMode &&
    db?.app.options.projectId === "rumos-bsb" &&
    auth?.app.options.projectId === "rumos-bsb";
  async function insert() {
    if (!allowed || !db || !auth || !admin || busy) return;
    setBusy(true);
    setError("");
    try {
      setResult(await seedMelTrip(db, auth, demoMode));
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
  return (
    <main>
      <span className="eyebrow">PRÉ-CADASTRO · RUMOS-BSB</span>
      <h1>{melTrip.title}</h1>
      <p>{melTrip.description}</p>
      <div className="aside-card">
        <p>
          Brasília · DF · Brasil
          <br />
          {formatDate(melTrip.startDate)} — {formatDate(melTrip.endDate)} de
          2026 · {daysBetween(melTrip.startDate, melTrip.endDate)} dias
          <br />
          Viajante: Mel · planejamento · BRL
          <br />
          Privada · sem atividades
        </p>
        <p>{melTrip.notes}</p>
      </div>
      {!allowed ? (
        <p className="error" role="alert">
          Cadastro bloqueado. Preencha o .env com a configuração de rumos-bsb,
          defina VITE_DEMO_MODE=false e reinicie o comando.
        </p>
      ) : loading ? (
        <p role="status">Verificando acesso…</p>
      ) : !user ? (
        <p>
          Use “Entrar com Google” no cabeçalho com sua conta administrativa.
        </p>
      ) : !admin ? (
        <p className="error">
          Sua conta precisa ter platformAdmins/SEU_UID com active=true em
          rumos-bsb.
        </p>
      ) : result ? (
        <div role="status">
          <p>
            {result.created
              ? "Viagem cadastrada no Firestore real."
              : "Esta viagem já existe. Nenhuma alteração foi feita."}
          </p>
          <p>Documento: trips/{result.id}</p>
          <Link className="primary" to={`/viagem/${result.id}`}>
            Abrir viagem
          </Link>
        </div>
      ) : (
        <button className="primary" disabled={busy} onClick={insert}>
          {busy
            ? "Verificando e cadastrando…"
            : "Cadastrar viagem privada no Firestore"}
        </button>
      )}
      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}
    </main>
  );
}
