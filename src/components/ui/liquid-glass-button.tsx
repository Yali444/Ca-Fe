"use client"

import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const liquidbuttonVariants = cva(
  "inline-flex items-center transition-colors justify-center cursor-pointer gap-2 whitespace-nowrap rounded-xl text-sm font-medium transition-[color,box-shadow] disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg:not([class*='size-'])]:size-4 shrink-0 [&_svg]:shrink-0 outline-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive",
  {
    variants: {
      variant: {
        default: "bg-transparent duration-200 transition-colors text-primary",
        destructive:
          "bg-destructive text-white hover:bg-destructive/90 focus-visible:ring-destructive/20 dark:focus-visible:ring-destructive/40",
        outline:
          "border border-input bg-background hover:bg-accent hover:text-accent-foreground",
        secondary:
          "bg-secondary text-secondary-foreground hover:bg-secondary/80",
        ghost: "hover:bg-accent hover:text-accent-foreground",
        link: "text-primary underline-offset-4 hover:underline",
      },
      size: {
        default: "h-9 px-4 py-2 has-[>svg]:px-3",
        sm: "h-8 rounded-xl text-xs gap-1.5 px-4 has-[>svg]:px-4",
        lg: "h-10 rounded-xl px-6 has-[>svg]:px-4",
        xl: "h-12 rounded-xl px-8 has-[>svg]:px-6",
        xxl: "h-14 rounded-xl px-10 has-[>svg]:px-8",
        icon: "size-9",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "xxl",
    },
  }
)

/**
 * Used inside every shop card, so its per-instance cost matters a lot.
 *
 * This previously layered a `backdrop-filter: url("#container-glass")` element
 * behind the button and rendered the referenced SVG filter — a
 * feTurbulence → blur → feDisplacementMap(scale 70) → blur chain — *inside*
 * each button. That meant one copy of the same filter id per button (29 were
 * live on a single mobile screen; duplicate ids are invalid, so only the first
 * could ever apply), and no browser implements `url()` in `backdrop-filter`
 * anyway, so the whole arrangement cost layout and memory while painting
 * nothing.
 *
 * It then went on to fake a glass look with a 9-part inset box-shadow stack on
 * a separate absolutely-positioned overlay div (needed only so that stack's
 * own border-radius could be kept in sync with the button's). The Apple-lens
 * pass replaced that with a plain hairline ring + soft shadow applied directly
 * to the button, so the sync problem — and the overlay div, and the
 * className border-radius sniffing that existed only to feed it — went away
 * with it. `cn` already resolves a caller's own `rounded-full` against the
 * `rounded-xl` default correctly via tailwind-merge.
 */
function LiquidButton({
  className,
  variant,
  size,
  asChild = false,
  children,
  ...props
}: React.ComponentProps<"button"> &
  VariantProps<typeof liquidbuttonVariants> & {
    asChild?: boolean
  }) {
  const Comp = asChild ? Slot : "button"

  return (
    <Comp
      data-slot="button"
      className={cn(
        liquidbuttonVariants({ variant, size, className }),
        "ring-1 ring-black/5 dark:ring-white/10 shadow-sm"
      )}
      {...props}
    >
      {children}
    </Comp>
  )
}

export { liquidbuttonVariants, LiquidButton }

