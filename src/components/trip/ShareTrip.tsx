import { useEffect, useState } from "react";
import { Copy, Share2 } from "lucide-react";
import type { Trip, TripAccess, TripMember } from "../../types";
import { Modal } from "../Modal";
import { demoMode } from "../../lib/firebase";
import { tripAccess } from "../../utils/access";
import {
  claimOwnership,
  joinTrip,
  removeMember,
  setTripAccess,
  watchMembers,
} from "../../services/collaboration";
import { useAuth } from "../../hooks/useAuth";
export function ShareTrip({
  trip,
  owner,
  legacy,
  editor,
  onClose,
}: {
  trip: Trip;
  owner: boolean;
  legacy: boolean;
  editor: boolean;
  onClose: () => void;
}) {
  const { user, login } = useAuth();
  const [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [message, setMessage] = useState("");
  const [mode, setMode] = useState<TripAccess>(tripAccess(trip));
  const [members, setMembers] = useState<TripMember[]>([]);
  const [removing, setRemoving] = useState<TripMember | null>(null);
  const url = `${window.location.href.split("#")[0]}#/viagem/${trip.id}`;
  useEffect(() => {
    setMode(tripAccess(trip));
  }, [trip]);
  useEffect(() => {
    if (!owner) return;
    return watchMembers(trip.id, setMembers, () =>
      setError("Não foi possível carregar os colaboradores."),
    );
  }, [trip.id, owner]);
  async function act(action: () => Promise<void>, success: string) {
    if (busy) return;
    setBusy(true);
    setError("");
    setMessage("");
    try {
      await action();
      setMessage(success);
    } catch (e) {
      setError(
        e instanceof Error
          ? e.message
          : "Não foi possível concluir. Tente novamente.",
      );
    } finally {
      setBusy(false);
    }
  }
  return (
    <Modal title={`Compartilhar ${trip.title}`} onClose={onClose} busy={busy}>
      <div className="share-content">
        <p className="muted">
          {tripAccess(trip) === "PUBLIC_EDIT"
            ? "Qualquer pessoa com o link pode visualizar. Para colaborar, é preciso entrar com Google."
            : tripAccess(trip) === "PUBLIC"
              ? "Qualquer pessoa com o link pode visualizar. Apenas o proprietário e colaboradores podem editar."
              : tripAccess(trip) === "SHARED"
                ? "Somente o proprietário e os colaboradores têm acesso."
                : "Somente o proprietário tem acesso."}
        </p>
        {demoMode ? (
          <p className="notice">
            O compartilhamento entre pessoas exige o Firebase. A demonstração
            fica neste navegador.
          </p>
        ) : legacy ? (
          <div className="notice">
            <p>
              Esta viagem antiga ainda não tem proprietário. Nenhum programa
              será alterado.
            </p>
            <button
              className="primary"
              disabled={busy}
              onClick={() =>
                act(
                  () => claimOwnership(trip.id),
                  "Você agora é o proprietário desta viagem.",
                )
              }
            >
              Definir minha conta como proprietária
            </button>
          </div>
        ) : (
          owner && (
            <>
              <label>
                Acesso à viagem
                <select
                  value={mode}
                  onChange={(e) => setMode(e.target.value as TripAccess)}
                  disabled={busy}
                >
                  <option value="PRIVATE">Privada · somente eu</option>
                  <option value="SHARED">
                    Compartilhada · somente colaboradores
                  </option>
                  <option value="PUBLIC">Pelo link · somente visualizar</option>
                  <option value="PUBLIC_EDIT">
                    Pelo link · pode editar após login
                  </option>
                </select>
              </label>
              {(mode === "PUBLIC" || mode === "PUBLIC_EDIT") && (
                <p className="field-help">
                  O link permite leitura dos dados do roteiro, inclusive
                  informações que a interface oculta. Revise reservas e dados
                  pessoais antes de liberar. Em “pode editar”, qualquer conta
                  autenticada poderá alterar e excluir programas.
                </p>
              )}
              <button
                className="primary"
                disabled={busy || mode === tripAccess(trip)}
                onClick={() =>
                  act(() => setTripAccess(trip.id, mode), "Acesso atualizado.")
                }
              >
                Salvar acesso
              </button>
              <section>
                <h3>Colaboradores</h3>
                <p className="field-help">
                  Para convidar, libere “Pelo link · pode editar após login”. A
                  pessoa entra com Google e escolhe “Participar da viagem” aqui.
                  Depois, você pode restringir para “Somente colaboradores”.
                  Convites por e-mail ficam para uma próxima etapa.
                </p>
                {members
                  .filter((m) => m.role === "editor")
                  .map((m) => (
                    <div className="member-row" key={m.uid}>
                      <span>
                        {m.displayName || m.email}
                        <small>{m.displayName ? m.email : ""}</small>
                      </span>
                      <button
                        className="ghost"
                        disabled={busy}
                        onClick={() => setRemoving(m)}
                      >
                        Remover
                      </button>
                    </div>
                  ))}
                {members.length === 0 && (
                  <p className="muted">Nenhum colaborador ainda.</p>
                )}
                {removing && (
                  <div className="notice">
                    <p>
                      Remover {removing.displayName || removing.email}? Se o
                      link permitir edição, essa pessoa poderá voltar. Use
                      “Somente colaboradores” para restringir o acesso.
                    </p>
                    <button
                      className="secondary"
                      disabled={busy}
                      onClick={() => setRemoving(null)}
                    >
                      Cancelar
                    </button>
                    <button
                      className="danger"
                      disabled={busy}
                      onClick={() =>
                        act(async () => {
                          await removeMember(trip.id, removing.uid);
                          setRemoving(null);
                        }, "Colaborador removido.")
                      }
                    >
                      Remover colaborador
                    </button>
                  </div>
                )}
              </section>
            </>
          )
        )}
        {!demoMode &&
          !owner &&
          !legacy &&
          !editor &&
          tripAccess(trip) === "PUBLIC_EDIT" && (
            <button
              className="primary"
              disabled={busy}
              onClick={() =>
                act(async () => {
                  if (!user) await login();
                  await joinTrip(trip.id);
                }, "Você está participando da viagem.")
              }
            >
              Participar da viagem
            </button>
          )}
        <label>
          Link da viagem
          <input readOnly value={url} onFocus={(e) => e.target.select()} />
        </label>
        <button
          className="secondary"
          disabled={busy}
          onClick={() =>
            act(() => navigator.clipboard.writeText(url), "Link copiado.")
          }
        >
          <Copy size={17} />
          Copiar link
        </button>
        {typeof navigator.share === "function" && (
          <button
            className="secondary"
            disabled={busy}
            onClick={() =>
              act(async () => {
                try {
                  await navigator.share({ title: trip.title, url });
                } catch (e) {
                  if (!(e instanceof Error && e.name === "AbortError")) throw e;
                }
              }, "")
            }
          >
            <Share2 size={17} />
            Compartilhar…
          </button>
        )}
        {message && (
          <p role="status" className="feedback">
            {message}
          </p>
        )}
        {error && (
          <p role="alert" className="error">
            {error}
          </p>
        )}
      </div>
    </Modal>
  );
}
