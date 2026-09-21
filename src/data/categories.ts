export const categories = [
  ["Café", "☕", "food"],
  ["Almoço", "🍽️", "food"],
  ["Jantar", "🍝", "food"],
  ["Petiscos", "🧀", "food"],
  ["Bar", "🍺", "night"],
  ["Drinks", "🍸", "night"],
  ["Vinho", "🍷", "night"],
  ["Balada", "🪩", "night"],
  ["Evento cultural", "🎨", "culture"],
  ["Museu", "🏛️", "culture"],
  ["Exposição", "🖼️", "culture"],
  ["Teatro", "🎭", "culture"],
  ["Show", "🎵", "culture"],
  ["Parque", "🌳", "outdoor"],
  ["Passeio turístico", "🧭", "outdoor"],
  ["Compras", "🛍️", "other"],
  ["Experiência", "✨", "other"],
  ["Outro", "📍", "other"],
].map(([name, icon, group]) => ({ name, icon, group }));
export const categoryOf = (name: string) =>
  categories.find((c) => c.name === name) ?? categories[categories.length - 1];
