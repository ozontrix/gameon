"use client";

import { useRef, useState, useCallback } from "react";
import { motion, useInView, AnimatePresence } from "framer-motion";
import Image from "next/image";
import { Heart, MessageCircle, Share2, Camera, ChevronRight } from "lucide-react";

interface Post {
  image: string;
  caption: string;
  likes: number;
  comments: number;
  hashtags: string[];
  timeAgo: string;
}

const communityPosts: Post[] = [
  {
    image: "/ac-indoor.jpeg",
    caption: "Sunset pickleball session on the AC courts — the golden hour glow hits different.",
    likes: 24,
    comments: 3,
    hashtags: ["pickleball", "goldenHour", "gameOn"],
    timeAgo: "2h ago",
  },
  {
    image: "/outdoor.jpeg",
    caption: "Floodlit Box Cricket — the Friday night ritual that's become a tradition.",
    likes: 36,
    comments: 5,
    hashtags: ["boxCricket", "fridayNights", "floodlit"],
    timeAgo: "5h ago",
  },
  {
    image: "/non-ac-indoor.jpeg",
    caption: "Saturday morning badminton clinic with the rising stars of Sector 70.",
    likes: 18,
    comments: 2,
    hashtags: ["badminton", "coaching", "futureStars"],
    timeAgo: "1d ago",
  },
];

// ─── Double-tap Heart Component ───
function DoubleTapHeart({ visible }: { visible: boolean }) {
  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          className="absolute inset-0 flex items-center justify-center z-20 pointer-events-none"
          initial={{ scale: 0, opacity: 1 }}
          animate={{ scale: [0, 1.3, 1], opacity: [1, 1, 0.8] }}
          exit={{ scale: 1.5, opacity: 0 }}
          transition={{ duration: 0.5, ease: "easeOut" }}
        >
          <motion.div
            className="w-24 h-24 flex items-center justify-center"
            initial={{ scale: 0, rotate: -20 }}
            animate={{
              scale: [0, 1.2, 1],
              rotate: [0, -10, 0],
            }}
            transition={{ duration: 0.4, ease: "easeOut" }}
          >
            <svg
              viewBox="0 0 24 24"
              className="w-full h-full drop-shadow-2xl"
              fill="white"
              style={{ filter: "drop-shadow(0 0 20px rgba(245, 166, 35, 0.4))" }}
            >
              <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
            </svg>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// ─── Post Card Component ───
function PostCard({ post, index, inView }: { post: Post; index: number; inView: boolean }) {
  const [liked, setLiked] = useState(false);
  const [showHeart, setShowHeart] = useState(false);
  const [likeCount, setLikeCount] = useState(post.likes);
  const lastTapRef = useRef<number>(0);

  const handleImageClick = useCallback(() => {
    const now = Date.now();
    const timeSince = now - lastTapRef.current;

    if (timeSince < 300 && timeSince > 0) {
      // Double tap detected
      if (!liked) {
        setLiked(true);
        setLikeCount((prev) => prev + 1);
        setShowHeart(true);
        setTimeout(() => setShowHeart(false), 500);
      }
    }
    lastTapRef.current = now;
  }, [liked]);

  const toggleLike = () => {
    if (liked) {
      setLiked(false);
      setLikeCount((prev) => prev - 1);
    } else {
      setLiked(true);
      setLikeCount((prev) => prev + 1);
      setShowHeart(true);
      setTimeout(() => setShowHeart(false), 500);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      animate={inView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.5, delay: 0.1 + index * 0.12 }}
    >
      <div className="glass-subtle rounded-[24px] overflow-hidden hover:bg-go-white-glass transition-all duration-500 group">
        {/* Image with double-tap */}
        <div
          className="relative w-full aspect-[4/3] overflow-hidden cursor-pointer"
          onClick={handleImageClick}
        >
          <Image
            src={post.image}
            alt={post.caption}
            fill
            className="object-cover transition-transform duration-700 group-hover:scale-105"
            sizes="(max-width: 768px) 100vw, (max-width: 1024px) 50vw, 33vw"
          />

          {/* Gradient overlays */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

          {/* Double-tap heart animation */}
          <DoubleTapHeart visible={showHeart} />

          {/* Image index badge */}
          <div className="absolute top-3 right-3 px-2 py-1 rounded-full text-[9px] font-medium bg-black/40 backdrop-blur-sm text-white/70">
            📸 {index + 1}/{communityPosts.length}
          </div>
        </div>

        {/* Content */}
        <div className="p-4 lg:p-5">
          {/* Caption */}
          <p className="text-sm text-go-off/80 leading-relaxed mb-2">{post.caption}</p>

          {/* Hashtags */}
          <div className="flex flex-wrap gap-1.5 mb-3">
            {post.hashtags.map((tag) => (
              <span
                key={tag}
                className="text-[10px] text-go-brand/60 font-medium"
              >
                #{tag}
              </span>
            ))}
          </div>

          {/* Actions bar */}
          <div className="flex items-center justify-between pt-3 border-t border-go-border-subtle/50">
            <div className="flex items-center gap-4">
              {/* Like */}
              <motion.button
                onClick={toggleLike}
                whileTap={{ scale: 0.85 }}
                className="flex items-center gap-1.5 cursor-pointer"
              >
                {liked ? (
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ type: "spring", stiffness: 400, damping: 15 }}
                  >
                    <Heart className="w-4 h-4 text-go-brand fill-go-brand" />
                  </motion.div>
                ) : (
                  <Heart className="w-4 h-4 text-go-off/40 group-hover:text-go-off/60 transition-colors" />
                )}
                <span className="text-xs text-go-off/40 tabular-nums">{likeCount}</span>
              </motion.button>

              {/* Comments */}
              <span className="flex items-center gap-1.5">
                <MessageCircle className="w-4 h-4 text-go-off/40" />
                <span className="text-xs text-go-off/40">{post.comments}</span>
              </span>
            </div>

            {/* Time & Share */}
            <div className="flex items-center gap-3">
              <span className="text-[10px] text-go-off/30">{post.timeAgo}</span>
              <Share2 className="w-3.5 h-3.5 text-go-off/30 hover:text-go-off/50 transition-colors cursor-pointer" />
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

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
        <span className="text-xs tracking-[0.2em] uppercase text-go-brand font-medium flex items-center gap-2">
          <Camera className="w-3.5 h-3.5" />
          Community
        </span>
        <h2 className="text-3xl lg:text-4xl xl:text-5xl font-display font-bold text-go-white mt-2">
          The Game On Wall
        </h2>
        <p className="text-sm text-go-off/50 mt-3 max-w-lg">
          Real moments from the courts, the café, and the community. Double-tap to show some ❤️
        </p>
      </motion.div>

      {/* Posts Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 lg:gap-5">
        {communityPosts.map((post, i) => (
          <PostCard key={i} post={post} index={i} inView={inView} />
        ))}
      </div>

      {/* Follow CTA */}
      <motion.div
        className="mt-10 text-center"
        initial={{ opacity: 0 }}
        animate={inView ? { opacity: 1 } : {}}
        transition={{ duration: 0.5, delay: 0.6 }}
      >
        <a
          href="https://instagram.com"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 px-6 py-3 rounded-full glass text-xs tracking-wider uppercase text-go-off/60 hover:text-go-off hover:bg-go-white-glass-2 transition-all duration-300 group"
        >
          <Camera className="w-3.5 h-3.5" />
          Follow @GameOnMultisports
          <ChevronRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
        </a>
      </motion.div>
    </section>
  );
}
