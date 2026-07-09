"use client";

import { useRef } from "react";
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
} from "lucide-react";
import Image from "next/image";

const settingsRows = [
  [
    { label: "Contact Us", icon: Mail, href: "mailto:info@gameonmultisports.com" },
    { label: "Call Us", icon: Phone, href: "tel:+13465923545" },
  ],
  [
    { label: "WhatsApp", icon: MessageCircle, href: "https://wa.me/13465923545" },
    { label: "Partnerships", icon: Building2, href: "#" },
  ],
  [
    { label: "Careers", icon: Briefcase, href: "#" },
    { label: "Terms of Use", icon: Shield, href: "#" },
  ],
  [
    { label: "Privacy Policy", icon: Heart, href: "#" },
  ],
];

export function FooterSection() {
  const ref = useRef<HTMLElement>(null);
  const inView = useInView(ref, { once: true, margin: "-80px" });

  return (
    <section id="more" ref={ref} className="relative">
      {/* Full-bleed navy panel */}
      <div className="bg-go-navy">
        <div className="px-6 sm:px-8 lg:px-14 xl:px-20 py-16 lg:py-20">
          <motion.div
            className="mb-12"
            initial={{ opacity: 0, y: 20 }}
            animate={inView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.5 }}
          >
            <span className="text-xs tracking-[0.2em] uppercase text-go-brand font-medium">More</span>
            <h2 className="text-3xl lg:text-4xl xl:text-5xl font-display font-bold text-go-white mt-2">
              Game On
            </h2>
            <p className="text-sm text-go-off/50 mt-2">A Splitwaters Company</p>
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
                      <span className="text-sm font-medium text-go-off/80">{item.label}</span>
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

            {/* Social */}
            <div className="flex items-center gap-4">
              {[
                { icon: Camera, href: "https://instagram.com", label: "Instagram" },
                { icon: Globe, href: "https://x.com", label: "X / Twitter" },
                { icon: UserPlus, href: "https://linkedin.com", label: "LinkedIn" },
              ].map(({ icon: Icon, href, label }) => (
                <a
                  key={label}
                  href={href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-10 h-10 rounded-full bg-go-white-glass flex items-center justify-center hover:bg-go-white-glass-2 transition-colors"
                  aria-label={label}
                >
                  <Icon className="w-4 h-4 text-go-off/60" />
                </a>
              ))}
            </div>

            <p className="text-xs text-go-off/30">
              © {new Date().getFullYear()} Game On Multisports Complex. All rights reserved.
            </p>
          </motion.div>
        </div>
      </div>

      {/* Bottom safe area spacer for mobile tab bar */}
      <div className="h-24 lg:h-0 bg-go-navy" />
    </section>
  );
}