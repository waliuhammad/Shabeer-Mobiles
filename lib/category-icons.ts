import {
  Zap,
  Shield,
  ShieldCheck,
  Headphones,
  Headset,
  Speaker,
  BatteryCharging,
  Cable,
  Package,
  LayoutGrid,
  type LucideIcon,
} from "lucide-react";

/**
 * Maps a category slug to its icon.
 *
 * This lives in the UI layer, NOT in data/categories.ts, because a React
 * component cannot be stored in a Firestore document. When categories move
 * to Firestore they will carry id/name/slug/description only - and this
 * map keeps working with no changes at all.
 */
const CATEGORY_ICONS: Record<string, LucideIcon> = {
  all: LayoutGrid,
  chargers: Zap,
  covers: Shield,
  protectors: ShieldCheck,
  handsfree: Headphones,
  airpods: Headset,
  "power-banks": BatteryCharging,
  headphones: Headphones,
  speakers: Speaker,
  accessories: Cable,
};

/**
 * Always returns an icon. A new category added from the admin panel gets
 * the generic Package icon rather than crashing the page - the UI must not
 * assume data it does not control.
 */
export function getCategoryIcon(slug: string): LucideIcon {
  return CATEGORY_ICONS[slug] ?? Package;
}
