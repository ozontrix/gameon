"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Home, Bell, MapPin } from "lucide-react";

const tabs = [
  { id: "home", label: "Home", icon: Home },
  { id: "notify", label: "Notify", icon: Bell },
  { id: "location", label: "Location", icon: MapPin },
];

export default function FloatingTabBar() {
  const [activeTab, setActiveTab] = useState("home");
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      const heroHeight = window.innerHeight;
      if (window.scrollY > heroHeight * 0.6) {
        setVisible(true);
      } else {
        setVisible(false);
        setActiveTab("home");
      }
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const handleTabClick = (tabId: string) => {
    setActiveTab(tabId);

    if (tabId === "home") {
      window.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }

    const el = document.getElementById(tabId);
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  };

  return (
    <motion.div
      className="fixed bottom-0 left-0 right-0 z-50 safe-bottom pointer-events-none"
      initial={{ y: 100, opacity: 0 }}
      animate={{
        y: visible ? 0 : 100,
        opacity: visible ? 1 : 0,
      }}
      transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
    >
      <div className="mx-4 mb-4 pointer-events-auto">
        <div className="glass-panel flex items-center justify-around px-4 py-2.5">
          {tabs.map((tab) => {
            const isActive = activeTab === tab.id;
            const Icon = tab.icon;

            return (
              <button
                key={tab.id}
                onClick={() => handleTabClick(tab.id)}
                className="flex flex-col items-center gap-1 relative py-1 px-4"
              >
                <Icon
                  className={`w-5 h-5 transition-colors ${
                    isActive ? "text-gameon-yellow" : "text-gameon-off-white/40"
                  }`}
                />
                <span
                  className={`text-[10px] font-medium tracking-wider uppercase transition-colors ${
                    isActive ? "text-gameon-yellow" : "text-gameon-off-white/40"
                  }`}
                >
                  {tab.label}
                </span>
                {isActive && (
                  <motion.div
                    layoutId="tab-indicator"
                    className="absolute -top-1 w-1 h-1 rounded-full bg-gameon-yellow"
                    transition={{ type: "spring", stiffness: 300, damping: 24 }}
                  />
                )}
              </button>
            );
          })}
        </div>
      </div>
    </motion.div>
  );
}