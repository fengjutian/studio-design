import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import type { ButtonHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

const buttonVariants = cva("ui-button", {
  variants: {
    variant: {
      primary: "primary-button",
      secondary: "secondary-button",
      quiet: "quiet-button",
      icon: "icon-button",
      ghost: "ui-button-ghost",
    },
    size: {
      default: "",
      compact: "compact",
      icon: "ui-button-icon",
    },
  },
  defaultVariants: { variant: "secondary", size: "default" },
});

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement>, VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

export function Button({ asChild, className, variant, size, type = "button", ...props }: ButtonProps) {
  const Component = asChild ? Slot : "button";
  return <Component type={type} className={cn(buttonVariants({ variant, size }), className)} {...props} />;
}

export { buttonVariants };
