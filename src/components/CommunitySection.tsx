"use client";

import { useRef } from "react";
import { motion, useInView } from "framer-motion";
import Image from "next/image";
import { Heart, MessageCircle } from "lucide-react";

const communityPosts = [
  {
    image: "/ac-indoor.jpeg",
    caption: "Sunset pickleball session on the AC courts.",
    engagement: "24 likes",
    comments: 3,
  },
  {
    image: "/outdoor.jpeg",
    caption: "Floodlit Box Cricket — the Friday night ritual.",
    engagement: "36 likes",
    comments: 5,
  },
];

export function CommunitySection() {
  const ref = useRef<HTMLElement>(null);
  const inView = useInView(ref, { once: true, margin: "-80px" });

  return (
    <section id="community" ref={ref} className="relative px-6 sm:px-8 lg:px-14 xl:px-20 py-20 lg:py-28">
      <motion.div
        className="mb-10"
        initial={{ opacity: 0, y: 20 }}
        animate={inView ? { opacity: 1, y: 0 } : {}}
        transition={{ duration: 0.5 }}
      >
        <span className="text-xs tracking-[0.2em] uppercase text-go-brand font-medium">Community</span>
        <h2 className="text-3xl lg:text-4xl xl:text-5xl font-display font-bold text-go-white mt-2">
          The Game On Wall
        </h2>
        <p className="text-sm text-go-off/50 mt-3 max-w-lg">
          Real moments from the courts, the café, and the community.
        </p>
      </motion.div>

      {/* Two Posts */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 lg:gap-6">
        {communityPosts.map((post, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 30 }}
            animate={inView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.5, delay: 0.1 + i * 0.15 }}
            className="group"
          >
            <div className="glass-subtle rounded-[24px] overflow-hidden hover:bg-go-white-glass transition-all duration-500">
              {/* Image */}
              <div className="relative w-full aspect-[16/10] overflow-hidden">
                <Image
                  src={post.image}
                  alt={post.caption}
                  fill
                  className="object-cover transition-transform duration-700 group-hover:scale-105"
                  sizes="(max-width: 768px) 100vw, 50vw"
                />
                {/* Gradient overlay at bottom */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent" />
              </div>

              {/* Content */}
              <div className="p-4 lg:p-5">
                <p className="text-sm text-go-off/80 leading-snug mb-3">{post.caption}</p>

                <div className="flex items-center gap-4 text-xs text-go-off/40">
                  <span className="flex items-center gap-1.5">
                    <Heart className="w-3.5 h-3.5" />
                    {post.engagement}
                  </span>
                  <span className="flex items-center gap-1.5">
                    <MessageCircle className="w-3.5 h-3.5" />
                    {post.comments}
                  </span>
                </div>
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Follow CTA */}
      <motion.p
        className="text-xs text-go-off/30 text-center mt-8"
        initial={{ opacity: 0 }}
        animate={inView ? { opacity: 1 } : {}}
        transition={{ duration: 0.5, delay: 0.6 }}
      >
        Follow us on Instagram for live updates from the courts.
      </motion.p>
    </section>
  );
}