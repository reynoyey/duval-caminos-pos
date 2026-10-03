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
    from: "from-[#121826]",
    to: "to-[#121826]",
    border: "border-white/10",
    hoverBorder: "hover:border-rose-500/40 hover:bg-[#161F30]",
    glow: "shadow-black/20",
    text: "text-rose-300",
    badge: "bg-rose-500/15 text-rose-300 border-rose-500/30",
    accentBg: "bg-rose-600 text-white",
  },
  espresso: {
    from: "from-[#121826]",
    to: "to-[#121826]",
    border: "border-white/10",
    hoverBorder: "hover:border-amber-500/40 hover:bg-[#161F30]",
    glow: "shadow-black/20",
    text: "text-amber-300",
    badge: "bg-amber-500/15 text-amber-300 border-amber-500/30",
    accentBg: "bg-amber-600 text-white",
  },
  filter: {
    from: "from-[#121826]",
    to: "to-[#121826]",
    border: "border-white/10",
    hoverBorder: "hover:border-violet-500/40 hover:bg-[#161F30]",
    glow: "shadow-black/20",
    text: "text-violet-300",
    badge: "bg-violet-500/15 text-violet-300 border-violet-500/30",
    accentBg: "bg-violet-600 text-white",
  },
  "manual-brew": {
    from: "from-[#121826]",
    to: "to-[#121826]",
    border: "border-white/10",
    hoverBorder: "hover:border-violet-500/40 hover:bg-[#161F30]",
    glow: "shadow-black/20",
    text: "text-violet-300",
    badge: "bg-violet-500/15 text-violet-300 border-violet-500/30",
    accentBg: "bg-violet-600 text-white",
  },
  "non-coffee": {
    from: "from-[#121826]",
    to: "to-[#121826]",
    border: "border-white/10",
    hoverBorder: "hover:border-cyan-500/40 hover:bg-[#161F30]",
    glow: "shadow-black/20",
    text: "text-cyan-300",
    badge: "bg-cyan-500/15 text-cyan-300 border-cyan-500/30",
    accentBg: "bg-cyan-600 text-white",
  },
  pastry: {
    from: "from-[#121826]",
    to: "to-[#121826]",
    border: "border-white/10",
    hoverBorder: "hover:border-emerald-500/40 hover:bg-[#161F30]",
    glow: "shadow-black/20",
    text: "text-emerald-300",
    badge: "bg-emerald-500/15 text-emerald-300 border-emerald-500/30",
    accentBg: "bg-emerald-600 text-white",
  },
};

export const DEFAULT_THEME = CATEGORY_THEME.signature;
