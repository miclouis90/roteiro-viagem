import { useEffect, useId, useRef, type ReactNode } from "react";
import { X } from "lucide-react";
export function Modal({
  title,
  children,
  onClose,
  busy = false,
}: {
  title: string;
  children: ReactNode;
  onClose: () => void;
  busy?: boolean;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const id = useId();
  useEffect(() => {
    const d = ref.current;
    const focused = document.activeElement as HTMLElement | null;
    d?.showModal();
    const before = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      d?.close();
      document.body.style.overflow = before;
      if (focused?.isConnected) focused.focus();
    };
  }, []);
  return (
    <dialog
      ref={ref}
      aria-labelledby={id}
      onCancel={(e) => {
        e.preventDefault();
        if (!busy) onClose();
      }}
    >
      <div className="sheet-handle" aria-hidden="true" />
      <div className="modal-head">
        <h2 id={id}>{title}</h2>
        <button
          className="icon-button sheet-close"
          disabled={busy}
          onClick={onClose}
          aria-label="Fechar"
        >
          <X size={18} strokeWidth={1.6} />
        </button>
      </div>
      {children}
    </dialog>
  );
}
