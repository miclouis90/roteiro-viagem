import { useState } from "react";
import { Search, SlidersHorizontal, X } from "lucide-react";
import { categories, categoryGroups } from "../../data/categories";
import { eventLabels, priorityLabels } from "../../utils/labels";
import { formatDate } from "../../utils/dates";
export interface Filters {
  search: string;
  date: string;
  category: string;
  status: string;
  priority: string;
  payment: string;
}
export const emptyFilters: Filters = {
  search: "",
  date: "",
  category: "",
  status: "",
  priority: "",
  payment: "",
};
export function EventFilters({
  value,
  onChange,
  days,
  showDate = false,
}: {
  value: Filters;
  onChange: (v: Filters) => void;
  days: string[];
  showDate?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const count = Object.entries(value).filter(
    ([k, v]) => k !== "search" && v,
  ).length;
  function set(key: keyof Filters, v: string) {
    onChange({ ...value, [key]: v });
  }
  return (
    <div className="filter-area">
      <div className="toolbar">
        <label className="search">
          <Search size={18} />
          <input
            aria-label="Buscar programas"
            placeholder="Buscar no roteiro"
            value={value.search}
            onChange={(e) => set("search", e.target.value)}
          />
        </label>
        <button
          className={`ghost ${count ? "selected" : ""}`}
          onClick={() => setOpen(!open)}
          aria-expanded={open}
        >
          <SlidersHorizontal size={18} />
          Filtros{count > 0 && <span className="filter-count">{count}</span>}
        </button>
      </div>
      {open && (
        <div className="filter-panel">
          {showDate && (
            <label>
              Data
              <select
                value={value.date}
                onChange={(e) => set("date", e.target.value)}
              >
                <option value="">Todos os dias</option>
                {days.map((d) => (
                  <option key={d} value={d}>
                    {formatDate(d)}
                  </option>
                ))}
              </select>
            </label>
          )}
          <label>
            Categoria
            <select
              value={value.category}
              onChange={(e) => set("category", e.target.value)}
            >
              <option value="">Todas</option>
              {categoryGroups.map((group) => (
                <optgroup key={group.id} label={group.label}>
                  {categories
                    .filter((c) => c.group === group.id)
                    .map((c) => (
                      <option key={c.name}>{c.name}</option>
                    ))}
                </optgroup>
              ))}
            </select>
          </label>
          <label>
            Status
            <select
              value={value.status}
              onChange={(e) => set("status", e.target.value)}
            >
              <option value="">Todos</option>
              {Object.entries(eventLabels).map(([v, label]) => (
                <option key={v} value={v}>
                  {label}
                </option>
              ))}
            </select>
          </label>
          <label>
            Prioridade
            <select
              value={value.priority}
              onChange={(e) => set("priority", e.target.value)}
            >
              <option value="">Todas</option>
              {Object.entries(priorityLabels).map(([v, label]) => (
                <option key={v} value={v}>
                  {label}
                </option>
              ))}
            </select>
          </label>
          <label>
            Preço
            <select
              value={value.payment}
              onChange={(e) => set("payment", e.target.value)}
            >
              <option value="">Todos</option>
              <option value="free">Grátis</option>
              <option value="paid">Pagos</option>
            </select>
          </label>
        </div>
      )}
      {Object.values(value).some(Boolean) && (
        <button
          className="ghost clear-filters"
          onClick={() => onChange({ ...emptyFilters })}
        >
          <X size={14} />
          Limpar filtros
        </button>
      )}
    </div>
  );
}
