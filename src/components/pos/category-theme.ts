import { Coffee, Croissant, FlaskConical, Leaf, Sparkles, LayoutGrid, Utensils, type LucideIcon } from "lucide-react";

export const CATEGORY_ICONS: Record<string, LucideIcon> = {
  Sparkles,
  Coffee,
  FlaskConical,
  Leaf,
  Croissant,
  LayoutGrid,
  Utensils,
};

/** Miami Vibes Per-category visual palette (product card gradients & glowing borders) */
export const CATEGORY_THEME: Record<
  string,
  {
    from: string;
    to: string;
    border: string;
    hoverBorder: string;
    glow: string;
    text: string;
    badge: string;
    accentBg: string;
  }
> = {
  signature: {
    from: "from-pink-600/35 via-fuchsia-900/25",
    to: "to-[#110D24]/90",
    border: "border-pink-500/35",
    hoverBorder: "hover:border-pink-400 hover:shadow-pink-500/30",
    glow: "shadow-pink-500/20",
    text: "text-pink-300",
    badge: "bg-pink-500/20 text-pink-300 border-pink-500/40 shadow-sm shadow-pink-500/20",
    accentBg: "bg-pink-500 text-white",
  },
  espresso: {
    from: "from-orange-600/35 via-amber-900/25",
    to: "to-[#110D24]/90",
    border: "border-orange-500/35",
    hoverBorder: "hover:border-orange-400 hover:shadow-orange-500/30",
    glow: "shadow-orange-500/20",
    text: "text-orange-300",
    badge: "bg-orange-500/20 text-orange-300 border-orange-500/40 shadow-sm shadow-orange-500/20",
    accentBg: "bg-orange-500 text-white",
  },
  filter: {
    from: "from-violet-600/35 via-purple-900/25",
    to: "to-[#110D24]/90",
    border: "border-violet-500/35",
    hoverBorder: "hover:border-violet-400 hover:shadow-violet-500/30",
    glow: "shadow-violet-500/20",
    text: "text-violet-300",
    badge: "bg-violet-500/20 text-violet-300 border-violet-500/40 shadow-sm shadow-violet-500/20",
    accentBg: "bg-violet-500 text-white",
  },
  "manual-brew": {
    from: "from-violet-600/35 via-purple-900/25",
    to: "to-[#110D24]/90",
    border: "border-violet-500/35",
    hoverBorder: "hover:border-violet-400 hover:shadow-violet-500/30",
    glow: "shadow-violet-500/20",
    text: "text-violet-300",
    badge: "bg-violet-500/20 text-violet-300 border-violet-500/40 shadow-sm shadow-violet-500/20",
    accentBg: "bg-violet-500 text-white",
  },
  "non-coffee": {
    from: "from-cyan-600/35 via-teal-900/25",
    to: "to-[#110D24]/90",
    border: "border-cyan-500/35",
    hoverBorder: "hover:border-cyan-400 hover:shadow-cyan-500/30",
    glow: "shadow-cyan-500/20",
    text: "text-cyan-300",
    badge: "bg-cyan-500/20 text-cyan-300 border-cyan-500/40 shadow-sm shadow-cyan-500/20",
    accentBg: "bg-cyan-400 text-black",
  },
  pastry: {
    from: "from-yellow-600/35 via-amber-900/25",
    to: "to-[#110D24]/90",
    border: "border-yellow-500/35",
    hoverBorder: "hover:border-yellow-400 hover:shadow-yellow-500/30",
    glow: "shadow-yellow-500/20",
    text: "text-yellow-200",
    badge: "bg-yellow-500/20 text-yellow-200 border-yellow-500/40 shadow-sm shadow-yellow-500/20",
    accentBg: "bg-yellow-400 text-black",
  },
};

export const DEFAULT_THEME = CATEGORY_THEME.signature;
