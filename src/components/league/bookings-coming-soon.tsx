import Link from "next/link";
import { ArrowLeft } from "lucide-react";

/** Temporary landing view. The original league page stays intact behind its flag. */
export function LeagueBookingsComingSoon() {
  return (
    <section
      aria-labelledby="league-coming-soon-title"
      className="fixed inset-0 z-50 grid min-h-dvh overflow-y-auto bg-go-black px-6 py-12 text-center"
    >
      <div className="m-auto w-full max-w-3xl">
        <p className="mb-6 font-mono text-xs uppercase tracking-[0.2em] text-go-brand sm:text-sm">
          Game On Multisports League
        </p>
        <h1
          id="league-coming-soon-title"
          className="font-display text-5xl uppercase leading-[1.1] text-go-white sm:text-7xl lg:text-8xl"
        >
          Bookings will be{" "}
          <span className="block text-go-brand">open soon</span>
        </h1>
        <Link
          href="/"
          className="mt-10 inline-flex min-h-12 cursor-pointer items-center justify-center gap-2 rounded-full bg-go-brand px-7 py-3 text-base font-semibold text-go-black transition-colors duration-200 hover:bg-go-brand/90 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-go-brand"
        >
          <ArrowLeft aria-hidden="true" className="h-4 w-4" />
          Go home
        </Link>
      </div>
    </section>
  );
}