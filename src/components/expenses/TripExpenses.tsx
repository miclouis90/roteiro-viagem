import { useId, useState } from "react";
import type { ComponentProps } from "react";
import { LockKeyhole } from "lucide-react";
import { TripSummary } from "../TripSummary";
import { FinancialPlanning } from "./FinancialPlanning";
import type { TripEvent } from "../../types";
import { useAuth } from "../../hooks/useAuth";
import "./financial-planning.css";
export function TripExpenses({ canPlan, onProgram, ...summary }: ComponentProps<typeof TripSummary> & { canPlan: boolean; onProgram?: (event: TripEvent) => void }) {
  const [view, setView] = useState<"summary" | "planning">("summary");
  const id = useId();
  const { user } = useAuth();
  return <div className="trip-expenses">
    <div className="expense-view-toggle" role="group" aria-label="Visões de gastos">
      <button type="button" aria-pressed={view === "summary"} aria-controls={`${id}-summary`} onClick={() => setView("summary")}>Resumo</button>
      <button type="button" aria-pressed={view === "planning"} aria-controls={`${id}-planning`} onClick={() => setView("planning")}>Planejamento</button>
    </div>
    <div id={`${id}-summary`} hidden={view !== "summary"}><TripSummary {...summary} /></div>
    <div id={`${id}-planning`} hidden={view !== "planning"}>
      {view === "planning" && (canPlan ? <FinancialPlanning key={`${summary.trip.id}:${user?.uid || "demo"}`} trip={summary.trip} events={summary.events} onProgram={onProgram} /> :
        <p className="financial-private"><LockKeyhole size={19} aria-hidden="true" />O planejamento financeiro é privado. Disponível apenas ao proprietário e aos colaboradores autorizados.</p>)}
    </div>
  </div>;
}
