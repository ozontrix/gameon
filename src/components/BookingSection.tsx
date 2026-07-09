"use client";

import { useState, useRef, useCallback } from "react";
import { motion, useInView } from "framer-motion";
import { ChevronLeft, ChevronRight, Clock, MapPin, Check, Sparkles, Rocket, PartyPopper } from "lucide-react";
import { SegmentedControl } from "./SegmentedControl";
import { toast } from "sonner";

type Sport = "pickleball" | "badminton" | "cricket-nets";

const sports: { value: Sport; label: string }[] = [
  { value: "pickleball", label: "Pickleball" },
  { value: "badminton", label: "Badminton" },
  { value: "cricket-nets", label: "Cricket Nets" },
];

const timeSlots = [
  "6:00 AM", "7:00 AM", "8:00 AM", "9:00 AM", "10:00 AM",
  "11:00 AM", "12:00 PM", "1:00 PM", "2:00 PM", "3:00 PM",
  "4:00 PM", "5:00 PM", "6:00 PM", "7:00 PM", "8:00 PM",
  "9:00 PM", "10:00 PM",
];

const availabilityMap: Record<Sport, { available: boolean; price: string }[]> = {
  pickleball: timeSlots.map((_, i) => ({
    available: i >= 5 && i <= 15 && ![7, 10, 13].includes(i),
    price: "₹800",
  })),
  badminton: timeSlots.map((_, i) => ({
    available: i >= 6 && i <= 14 && ![9, 12].includes(i),
    price: "₹600",
  })),
  "cricket-nets": timeSlots.map((_, i) => ({
    available: i >= 7 && i <= 16 && ![11, 14].includes(i),
    price: "₹400",
  })),
};

