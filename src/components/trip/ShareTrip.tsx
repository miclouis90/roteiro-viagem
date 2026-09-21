import { useState } from "react";
import { Copy, Share2, Globe2, LockKeyhole } from "lucide-react";
import type { Trip } from "../../types";
import { Modal } from "../Modal";
import { demoMode } from "../../lib/firebase";
import { saveTrip } from "../../services/repository";
import { tripInput } from "../../utils/inputs";
export function ShareTrip({
  trip,
  admin,
  onClose,
}: {
  trip: Trip;
  admin: boolean;
  onClose: () => void;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [published, setPublished] = useState(false);
  const isPublic = trip.isPublic || published;
  const url = `${window.location.href.split("#")[0]}#/viagem/${trip.id}`;
  async function copy() {
    try {
      await navigator.clipboard.writeText(url);
      setMessage("Link copiado.");
    } catch {
      setMessage("Selecione e copie o link abaixo.");
    }
  }
  async function publish() {
    if (!admin || busy) return;
    setBusy(true);
    setError("");
    try {
      await saveTrip({ ...tripInput(trip), isPublic: true }, trip.id);
      setPublished(true);
      setMessage(
        "Viagem pública. Agora você pode copiar ou compartilhar o link.",
      );
    } catch {
      setError("Não foi possível tornar a viagem pública. Tente novamente.");
    } finally {
      setBusy(false);
    }
  }
  async function share() {
    try {
      await navigator.share({
        title: trip.title,
        text: `${trip.title} · ${trip.destinationCity}`,
        url,
      });
    } catch (e) {
      if (!(e instanceof Error && e.name === "AbortError"))
        setError("Não foi possível compartilhar. Você pode copiar o link.");
    }
  }
  return (
    <Modal title={`Compartilhar ${trip.title}`} onClose={onClose} busy={busy}>
      <div className="share-content">
        <span className="share-symbol">
          {isPublic ? <Globe2 size={27} /> : <LockKeyhole size={27} />}
        </span>
        <h3>
          {isPublic
            ? "Boas experiências ficam melhores juntas."
            : "Essa viagem ainda é privada."}
        </h3>
        <p className="muted">
          {isPublic
            ? "Quem receber o link poderá ver o roteiro, sem editar."
            : "Somente administradores podem abrir este roteiro. Ao torná-lo público, qualquer pessoa com o link poderá visualizar."}
        </p>
        {demoMode && (
          <p className="notice">
            Demonstração local: o link não compartilha seus testes entre
            dispositivos.
          </p>
        )}
        <label>
          Link da viagem
          <input readOnly value={url} onFocus={(e) => e.target.select()} />
        </label>
        <div className="share-actions">
          {!isPublic && admin && (
            <button className="primary" disabled={busy} onClick={publish}>
              <Globe2 size={17} />
              {busy ? "Publicando…" : "Tornar pública e compartilhar"}
            </button>
          )}
          <button
            className={isPublic ? "primary" : "secondary"}
            onClick={copy}
            disabled={busy}
          >
            <Copy size={17} />
            Copiar link
          </button>
          {isPublic && typeof navigator.share === "function" && (
            <button className="secondary" onClick={share}>
              <Share2 size={17} />
              Compartilhar…
            </button>
          )}
        </div>
        {message && (
          <p className="feedback" role="status">
            {message}
          </p>
        )}
        {error && (
          <p className="error" role="alert">
            {error}
          </p>
        )}
      </div>
    </Modal>
  );
}
