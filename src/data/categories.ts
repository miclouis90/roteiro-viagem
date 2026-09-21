import {
  Coffee,
  Utensils,
  Soup,
  Wine,
  Martini,
  Beer,
  Music2,
  Palette,
  Landmark,
  Image,
  Drama,
  Trees,
  Compass,
  ShoppingBag,
  Sparkles,
  MapPin,
  type LucideIcon,
} from "lucide-react";
export interface Category {
  name: string;
  icon: LucideIcon;
  group: string;
  tone: string;
}
export const categories: Category[] = [
  { name: "Café", icon: Coffee, group: "food", tone: "coffee" },
  { name: "Almoço", icon: Utensils, group: "food", tone: "food" },
  { name: "Jantar", icon: Utensils, group: "food", tone: "food" },
  { name: "Petiscos", icon: Soup, group: "food", tone: "food" },
  { name: "Bar", icon: Beer, group: "night", tone: "night" },
  { name: "Drinks", icon: Martini, group: "night", tone: "night" },
  { name: "Vinho", icon: Wine, group: "night", tone: "wine" },
  { name: "Balada", icon: Music2, group: "night", tone: "night" },
  { name: "Evento cultural", icon: Palette, group: "culture", tone: "show" },
  { name: "Museu", icon: Landmark, group: "culture", tone: "culture" },
  { name: "Exposição", icon: Image, group: "culture", tone: "culture" },
  { name: "Teatro", icon: Drama, group: "culture", tone: "culture" },
  { name: "Show", icon: Music2, group: "culture", tone: "show" },
  { name: "Parque", icon: Trees, group: "outdoor", tone: "outdoor" },
  {
    name: "Passeio turístico",
    icon: Compass,
    group: "outdoor",
    tone: "outdoor",
  },
  { name: "Compras", icon: ShoppingBag, group: "other", tone: "shopping" },
  { name: "Experiência", icon: Sparkles, group: "other", tone: "experience" },
  { name: "Outro", icon: MapPin, group: "other", tone: "other" },
];
export const categoryOf = (name: string) =>
  categories.find((c) => c.name === name) ?? categories[categories.length - 1];
