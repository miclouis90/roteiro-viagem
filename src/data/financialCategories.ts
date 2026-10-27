import { ShieldCheck, Smartphone, Receipt, ShoppingBag } from "lucide-react";
import { categoryGroups, type CategoryGroup } from "./categories";
export const financialCategories = [
  ...categoryGroups,
  { id: "insurance", label: "Seguro", tone: "outdoor", icon: ShieldCheck },
  { id: "connectivity", label: "Chip / internet", tone: "transport", icon: Smartphone },
  { id: "fees", label: "Taxas", tone: "other", icon: Receipt },
  { id: "shopping", label: "Compras", tone: "food", icon: ShoppingBag },
] as const;
export type FinancialCategory = CategoryGroup | "insurance" | "connectivity" | "fees" | "shopping";
export type DailyCategory = Exclude<FinancialCategory, "lodging">;
export const dailyCategories = financialCategories.filter(category => category.id !== "lodging");
export const financialCategory = (id: FinancialCategory) => financialCategories.find(category => category.id === id)!;
