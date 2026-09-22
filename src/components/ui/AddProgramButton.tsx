import { useEffect, useState } from "react";
import { Plus } from "lucide-react";
export function AddProgramButton({ onClick }: { onClick: () => void }) {
  const [compact, setCompact] = useState(false);
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>;
    const onScroll = () => {
      setCompact(true);
      clearTimeout(timer);
      timer = setTimeout(() => setCompact(false), 900);
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      clearTimeout(timer);
      window.removeEventListener("scroll", onScroll);
    };
  }, []);
  return (
    <button
      className={`fab ${compact ? "fab-compact" : ""}`}
      aria-label="Adicionar programa"
      onClick={onClick}
    >
      <Plus size={22} />
      <span>Programa</span>
    </button>
  );
}
