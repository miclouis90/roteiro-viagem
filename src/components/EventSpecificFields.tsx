import {
  detailSchemas,
  detailTypeFor,
  type EventDetailsData,
} from "../data/eventDetails";
import { Disclosure } from "./ui/Disclosure";
export function EventSpecificFields({
  category,
  value,
  onChange,
}: {
  category: string;
  value?: EventDetailsData;
  onChange: (value?: EventDetailsData) => void;
}) {
  const type = detailTypeFor(category);
  if (!type) return null;
  const schema = detailSchemas[type];
  const current = value?.type === type ? value : undefined;
  return (
    <Disclosure
      title={schema.title}
      description="Adicionar detalhes opcionais"
      initialOpen={!!current}
    >
      <p className="wide muted">
        Preencha só o que ajuda na viagem. Campos pessoais ficam ocultos na
        interface pública; não são sigilosos no documento de uma viagem pública.
      </p>
      {schema.fields.map((field) => (
        <label
          key={`${type}-${field.key}`}
          className={field.input === "checkbox" ? "check wide" : undefined}
        >
          {field.input !== "checkbox" && (
            <>
              {field.label}
              {field.private && <small> · oculto na tela pública</small>}
            </>
          )}
          <input
            type={
              field.input === "checkbox" ? "checkbox" : field.input || "text"
            }
            maxLength={1000}
            pattern={field.input === "url" ? "https?://.*" : undefined}
            {...(field.input === "checkbox"
              ? { checked: current?.[field.key] === true }
              : { value: String(current?.[field.key] ?? "") })}
            onChange={(e) => {
              const next = {
                ...(current ?? { type }),
                [field.key]:
                  field.input === "checkbox"
                    ? e.target.checked
                    : e.target.value,
              } as EventDetailsData;
              if (e.target.value === "" && field.input !== "checkbox")
                delete next[field.key];
              onChange(Object.keys(next).length > 1 ? next : undefined);
            }}
          />
          {field.input === "checkbox" && field.label}
        </label>
      ))}
    </Disclosure>
  );
}
