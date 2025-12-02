import { twMerge } from "tailwind-merge";

type TagPillProps = {
  label: string;
  variant?: "default" | "accent";
  className?: string;
};

export function TagPill({ label, variant = "default", className }: TagPillProps) {
  return (
    <span
      className={twMerge(
        "inline-flex items-center rounded-full border px-3 py-1 text-xs font-semibold tracking-wider",
        variant === "accent"
          ? "border-transparent bg-coffee-accent/10 text-coffee-accent"
          : "border-transparent bg-coffee-tag text-coffee-ink/80",
        className,
      )}
    >
      {label}
    </span>
  );
}
