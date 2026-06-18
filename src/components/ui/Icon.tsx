import { icons, type LucideProps } from "lucide-react";

export function Icon({ name, size = 20, strokeWidth = 1.75, ...props }: { name: keyof typeof icons } & LucideProps) {
  const Cmp = icons[name];
  return <Cmp size={size} strokeWidth={strokeWidth} {...props} />;
}
