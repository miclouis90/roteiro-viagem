export const tripThemes = [
  { id: "green", label: "Verde", color: "var(--color-brand)", soft: "var(--brand-100)" },
  { id: "blue", label: "Azul", color: "var(--color-culture-ink)", soft: "var(--color-culture-bg)" },
  { id: "lavender", label: "Lavanda", color: "var(--color-drink-ink)", soft: "var(--color-drink-bg)" },
  { id: "coral", label: "Coral", color: "var(--color-food-ink)", soft: "var(--color-food-bg)" },
  { id: "gold", label: "Dourado", color: "var(--color-warning-ink)", soft: "var(--color-warning-bg)" },
] as const;
export type TripTheme = { accent: (typeof tripThemes)[number]["id"] };
export const themeOf = (theme?: TripTheme) =>
  tripThemes.find((item) => item.id === theme?.accent) ?? tripThemes[0];
export const themeStyle = (theme?: TripTheme) => ({
  "--trip-accent": themeOf(theme).color,
  "--trip-soft": themeOf(theme).soft,
});
