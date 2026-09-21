export function localDate(value: string) {
  const [y, m, d] = value.split("-").map(Number);
  return new Date(y, m - 1, d, 12);
}
export function daysBetween(start: string, end: string) {
  return (
    Math.round(
      (Date.parse(end + "T12:00:00Z") - Date.parse(start + "T12:00:00Z")) /
        86400000,
    ) + 1
  );
}
export function datesBetween(start: string, end: string) {
  return Array.from(
    { length: Math.max(0, Math.min(366, daysBetween(start, end))) },
    (_, i) => {
      const d = localDate(start);
      d.setDate(d.getDate() + i);
      return dateKey(d);
    },
  );
}
export function dateKey(d = new Date()) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}
export function formatDate(
  d: string,
  options: Intl.DateTimeFormatOptions = { day: "numeric", month: "short" },
) {
  return localDate(d).toLocaleDateString("pt-BR", options);
}
