"use client";

import { type ReactNode, forwardRef } from "react";
import { motion, type HTMLMotionProps } from "framer-motion";
import { cn } from "@/lib/utils";

interface GlassCardProps extends HTMLMotionProps<"div"> {
  children: ReactNode;
  variant?: "default" | "subtle" | "navy" | "red";
  className?: string;
}

const variantStyles = {
  default: "glass",
  subtle: "glass-subtle",
  navy: "glass-navy",
  red: "glass-red",
};

const GlassCard = forwardRef<HTMLDivElement, GlassCardProps>(
  ({ children, variant = "default", className, ...props }, ref) => {
    return (
      <motion.div
        ref={ref}
        className={cn(variantStyles[variant], "rounded-[28px]", className)}
        {...props}
      >
        {children}
      </motion.div>
    );
  }
);
GlassCard.displayName = "GlassCard";

export { GlassCard, type GlassCardProps };