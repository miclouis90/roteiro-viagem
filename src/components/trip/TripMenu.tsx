import {
  MoreHorizontal,
  Share2,
  Pencil,
  Copy,
  Globe2,
  LockKeyhole,
  Trash2,
} from "lucide-react";
import type { Trip } from "../../types";
export function TripMenu({
  trip,
  onEdit,
  onShare,
  onDuplicate,
  onVisibility,
  onDelete,
}: {
  trip: Trip;
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
          const details = e.currentTarget.closest("details");
          if (details) details.open = false;
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
        <button onClick={onDuplicate}>
          <Copy size={17} />
          Duplicar
        </button>
        <button onClick={onVisibility}>
          {trip.isPublic ? <LockKeyhole size={17} /> : <Globe2 size={17} />}
          Tornar {trip.isPublic ? "privada" : "pública"}
        </button>
        <button className="danger-text" onClick={onDelete}>
          <Trash2 size={17} />
          Excluir viagem
        </button>
      </div>
    </details>
  );
}
