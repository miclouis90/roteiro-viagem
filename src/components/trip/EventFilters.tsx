import { useState } from "react";
import { Search, SlidersHorizontal, X } from "lucide-react";
import { categories, categoryGroups, categoryOf } from "../../data/categories";
import { eventLabels, priorityLabels } from "../../utils/labels";
import type { ItineraryType } from "../../utils/tripView";
import { Modal } from "../Modal";

export interface Filters {
  search: string;
  date: string;
  category: string;
  group?: string;
  status: string;
  priority: string;
  payment: string;
}
export const emptyFilters: Filters = {
  search: "", date: "", category: "", group: "", status: "", priority: "", payment: "",
};
const types = [
  { value: "all", label: "Todos" },
  { value: "programs", label: "Programas" },
  { value: "places", label: "Lugares salvos" },
] as const;

export function EventFilters({ value, onChange, type, onTypeChange }: {
  value: Filters;
  onChange: (value: Filters) => void;
  type: ItineraryType;
  onTypeChange: (value: ItineraryType) => void;
}) {
  const [open, setOpen] = useState(false);
  const count = Object.entries(value).filter(([key, entry]) => key !== "search" && Boolean(entry)).length + Number(type !== "all");
  function set(key: keyof Filters, entry: string) { onChange({ ...value, [key]: entry }); }
  function clear() { onChange({ ...emptyFilters }); onTypeChange("all"); }
  return <div className="filter-area unified-filters">
    <div className="toolbar">
      <label className="search">
        <Search size={17} aria-hidden="true" />
        <input aria-label="Buscar no roteiro (programas e lugares)" placeholder="Buscar no roteiro (programas e lugares)..." value={value.search} onChange={event => set("search", event.target.value)} />
      </label>
      <button className={"ghost " + (count ? "selected" : "")} onClick={() => setOpen(true)} aria-expanded={open} aria-haspopup="dialog">
        <SlidersHorizontal size={17} aria-hidden="true" />Filtros{count > 0 && <span className="filter-count">{count}</span>}
      </button>
    </div>
    {(count > 0 || value.search) && <button className="ghost clear-filters" onClick={clear}><X size={14} aria-hidden="true" />Limpar filtros</button>}
    {open && <Modal title="Filtros do roteiro" onClose={() => setOpen(false)}>
      <div className="itinerary-filter-sheet">
        <fieldset><legend>Tipo</legend><div className="filter-options">
          {types.map(item => <button key={item.value} className="filter-option" aria-pressed={type === item.value} onClick={() => onTypeChange(item.value)}>{item.label}</button>)}
        </div></fieldset>
        <fieldset><legend>Categoria</legend><div className="filter-options category-options">
          <button className="filter-option" aria-pressed={!value.group} onClick={() => onChange({ ...value, group: "", category: "" })}>Todas</button>
          {categoryGroups.map(({id, label, tone, icon: Icon}) => <button key={id} className={"filter-option tone-" + tone} aria-pressed={value.group === id} onClick={() => onChange({ ...value, group: id, category: value.category && categoryOf(value.category).group === id ? value.category : "" })}><Icon size={15} aria-hidden="true" />{label}</button>)}
        </div></fieldset>
        <label>Status<select value={value.status} onChange={event => set("status", event.target.value)}>
          <option value="">Todos</option>{Object.entries(eventLabels).map(([id,label]) => <option key={id} value={id}>{label}</option>)}
        </select></label>
        <button className="filter-option priority-option" aria-pressed={value.priority === "imperdível"} onClick={() => set("priority", value.priority === "imperdível" ? "" : "imperdível")}>Imperdível</button>
        <details className="expandable additional-filters"><summary>Mais filtros</summary>
          <label>Subcategoria<select value={value.category} onChange={event => set("category", event.target.value)}>
            <option value="">Todas</option>{categories.filter(category => !value.group || category.group === value.group).map(category => <option key={category.name}>{category.name}</option>)}
          </select></label>
          <label>Prioridade<select value={value.priority} onChange={event => set("priority", event.target.value)}>
            <option value="">Todas</option>{Object.entries(priorityLabels).map(([id,label]) => <option key={id} value={id}>{label}</option>)}
          </select></label>
          <label>Preço<select value={value.payment} onChange={event => set("payment", event.target.value)}>
            <option value="">Todos</option><option value="free">Grátis</option><option value="paid">Pagos</option>
          </select></label>
        </details>
        <div className="form-actions"><button className="ghost" onClick={clear}>Limpar filtros</button><button className="primary" onClick={() => setOpen(false)}>Ver resultados</button></div>
      </div>
    </Modal>}
  </div>;
}
