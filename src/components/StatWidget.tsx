"use client";

import { useRef, useState, useEffect } from "react";
import { useInView } from "framer-motion";
import { cn } from "@/lib/utils";

interface StatWidgetProps {
  value: number;
  suffix?: string;
  prefix?: string;
  label: string;
  subtitle?: string;
  className?: string;
}

function AnimatedNumber({ to, suffix = "", prefix = "" }: { to: number; suffix?: string; prefix?: string }) {
  const [count, setCount] = useState(0);
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true });

  useEffect(() => {
    if (!inView) return;
    const steps = 30;
    const increment = to / steps;
    const interval = 1500 / steps;
    let current = 0;
    const timer = setInterval(() => {
      current += increment;
      if (current >= to) {
        setCount(to);
        clearInterval(timer);
      } else {
        setCount(Math.round(current));
      }
    }, interval);
    return () => clearInterval(timer);
  }, [inView, to]);

  return (
    <span ref={ref} className="tabular-nums">
      {prefix}{count}{suffix}
    </span>
  );
}

export function StatWidget({
  value,
  suffix = "",
  prefix = "",
  label,
  subtitle,
  className,
}: StatWidgetProps) {
  return (
    <div className={cn("flex flex-col", className)}>
      <span className="text-3xl lg:text-4xl font-display text-go-brand font-bold leading-none">
        <AnimatedNumber to={value} suffix={suffix} prefix={prefix} />
      </span>
      <span className="text-sm font-medium text-go-off/70 mt-1">{label}</span>
      {subtitle && (
        <span className="text-xs text-go-off/40 mt-0.5">{subtitle}</span>
      )}
    </div>
  );
}