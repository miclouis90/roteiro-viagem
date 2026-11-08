import { Music, Drama, Trophy, Landmark, Sparkles } from "lucide-react";
import type { PersonalEventCategory } from "../utils/personalEvents";
export const personalEventVisuals = {
  show: { label: "Show", icon: Music, tone: "drink" },
  theater: { label: "Teatro", icon: Drama, tone: "culture" },
  sport: { label: "Esporte", icon: Trophy, tone: "outdoor" },
  cultural: { label: "Cultural", icon: Landmark, tone: "culture" },
  other: { label: "Outro", icon: Sparkles, tone: "other" },
} satisfies Record<PersonalEventCategory, { label: string; icon: typeof Music; tone: string }>;
