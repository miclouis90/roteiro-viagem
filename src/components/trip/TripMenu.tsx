import { useEffect, useId, useRef } from "react";
import {
  MoreHorizontal,
  Share2,
  Pencil,
  Copy,
  LockKeyhole,
  Trash2,
  LogOut,
} from "lucide-react";
export function TripMenu({
  owner,
  canLeave,
  onLeave,
  onEdit,
  onShare,
  onDuplicate,
  onVisibility,
  onDelete,
}: {
  owner: boolean;
  canLeave: boolean;
  onLeave: () => void;
  onEdit: () => void;
  onShare: () => void;
  onDuplicate: () => void;
  onVisibility: () => void;
  onDelete: () => void;
}) {
  const ref = useRef<HTMLDetailsElement>(null);
  const panelId = useId();
  useEffect(() => {
    function closeOutside(event: Event) {
      const menu = ref.current;
      if (menu?.open && event.target instanceof Node && !menu.contains(event.target)) {
        menu.open = false;
      }
    }
    document.addEventListener("pointerdown", closeOutside, true);
    document.addEventListener("click", closeOutside, true);
    return () => {
      document.removeEventListener("pointerdown", closeOutside, true);
      document.removeEventListener("click", closeOutside, true);
    };
  }, []);
  function choose(action: () => void) {
    if (ref.current) {
      ref.current.open = false;
      ref.current.querySelector("summary")?.focus({ preventScroll: true });
    }
    action();
  }
  return (
    <details
      ref={ref}
      className="context-menu trip-options"
      onPointerDown={(e) => e.stopPropagation()}
      onClick={(e) => e.stopPropagation()}
      onBlur={(e) => {
        // Mobile browsers can blur the summary with no relatedTarget before
        // clicking an option. Outside pointer/click events handle that case.
        if (e.relatedTarget && !e.currentTarget.contains(e.relatedTarget))
          e.currentTarget.open = false;
      }}
      onKeyDown={(e) => {
        if (e.key === "Escape") {
          e.preventDefault();
          e.stopPropagation();
          e.currentTarget.open = false;
          e.currentTarget.querySelector("summary")?.focus({ preventScroll: true });
        }
      }}
    >
      <summary aria-label="Mais opções da viagem" aria-controls={panelId}>
        <MoreHorizontal size={22} aria-hidden="true" />
      </summary>
      <div className="menu-popover" id={panelId}>
        <div className="trip-options-group" role="group" aria-label="Ações da viagem">
          <button type="button" onClick={() => choose(onEdit)}>
            <Pencil size={17} aria-hidden="true" />
            Editar viagem
          </button>
          <button type="button" onClick={() => choose(onShare)}>
            <Share2 size={17} aria-hidden="true" />
            Compartilhar
          </button>
          {owner && <>
            <button type="button" onClick={() => choose(onVisibility)}>
              <LockKeyhole size={17} aria-hidden="true" />
              Gerenciar acesso
            </button>
            <button type="button" onClick={() => choose(onDuplicate)}>
              <Copy size={17} aria-hidden="true" />
              Duplicar viagem
            </button>
          </>}
        </div>
        {owner && (
          <div className="trip-options-group" role="group" aria-label="Ações destrutivas">
            <button type="button" className="danger-text" onClick={() => choose(onDelete)}>
              <Trash2 size={17} aria-hidden="true" />
              Excluir viagem
            </button>
          </div>
        )}
        {!owner && canLeave && (
          <div className="trip-options-group" role="group" aria-label="Participação na viagem">
            <button type="button" onClick={() => choose(onLeave)}>
              <LogOut size={17} aria-hidden="true" />
              Sair da viagem
            </button>
          </div>
        )}
      </div>
    </details>
  );
}
