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
  return (
    <details
      className="context-menu"
      onBlur={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget))
          e.currentTarget.open = false;
      }}
      onKeyDown={(e) => {
        if (e.key === "Escape") {
          e.currentTarget.open = false;
          e.currentTarget.querySelector("summary")?.focus();
        }
      }}
    >
      <summary aria-label="Mais opções da viagem">
        <MoreHorizontal size={22} />
      </summary>
      <div
        className="menu-popover"
        onClick={(e) => {
          const d = e.currentTarget.closest("details");
          if (d) d.open = false;
        }}
      >
        <button onClick={onEdit}>
          <Pencil size={17} />
          Editar viagem
        </button>
        <button onClick={onShare}>
          <Share2 size={17} />
          Compartilhar
        </button>
        {owner && (
          <>
            <button onClick={onVisibility}>
              <LockKeyhole size={17} />
              Gerenciar acesso
            </button>
            <button onClick={onDuplicate}>
              <Copy size={17} />
              Duplicar viagem
            </button>
            <button className="danger-text" onClick={onDelete}>
              <Trash2 size={17} />
              Excluir viagem
            </button>
          </>
        )}
        {!owner && canLeave && (
          <button onClick={onLeave}>
            <LogOut size={17} />
            Sair da viagem
          </button>
        )}
      </div>
    </details>
  );
}
