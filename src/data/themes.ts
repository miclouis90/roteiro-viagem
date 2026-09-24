export const tripThemes = [
  { id: "green", label: "Verde", color: "#126B60", soft: "#DCF1E9" },
  { id: "blue", label: "Azul", color: "#526ED3", soft: "#EBEFFF" },
  { id: "lavender", label: "Lavanda", color: "#7456C7", soft: "#F0EBFF" },
  { id: "coral", label: "Coral", color: "#B34B30", soft: "#FFF0EA" },
  { id: "gold", label: "Dourado", color: "#8D641D", soft: "#FFF4DF" },
] as const;
export type TripTheme = { accent: (typeof tripThemes)[number]["id"] };
export const themeOf = (theme?: TripTheme) =>
  tripThemes.find((item) => item.id === theme?.accent) ?? tripThemes[0];
export const themeStyle = (theme?: TripTheme) => ({
  "--trip-accent": themeOf(theme).color,
  "--trip-soft": themeOf(theme).soft,
});