export function BookingSection() {
  const [sport, setSport] = useState<Sport>("pickleball");
  const [selectedSlot, setSelectedSlot] = useState<number | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const sectionRef = useRef<HTMLElement>(null);
  const inView = useInView(sectionRef, { once: true, margin: "-80px" });

  const slots = availabilityMap[sport];
  const today = new Date().toLocaleDateString("en-IN", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });

  const handleReserve = () => {
    if (selectedSlot !== null) {
      const time = timeSlots[selectedSlot];
      const sportLabel = sports.find(s => s.value === sport)?.label;
      
      toast.custom((t) => (
        <motion.div
          initial={{ opacity: 0, y: 40, scale: 0.9 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -20, scale: 0.95 }}
          transition={{ type: "spring", stiffness: 300, damping: 25 }}
          className="relative overflow-hidden rounded-2xl border border-go-brand/30 bg-gradient-to-br from-go-black via-[#1a1208] to-go-black shadow-2xl shadow-go-brand/10 p-5 w-[340px] sm:w-[380px]"
        >
          {/* Animated background glow */}
          <motion.div
            className="absolute -top-10 -right-10 w-32 h-32 rounded-full bg-go-brand/10 blur-3xl"
            animate={{ scale: [1, 1.2, 1], opacity: [0.3, 0.6, 0.3] }}
            transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
          />
          <motion.div
            className="absolute -bottom-8 -left-8 w-24 h-24 rounded-full bg-go-brand/5 blur-3xl"
            animate={{ scale: [1, 1.3, 1], opacity: [0.2, 0.5, 0.2] }}
            transition={{ duration: 2.5, repeat: Infinity, ease: "easeInOut", delay: 1 }}
          />
          
          {/* Content */}
          <div className="relative z-10">
            <div className="flex items-center gap-3 mb-3">
              <motion.div
                animate={{ rotate: [0, -10, 10, -10, 0] }}
                transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
              >
                <PartyPopper className="w-6 h-6 text-go-brand" />
              </motion.div>
              <motion.div
                animate={{ y: [0, -3, 0] }}
                transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
              >
                <Rocket className="w-5 h-5 text-go-brand/70" />
              </motion.div>
              <motion.div
                animate={{ rotate: [0, 10, -10, 10, 0] }}
                transition={{ duration: 1.8, repeat: Infinity, ease: "easeInOut", delay: 0.3 }}
              >
                <Sparkles className="w-5 h-5 text-go-brand/60" />
              </motion.div>
            </div>
            
            <h3 className="text-lg font-display font-bold text-go-white mb-1">
              Bookings are coming soon! 🎉
            </h3>
            <p className="text-sm text-go-off/60 leading-relaxed">
              We're putting the final touches on our booking system. 
              You'll be the first to know when it's live!
            </p>
            
            <motion.div
              className="mt-4 flex items-center gap-2"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.3 }}
            >
              <div className="flex-1 h-1.5 rounded-full bg-go-white/5 overflow-hidden">
                <motion.div
                  className="h-full rounded-full bg-gradient-to-r from-go-brand via-go-brand/80 to-go-brand"
                  initial={{ width: "0%" }}
                  animate={{ width: "100%" }}
                  transition={{ duration: 2, ease: "easeInOut" }}
                />
              </div>
              <span className="text-[10px] text-go-brand/60 font-mono font-medium">SOON</span>
            </motion.div>
            
            <div className="mt-3 flex items-center gap-2 text-[10px] text-go-off/30">
              <Clock className="w-3 h-3" />
              <span>{time} • {sportLabel}</span>
            </div>
          </div>
        </motion.div>
      ), {
        duration: 5000,
        position: "bottom-center",
      });
      
      setSelectedSlot(null);
    }
  };

  const scroll = (dir: "left" | "right") => {
    if (scrollRef.current) {
      scrollRef.current.scrollBy({ left: dir === "left" ? -200 : 200, behavior: "smooth" });
    }
  };

  return (
    <section id="booking" ref={sectionRef} className="relative px-6 sm:px-8 lg:px-14 xl:px-20 py-20 lg:py-28">
      <motion.div
        className="mb-10"
        initial={{ opacity: 0, y: 20 }}
        animate={inView ? { opacity: 1, y: 0 } : {}}
        transition={{ duration: 0.5 }}
      >
        <span className="text-xs tracking-[0.2em] uppercase text-go-brand font-medium">Book Now</span>
        <h2 className="text-3xl lg:text-4xl xl:text-5xl font-display font-bold text-go-white mt-2">
          Reserve Your Game
        </h2>
        <p className="text-sm text-go-off/50 mt-3 max-w-lg">
          Pick a sport, pick a time. Live availability — ready when you are.
        </p>
      </motion.div>

      {/* Main Booking Card */}
      <motion.div
        className="glass rounded-[28px] p-6 lg:p-8 max-w-2xl mx-auto"
        initial={{ opacity: 0, y: 20 }}
        animate={inView ? { opacity: 1, y: 0 } : {}}
        transition={{ duration: 0.4, delay: 0.1 }}
      >
        {/* Sport Selector */}
        <div className="flex items-center justify-between mb-6">
          <SegmentedControl
            options={sports}
            value={sport}
            onChange={(v) => { setSport(v as Sport); setSelectedSlot(null); }}
          />
          <div className="flex items-center gap-2 text-xs text-go-off/40">
            <Clock className="w-3 h-3" />
            <span>{today}</span>
          </div>
        </div>

        {/* Date display */}
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-2">
            <MapPin className="w-4 h-4 text-go-brand" />
            <span className="text-sm font-medium text-go-off/80">Sector 70, Gurugram</span>
          </div>
          <span className="text-xs px-3 py-1 rounded-full bg-go-brand/20 text-go-brand font-medium">
            {slots.filter((s) => s.available).length} slots available
          </span>
        </div>

        {/* Time Slots */}
        <div className="relative mb-6 group/slider">
          <button
            onClick={() => scroll("left")}
            className="absolute left-0 top-0 bottom-0 z-10 w-8 bg-gradient-to-r from-go-black to-transparent flex items-center justify-start lg:hidden"
          >
            <ChevronLeft className="w-4 h-4 text-go-off/40" />
          </button>

          <div
            ref={scrollRef}
            className="flex gap-2 overflow-x-auto hide-scrollbar pb-2"
          >
            {timeSlots.map((time, i) => {
              const slot = slots[i];
              const isSelected = selectedSlot === i;
              const isAvailable = slot.available;

              return (
                <motion.button
                  key={time}
                  disabled={!isAvailable}
                  onClick={() => setSelectedSlot(isSelected ? null : i)}
                  whileHover={isAvailable ? { scale: 1.05, y: -2 } : {}}
                  whileTap={isAvailable ? { scale: 0.95 } : {}}
                  className={`flex flex-col items-center gap-1 min-w-[80px] p-3 rounded-2xl transition-all shrink-0 ${
                    isSelected
                      ? "bg-go-brand text-go-white shadow-lg shadow-go-brand/30"
                      : isAvailable
                      ? "glass-subtle text-go-off/70 hover:bg-go-white-glass hover:text-go-white hover:border-go-brand/40 cursor-pointer"
                      : "bg-go-black/40 text-go-off/20 cursor-not-allowed opacity-40"
                  }`}
                >
                  <span className="text-xs font-medium">{time}</span>
                  {isAvailable && (
                    <span className="text-[9px] opacity-60">{slot.price}</span>
                  )}
                  {!isAvailable && (
                    <span className="text-[9px] opacity-40">Booked</span>
                  )}
                </motion.button>
              );
            })}
          </div>

          <button
            onClick={() => scroll("right")}
            className="absolute right-0 top-0 bottom-0 z-10 w-8 bg-gradient-to-l from-go-black to-transparent flex items-center justify-end lg:hidden"
          >
            <ChevronRight className="w-4 h-4 text-go-off/40" />
          </button>
        </div>

        {/* Selected slot summary */}
        {selectedSlot !== null && (
          <motion.div
            initial={{ opacity: 0, y: 8, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ type: "spring", stiffness: 300, damping: 25 }}
            className="flex items-center justify-between p-4 rounded-2xl bg-go-white-glass border border-go-brand/20 mb-4"
          >
            <div className="flex items-center gap-3">
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: "spring", stiffness: 400, damping: 20, delay: 0.1 }}
                className="w-8 h-8 rounded-full bg-go-brand/20 flex items-center justify-center"
              >
                <Check className="w-4 h-4 text-go-brand" />
              </motion.div>
              <div>
                <span className="text-sm font-medium text-go-white">{timeSlots[selectedSlot]}</span>
                <span className="text-xs text-go-off/40 ml-3">
                  {slots[selectedSlot].price} • {sports.find(s => s.value === sport)?.label}
                </span>
              </div>
            </div>
            <motion.button
              onClick={() => setSelectedSlot(null)}
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              className="text-xs text-go-off/30 hover:text-go-off/60 transition-colors"
            >
              Change
            </motion.button>
          </motion.div>
        )}

        {/* Reserve Button */}
        <motion.div
          whileHover={selectedSlot !== null ? { scale: 1.02 } : {}}
          whileTap={selectedSlot !== null ? { scale: 0.98 } : {}}
        >
          <button
            onClick={handleReserve}
            disabled={selectedSlot === null}
            className="group relative w-full bg-go-brand text-go-black font-semibold text-sm tracking-wider uppercase rounded-full py-4 disabled:opacity-30 disabled:cursor-not-allowed transition-all duration-300 overflow-hidden"
          >
            {/* Hover shine effect */}
            <motion.span
              className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -skew-x-12 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700"
            />
            <span className="relative z-10 flex items-center justify-center gap-2">
              {selectedSlot !== null ? (
                <>
                  <Sparkles className="w-4 h-4" />
                  Reserve This Slot
                </>
              ) : (
                "Select a Time Slot"
              )}
            </span>
          </button>
        </motion.div>
      </motion.div>
    </section>
  );
}

