import { useState } from "react";
import { categories, categoryGroups, categoryOf } from "../../data/categories";

export function CategoryPicker({
  value,
  onChange,
}: {
  value: string;
  onChange: (value: string) => void;
}) {
  const [group, setGroup] = useState(categoryOf(value).group);
  const choices = categories.filter((category) => category.group === group);
  return (
    <fieldset className="category-picker wide">
      <legend>Grupo e categoria</legend>
      <input type="hidden" name="category" value={value} />
      <div className="category-groups" aria-label="Grupos de categoria">
        {categoryGroups.map(({ id, label, tone, icon: Icon }) => (
          <button
            type="button"
            key={id}
            className={`filter-chip tone-${tone} ${id === group ? "active" : ""}`}
            aria-pressed={id === group}
            onClick={() => {
              setGroup(id);
              if (categoryOf(value).group !== id)
                onChange(
                  categories.find((category) => category.group === id)!.name,
                );
            }}
          >
            <Icon size={17} />
            {label}
          </button>
        ))}
      </div>
      <div className="category-options" aria-label="Tipos de programa">
        {choices.map((category) => (
          <button
            type="button"
            key={category.name}
            aria-pressed={value === category.name}
            className={`category-choice tone-${category.tone} ${value === category.name ? "active" : ""}`}
            onClick={() => onChange(category.name)}
          >
            <category.icon size={19} />
            {category.name}
          </button>
        ))}
      </div>
    </fieldset>
  );
}
