import type { ButtonHTMLAttributes, ReactNode } from "react";
import {
  Compass,
  CalendarDays,
  MapPin,
  Sun,
  ChartNoAxesColumnIncreasing,
} from "lucide-react";
import { categoryOf } from "../../data/categories";
export function Button({
  variant = "primary",
  className = "",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary" | "ghost" | "danger";
}) {
  return <button className={`${variant} ${className}`} {...props} />;
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
export type TripTab = "hoje" | "roteiro" | "lugares" | "resumo";
const tabs = [
  { id: "hoje", label: "Hoje", icon: Sun },
  { id: "roteiro", label: "Roteiro", icon: CalendarDays },
  { id: "lugares", label: "Lugares", icon: MapPin },
  { id: "resumo", label: "Resumo", icon: ChartNoAxesColumnIncreasing },
] as const;
export function TripNavigation({
  value,
  onChange,
}: {
  value: TripTab;
  onChange: (v: TripTab) => void;
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
    </nav>
  );
}
