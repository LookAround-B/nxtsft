import {
  Waves,
  Dumbbell,
  Car,
  Zap,
  ShieldCheck,
  Building,
  ArrowUpDown,
  Trees,
  Baby,
  Home,
  Sun,
  Cctv,
  Footprints,
  Users,
  ParkingCircle,
  Wifi,
  Flame,
  Wind,
  Droplets,
  Dog,
  Sparkles,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

// Canonical amenity catalog shared by the listing form (checkboxes) and the
// property detail page (display). Each entry pairs a display name with an icon
// so both surfaces render consistently. Add new amenities here only.
export const AMENITIES: { name: string; Icon: LucideIcon }[] = [
  { name: "Swimming Pool", Icon: Waves },
  { name: "Gym / Fitness Centre", Icon: Dumbbell },
  { name: "Covered Parking", Icon: Car },
  { name: "Power Backup", Icon: Zap },
  { name: "24/7 Security", Icon: ShieldCheck },
  { name: "Clubhouse", Icon: Building },
  { name: "Elevator / Lift", Icon: ArrowUpDown },
  { name: "Landscaped Garden", Icon: Trees },
  { name: "Children's Play Area", Icon: Baby },
  { name: "Smart Home", Icon: Home },
  { name: "Solar Panels", Icon: Sun },
  { name: "CCTV Surveillance", Icon: Cctv },
  { name: "Jogging Track", Icon: Footprints },
  { name: "Community Hall", Icon: Users },
  { name: "Visitor Parking", Icon: ParkingCircle },
  { name: "Wi-Fi", Icon: Wifi },
  { name: "Gas Pipeline", Icon: Flame },
  { name: "Air Conditioning", Icon: Wind },
  { name: "Rainwater Harvesting", Icon: Droplets },
  { name: "Pet Friendly", Icon: Dog },
];

const ICON_BY_NAME = new Map(AMENITIES.map((a) => [a.name, a.Icon]));

/** Icon for an amenity name; falls back to a generic sparkle for unknowns
 * (e.g. legacy/seeded amenities not in the canonical catalog). */
export function amenityIcon(name: string): LucideIcon {
  return ICON_BY_NAME.get(name) ?? Sparkles;
}
