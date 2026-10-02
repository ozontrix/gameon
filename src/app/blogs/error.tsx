'use client';

export default function BlogError({ reset }: { reset: () => void }) {
  return <section role="alert" className="rounded-3xl border border-white/10 p-8"><h1 className="text-2xl font-semibold">We couldn’t load the blogs</h1><p className="mt-3 text-go-off/80">Please try again in a moment.</p><button type="button" onClick={reset} className="mt-6 min-h-11 cursor-pointer rounded-lg bg-go-brand px-5 py-3 font-semibold text-go-black focus-visible:outline-2 focus-visible:outline-go-brand">Try again</button></section>;
}