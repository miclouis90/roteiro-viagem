import type { ButtonHTMLAttributes, HTMLAttributes, ReactNode } from "react";
import { Compass, CalendarDays, WalletCards, Luggage } from "lucide-react";
import { categoryOf } from "../../data/categories";
import type { TripTab } from "../../utils/tripView";
export type { TripTab } from "../../utils/tripView";
export function Button({
  variant = "primary",
  className = "",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary" | "ghost" | "danger";
}) {
  return <button className={`${variant} ${className}`} {...props} />;
}
export function IconButton({
  label,
  className = "",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { label: string }) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      className={`icon-button ${className}`}
      {...props}
    />
  );
}
export function Chip({
  variant = "neutral",
  status,
  children,
}: {
  variant?: "neutral" | "brand" | "status";
  status?: string;
  children: ReactNode;
}) {
  return (
    <span
      className={
        variant === "status"
          ? `status-chip status-${status}`
          : `ui-chip chip-${variant}`
      }
    >
      {children}
    </span>
  );
}
export function Card({
  variant = "default",
  className = "",
  ...props
}: HTMLAttributes<HTMLDivElement> & {
  variant?: "default" | "interactive" | "tonal";
}) {
  return <div className={`ui-card card-${variant} ${className}`} {...props} />;
}
export function SectionHeader({
  title,
  description,
  action,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="section-heading">
      <div>
        {title && <h2>{title}</h2>}
        {description && <p className="muted">{description}</p>}
      </div>
      {action}
    </div>
  );
}
export function CategoryChip({
  name,
  iconOnly = false,
}: {
  name: string;
  iconOnly?: boolean;
}) {
  const c = categoryOf(name);
  const Icon = c.icon;
  return (
    <span
      className={`${iconOnly ? "category-icon" : "category-chip"} tone-${c.tone}`}
    >
      <Icon size={iconOnly ? 22 : 14} aria-hidden="true" />
      {!iconOnly && name}
    </span>
  );
}
export function EmptyState({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children?: ReactNode;
}) {
  return (
    <div className="empty-state">
      <span className="empty-icon">
        <Compass size={28} />
      </span>
      <h3>{title}</h3>
      {description && <p>{description}</p>}
      {children}
    </div>
  );
}
const tabs = [
  { id: "geral", label: "Visão geral", icon: Compass },
  { id: "roteiro", label: "Roteiro", icon: CalendarDays },
  { id: "gastos", label: "Gastos", icon: WalletCards },
] as const;
// One accessible navigation: segmented control on desktop, bottom nav on mobile.
export function TripNavigation({
  value,
  onChange,
  onTrips,
}: {
  value: TripTab;
  onChange: (v: TripTab) => void;
  onTrips: () => void;
}) {
  return (
    <nav className="trip-tabs" aria-label="Seções da viagem">
      {tabs.map(({ id, label, icon: Icon }) => (
        <button
          key={id}
          aria-current={value === id ? "page" : undefined}
          className={value === id ? "active" : ""}
          onClick={() => onChange(id)}
        >
          <Icon size={20} />
          <span>{label}</span>
        </button>
      ))}
      <button onClick={onTrips}>
        <Luggage size={20} aria-hidden="true" />
        <span>Viagens</span>
      </button>
    </nav>
  );
}
