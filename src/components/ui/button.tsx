import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

/** Кнопки — физические клавиши: объём, блик, при нажатии «вдавливаются» (классы .key-* в globals.css). */
const buttonVariants = cva(
  "key inline-flex shrink-0 items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-bold outline-none focus-visible:ring-[3px] focus-visible:ring-ring/60 disabled:pointer-events-none disabled:opacity-55 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
  {
    variants: {
      variant: {
        default: "key-brass",
        destructive: "key-wax",
        outline: "key-paper",
        secondary: "key-paper",
        ghost: "text-current hover:bg-black/10 active:translate-y-px dark:hover:bg-white/10",
        link: "text-current underline underline-offset-4 decoration-brass",
      },
      size: {
        default: "min-h-11 px-4 py-2 has-[>svg]:px-3",
        sm: "min-h-11 gap-1.5 px-3 has-[>svg]:px-2.5",
        lg: "min-h-12 px-6 text-base has-[>svg]:px-4",
        icon: "size-11",
      },
    },
    defaultVariants: { variant: "default", size: "default" },
  },
);

function Button({
  className,
  variant,
  size,
  asChild = false,
  ...props
}: React.ComponentProps<"button"> & VariantProps<typeof buttonVariants> & { asChild?: boolean }) {
  const Comp = asChild ? Slot : "button";
  return <Comp data-slot="button" className={cn(buttonVariants({ variant, size, className }))} {...props} />;
}

export { Button, buttonVariants };
