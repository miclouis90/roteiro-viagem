import {
  detailSchemas,
  detailTypeFor,
  type EventDetailsData,
} from "../data/eventDetails";
import { Disclosure } from "./ui/Disclosure";
import type { ReactNode } from "react";
export function EventSpecificFields({
  category,
  value,
  onChange,
  flightArrivalTime,
  onFlightArrivalChange,
  leadingFields,
  privateReservationAllowed = true,
}: {
  category: string;
  value?: EventDetailsData;
  onChange: (value?: EventDetailsData) => void;
  flightArrivalTime?: string;
  onFlightArrivalChange?: (value: string) => void;
  leadingFields?: ReactNode;
  privateReservationAllowed?: boolean;
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
        {type === "lodging" ? privateReservationAllowed
          ? "Código, link e observações da reserva ficam protegidos e disponíveis apenas ao proprietário e aos colaboradores da viagem."
          : "Dados da reserva disponíveis apenas ao proprietário e aos colaboradores da viagem."
          : <>Preencha só o que ajuda na viagem. Campos pessoais ficam ocultos na
        interface pública; não são sigilosos no documento de uma viagem pública.
        </>}
      </p>
      {leadingFields}
      {schema.fields.filter(field => (category !== "Voo" || field.key !== "departureTime") &&
        (type !== "lodging" || (field.key !== "checkOutDate" && (privateReservationAllowed || !field.private)))).map((field) => (
        <label
          key={`${type}-${field.key}`}
          className={field.input === "checkbox" ? "check wide" : undefined}
        >
          {field.input !== "checkbox" && (
            <>
              {category === "Voo" && field.key === "boardingTime" ? "Horário de embarque" : field.label}
              {field.private && <small> · oculto na tela pública</small>}
            </>
          )}
          <input
            type={
              field.input === "checkbox" ? "checkbox" : field.input || "text"
            }
            maxLength={1000}
            min={field.input === "number" ? 1 : undefined}
            max={field.input === "number" ? 10000 : undefined}
            step={field.input === "number" ? 1 : undefined}
            pattern={field.input === "url" ? "https?://.*" : undefined}
            {...(field.input === "checkbox"
              ? { checked: current?.[field.key] === true }
              : { value: category === "Voo" && field.key === "arrivalTime" && flightArrivalTime !== undefined ? flightArrivalTime : String(current?.[field.key] ?? "") })}
            onChange={(e) => {
              if (category === "Voo" && field.key === "arrivalTime" && onFlightArrivalChange) {
                onFlightArrivalChange(e.target.value);
                return;
              }
              const next = {
                ...(current ?? { type }),
                [field.key]:
                  field.input === "checkbox"
                    ? e.target.checked
                    : field.input === "number" && e.target.value !== "" ? Number(e.target.value) : e.target.value,
              } as EventDetailsData;
              if (e.target.value === "" && field.input !== "checkbox")
                delete next[field.key];
              onChange(Object.keys(next).length > 1 ? next : undefined);
            }}
          />
          {category === "Voo" && field.key === "arrivalTime" && <small className="field-help">Horário local da chegada. Se for em outra data, informe a data nas Notas do voo.</small>}
          {field.input === "checkbox" && field.label}
        </label>
      ))}
    </Disclosure>
  );
}
