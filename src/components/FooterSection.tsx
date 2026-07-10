"use client";

import { useRef, useState } from "react";
import { motion, useInView } from "framer-motion";
import {
  ChevronRight,
  Mail,
  Phone,
  Globe,
  Camera,
  UserPlus,
  Building2,
  Briefcase,
  Heart,
  Shield,
  MessageCircle,
  Sparkles,
  ArrowUpRight,
  Send,
} from "lucide-react";
import Image from "next/image";

const settingsRows = [
  [
    { label: "Contact Us", icon: Mail, href: "mailto:info@gameonmultisports.com", desc: "We respond within 4 hours" },
    { label: "Call Us", icon: Phone, href: "tel:+13465923545", desc: "Mon–Sat, 9 AM – 8 PM" },
  ],
  [
    { label: "WhatsApp", icon: MessageCircle, href: "https://wa.me/13465923545", desc: "Quickest way to reach us" },
    { label: "Partnerships", icon: Building2, href: "#", desc: "Brands, sponsors, events" },
  ],
  [
    { label: "Careers", icon: Briefcase, href: "#", desc: "Join the Game On team" },
    { label: "Terms of Use", icon: Shield, href: "#", desc: "Policies & guidelines" },
  ],
  [
    { label: "Privacy Policy", icon: Heart, href: "#", desc: "How we handle your data" },
  ],
];

export function FooterSection() {
  const ref = useRef<HTMLElement>(null);
  const inView = useInView(ref, { once: true, margin: "-80px" });
  const [emailFocused, setEmailFocused] = useState(false);

  return (
    <section id="more" ref={ref} className="relative">
      {/* Full-bleed navy panel */}
      <div className="bg-go-navy">
        <div className="px-6 sm:px-8 lg:px-14 xl:px-20 py-16 lg:py-20">
          <motion.div
            className="mb-12 flex flex-col lg:flex-row lg:items-end lg:justify-between gap-8"
            initial={{ opacity: 0, y: 20 }}
            animate={inView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.5 }}
          >
            <div>
              <span className="text-xs tracking-[0.2em] uppercase text-go-brand font-medium">More</span>
              <h2 className="text-3xl lg:text-4xl xl:text-5xl font-display font-bold text-go-white mt-2">
                Game On
              </h2>
              <p className="text-sm text-go-off/50 mt-2">A Splitwaters Company</p>
            </div>

            {/* Newsletter / Waitlist mini */}
            <div className="w-full lg:max-w-sm">
              <p className="text-[10px] tracking-wider uppercase text-go-off/30 font-medium mb-2 flex items-center gap-1.5">
                <Sparkles className="w-3 h-3 text-go-brand" />
                Stay in the loop
              </p>
              <div className={`flex items-center gap-2 p-1.5 rounded-2xl transition-all duration-300 border ${
                emailFocused ? "border-go-brand/40 bg-go-brand/5" : "border-go-border-subtle bg-go-white-glass"
              }`}>
                <input
                  type="email"
                  placeholder="Enter your email"
                  onFocus={() => setEmailFocused(true)}
                  onBlur={() => setEmailFocused(false)}
                  className="flex-1 bg-transparent text-xs text-go-off/80 placeholder:text-go-off/30 px-3 py-2 focus:outline-none"
                />
                <button className="shrink-0 w-8 h-8 rounded-full bg-go-brand flex items-center justify-center hover:bg-go-brand/90 transition-colors cursor-pointer">
                  <Send className="w-3.5 h-3.5 text-go-black" />
                </button>
              </div>
              <p className="text-[9px] text-go-off/30 mt-1.5 px-1">
                Be the first to know about launches & offers
              </p>
            </div>
          </motion.div>

          {/* iOS-style grouped list */}
          <motion.div
            className="space-y-3 max-w-lg"
            initial={{ opacity: 0 }}
            animate={inView ? { opacity: 1 } : {}}
            transition={{ duration: 0.5, delay: 0.1 }}
          >
            {settingsRows.map((group, gi) => (
              <div key={gi} className="glass-navy rounded-[20px] overflow-hidden divide-y divide-go-border-subtle/50">
                {group.map((item) => (
                  <a
                    key={item.label}
                    href={item.href}
                    className="flex items-center justify-between px-5 py-4 hover:bg-go-white-glass transition-colors group"
                  >
                    <div className="flex items-center gap-3">
                      <item.icon className="w-4 h-4 text-go-brand" />
                      <div>
                        <span className="text-sm font-medium text-go-off/80">{item.label}</span>
                        {item.desc && (
                          <p className="text-[10px] text-go-off/30 mt-0.5">{item.desc}</p>
                        )}
                      </div>
                    </div>
                    <ChevronRight className="w-4 h-4 text-go-off/30 group-hover:text-go-off/50 transition-colors" />
                  </a>
                ))}
              </div>
            ))}
          </motion.div>

          {/* Social & Brand */}
          <motion.div
            className="mt-12 pt-8 border-t border-go-border-subtle/50 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6"
            initial={{ opacity: 0 }}
            animate={inView ? { opacity: 1 } : {}}
            transition={{ duration: 0.5, delay: 0.3 }}
          >
            {/* Logo */}
            <div className="w-32">
              <Image
                src="/game_on.png"
                alt="Game On"
                width={160}
                height={48}
                className="object-contain w-full h-auto opacity-80"
              />
            </div>

            {/* Social with hover tooltips */}
            <div className="flex items-center gap-4">
              {[
                { icon: Camera, href: "https://instagram.com", label: "Instagram", handle: "@GameOnMultisports" },
                { icon: Globe, href: "https://x.com", label: "X / Twitter", handle: "@GameOnHQ" },
                { icon: UserPlus, href: "https://linkedin.com", label: "LinkedIn", handle: "/company/gameon" },
              ].map(({ icon: Icon, href, label, handle }) => (
                <a
                  key={label}
                  href={href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group relative w-10 h-10 rounded-full bg-go-white-glass flex items-center justify-center hover:bg-go-white-glass-2 transition-all duration-300 hover:scale-110"
                  aria-label={label}
                >
                  <Icon className="w-4 h-4 text-go-off/60 group-hover:text-go-brand transition-colors" />
                  {/* Tooltip */}
                  <span className="absolute -top-8 left-1/2 -translate-x-1/2 px-2 py-1 rounded-lg bg-go-black text-[9px] text-go-off/70 whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none backdrop-blur-sm border border-go-border-subtle">
                    {handle}
                  </span>
                </a>
              ))}
            </div>

            <p className="text-xs text-go-off/30">
              © {new Date().getFullYear()} Game On Multisports Complex. All rights reserved.
            </p>
          </motion.div>

          {/* Bottom tagline */}
          <motion.p
            className="text-[9px] text-go-off/20 text-center mt-8 tracking-wider uppercase"
            initial={{ opacity: 0 }}
            animate={inView ? { opacity: 1 } : {}}
            transition={{ delay: 0.5 }}
          >
            Built for the love of the game.
          </motion.p>
        </div>
      </div>

      {/* Bottom safe area spacer for mobile tab bar */}
      <div className="h-24 lg:h-0 bg-go-navy" />
    </section>
  );
}
