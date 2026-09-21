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
  Plane,
  PlaneLanding,
  CarFront,
  CarTaxiFront,
  Car,
  BusFront,
  TrainFront,
  Train,
  type LucideIcon,
} from "lucide-react";
export const categoryGroups = [
  { id: "food", label: "Comer", tone: "food", icon: Utensils },
  { id: "night", label: "Beber", tone: "night", icon: Wine },
  { id: "culture", label: "Cultura", tone: "culture", icon: Landmark },
  { id: "outdoor", label: "Passear", tone: "outdoor", icon: Trees },
  { id: "transport", label: "Transporte", tone: "transport", icon: Plane },
  { id: "other", label: "Outros", tone: "other", icon: Compass },
] as const;
export type CategoryGroup = (typeof categoryGroups)[number]["id"];
export interface Category {
  name: string;
  icon: LucideIcon;
  group: CategoryGroup;
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
  { name: "Experiência", icon: Sparkles, group: "outdoor", tone: "experience" },
  { name: "Voo", icon: Plane, group: "transport", tone: "flight" },
  { name: "Transfer", icon: CarFront, group: "transport", tone: "transport" },
  { name: "Carro", icon: Car, group: "transport", tone: "car" },
  {
    name: "Táxi / app",
    icon: CarTaxiFront,
    group: "transport",
    tone: "transport",
  },
  { name: "Ônibus", icon: BusFront, group: "transport", tone: "rail" },
  { name: "Metrô", icon: TrainFront, group: "transport", tone: "rail" },
  { name: "Trem", icon: Train, group: "transport", tone: "rail" },
  {
    name: "Aeroporto",
    icon: PlaneLanding,
    group: "transport",
    tone: "airport",
  },
  { name: "Outro", icon: MapPin, group: "other", tone: "other" },
];
export const categoryOf = (name: string) =>
  categories.find((c) => c.name === name) ?? categories[categories.length - 1];
