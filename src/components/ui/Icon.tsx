import {
  ArrowLeft,
  ArrowUp,
  Calendar,
  ChevronLeft,
  ChevronRight,
  Clock,
  Coffee,
  Database,
  Globe,
  Heart,
  Instagram,
  LayoutGrid,
  Leaf,
  List,
  Locate,
  Map,
  MapPin,
  Menu,
  Moon,
  Navigation,
  Package,
  Plus,
  RefreshCw,
  Search,
  Share2,
  SlidersHorizontal,
  Sun,
  Trash2,
  TrendingUp,
  TriangleAlert,
  User,
  Users,
  Wifi,
  WifiOff,
  X,
  type LucideProps,
} from "lucide-react";

// Explicit registry rather than lucide's `icons` barrel. The barrel object
// references every icon in the library, so importing it defeats tree-shaking
// and ships all ~1500 icons (~467KB) to load 34 of them. Listing the icons we
// actually use lets the bundler drop the rest.
//
// Adding an icon: import it above and add it here. TypeScript enforces the
// rest — `IconName` is derived from this map, so a `name` that isn't
// registered fails the build rather than rendering nothing at runtime.
const ICONS = {
  ArrowLeft,
  ArrowUp,
  Calendar,
  ChevronLeft,
  ChevronRight,
  Clock,
  Coffee,
  Database,
  Globe,
  Heart,
  Instagram,
  LayoutGrid,
  Leaf,
  List,
  Locate,
  Map,
  MapPin,
  Menu,
  Moon,
  Navigation,
  Package,
  Plus,
  RefreshCw,
  Search,
  Share2,
  SlidersHorizontal,
  Sun,
  Trash2,
  TrendingUp,
  TriangleAlert,
  User,
  Users,
  Wifi,
  WifiOff,
  X,
} as const;

export type IconName = keyof typeof ICONS;

export function Icon({ name, size = 20, strokeWidth = 1.75, ...props }: { name: IconName } & LucideProps) {
  const Cmp = ICONS[name];
  return <Cmp size={size} strokeWidth={strokeWidth} {...props} />;
}
