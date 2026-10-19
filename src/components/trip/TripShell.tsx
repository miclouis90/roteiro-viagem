import type { CSSProperties, ReactNode } from "react";
import { Link } from "react-router-dom";
import { ChevronLeft } from "lucide-react";
import type { Trip } from "../../types";
import { themeStyle } from "../../data/themes";
import { TripNavigation, type TripTab } from "../ui/Primitives";

export function TripShell({ header, trip, tab, onTabChange, className = "", children }: {
  header?: ReactNode;
  trip: Trip;
  tab: TripTab;
  onTabChange: (tab: TripTab) => void;
  className?: string;
  children: ReactNode;
}) {
  return <div className="trip-shell theme-trip" style={themeStyle(trip.theme) as CSSProperties}>
    <div className="trip-shell-chrome">
      {header}
      <div className="trip-shell-controls">
        <div className="trip-context">
          <Link to="/" className="trip-home-link" onClick={() => window.scrollTo({ top: 0, behavior: "instant" })}>
            <ChevronLeft size={18} aria-hidden="true" />Viagens
          </Link>
          <span className="trip-context-name" title={trip.title}>{trip.title}</span>
        </div>
        <TripNavigation value={tab} onChange={onTabChange} />
      </div>
    </div>
    <main className={`trip-page trip-shell-page theme-trip ${className}`}>{children}</main>
  </div>;
}
