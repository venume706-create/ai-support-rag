import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

/** Бейджи — чернильные штампы (.stamp в globals.css). */
const badgeVariants = cva("stamp w-fit shrink-0 whitespace-nowrap [&>svg]:size-3", {
  variants: {
    variant: {
      default: "stamp-blue",
      secondary: "stamp-muted",
      destructive: "stamp-red",
      outline: "stamp-muted",
      success: "stamp-green",
      warning: "stamp-amber",
      danger: "stamp-red",
      info: "stamp-blue",
    },
  },
  defaultVariants: { variant: "default" },
});

function Badge({ className, variant, ...props }: React.ComponentProps<"span"> & VariantProps<typeof badgeVariants>) {
  return <span data-slot="badge" className={cn(badgeVariants({ variant }), className)} {...props} />;
}

export { Badge, badgeVariants };
