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
        default: "bg-transparent hover:scale-105 duration-300 transition text-primary",
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
 * Glass-styled button. Used inside every shop card, so its per-instance cost
 * matters a lot.
 *
 * This previously layered a `backdrop-filter: url("#container-glass")` element
 * behind the button and rendered the referenced SVG filter — a
 * feTurbulence → blur → feDisplacementMap(scale 70) → blur chain — *inside*
 * each button. That meant one copy of the same filter id per button (29 were
 * live on a single mobile screen; duplicate ids are invalid, so only the first
 * could ever apply), and no browser implements `url()` in `backdrop-filter`
 * anyway, so the whole arrangement cost layout and memory while painting
 * nothing. The visible glass effect comes from the inset shadow stack below,
 * which is unchanged.
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
  
  // Determine border radius from className - check both the passed className and merged result
  const isRoundedFull = className?.includes("rounded-full") || className?.includes("!rounded-full") || false
  const borderRadius = isRoundedFull ? "rounded-full" : "rounded-xl"
  
  // Merge classes to get final className for checking
  const mergedClassName = cn(liquidbuttonVariants({ variant, size, className }))
  const finalBorderRadius = mergedClassName.includes("rounded-full") || mergedClassName.includes("!rounded-full") ? "rounded-full" : borderRadius

  return (
    <>
      <Comp
        data-slot="button"
        className={cn(
          "relative overflow-hidden",
          liquidbuttonVariants({ variant, size, className }),
          finalBorderRadius
        )}
        {...props}
      >
        {/* The inset shadow stack is what actually produces the glass look.
            It's static, so it deliberately carries no will-change/translateZ:
            promoting every button on the page to its own compositing layer
            cost far more than it saved (78 such layers were live on one
            mobile screen). */}
        <div className={cn(
          "absolute top-0 left-0 z-0 h-full w-full overflow-hidden opacity-95 pointer-events-none",
          finalBorderRadius,
          "shadow-[0_0_6px_rgba(0,0,0,0.03),0_2px_6px_rgba(0,0,0,0.08),inset_3px_3px_0.5px_-3px_rgba(0,0,0,0.9),inset_-3px_-3px_0.5px_-3px_rgba(0,0,0,0.85),inset_1px_1px_1px_-0.5px_rgba(0,0,0,0.6),inset_-1px_-1px_1px_-0.5px_rgba(0,0,0,0.6),inset_0_0_6px_6px_rgba(0,0,0,0.12),inset_0_0_2px_2px_rgba(0,0,0,0.06),0_0_12px_rgba(255,255,255,0.15)]",
          "transition-shadow",
          "dark:shadow-[0_0_8px_rgba(0,0,0,0.03),0_2px_6px_rgba(0,0,0,0.08),inset_3px_3px_0.5px_-3.5px_rgba(255,255,255,0.09),inset_-3px_-3px_0.5px_-3.5px_rgba(255,255,255,0.85),inset_1px_1px_1px_-0.5px_rgba(255,255,255,0.6),inset_-1px_-1px_1px_-0.5px_rgba(255,255,255,0.6),inset_0_0_6px_6px_rgba(255,255,255,0.12),inset_0_0_2px_2px_rgba(255,255,255,0.06),0_0_12px_rgba(0,0,0,0.15)]"
        )} />

        <div className="pointer-events-none z-10 flex items-center justify-center w-full h-full">
          {children}
        </div>
      </Comp>
    </>
  )
}

export { liquidbuttonVariants, LiquidButton }

