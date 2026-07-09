"use client";

import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

interface SegmentedControlProps {
  options: { value: string; label: string }[];
  value: string;
  onChange: (value: string) => void;
  className?: string;
}

const spring = { type: "spring" as const, stiffness: 400, damping: 30 };

export function SegmentedControl({
  options,
  value,
  onChange,
  className,
}: SegmentedControlProps) {
  return (
    <div className={cn("pill-container", className)} role="tablist">
      {options.map((opt) => (
        <button
          key={opt.value}
          role="tab"
          aria-selected={value === opt.value}
          data-active={value === opt.value}
          className="pill-option relative"
          onClick={() => onChange(opt.value)}
        >
          {value === opt.value && (
            <motion.div
              layoutId="pill-active"
              className="absolute inset-0 rounded-[9999px] bg-go-brand"
              transition={spring}
            />
          )}
          <span className="relative z-10">{opt.label}</span>
        </button>
      ))}
    </div>
  );
}