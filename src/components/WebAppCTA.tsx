import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { SPORTS_APP_HREF } from "@/lib/homepage-app";
import { cn } from "@/lib/utils";

export function WebAppCTA({ href = SPORTS_APP_HREF, children = "Book now in the web app", className = "" }: {
  href?: string;
  children?: React.ReactNode;
  className?: string;
}) {
  return (
    <Link href={href} className={cn("group inline-flex min-h-12 cursor-pointer items-center justify-center gap-3 rounded-full bg-go-brand px-6 py-3.5 text-sm font-bold text-go-black transition-colors duration-200 hover:bg-go-off focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-go-brand", className)}>
      {children}<ArrowUpRight aria-hidden="true" className="size-4 shrink-0 transition-transform duration-200 group-hover:-translate-y-0.5 group-hover:translate-x-0.5 motion-reduce:transform-none" />
    </Link>
  );
}