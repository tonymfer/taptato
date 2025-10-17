"use client";

import { AnimatePresence, motion } from "framer-motion";

interface FloatingTextProps {
  text: string;
  isPositive?: boolean; // true = green (+), false = red (-)
  show: boolean;
}

export function FloatingText({
  text,
  isPositive = false,
  show,
}: FloatingTextProps) {
  return (
    <AnimatePresence mode="wait">
      {show && (
        <motion.div
          key={text}
          initial={{ y: 0, opacity: 1, scale: 1 }}
          animate={{
            y: -60,
            opacity: [1, 1, 1, 1, 0], // Stay visible longer, then suddenly disappear
            scale: [1, 1.1, 1.1, 1.1, 0.8], // Slight bounce
          }}
          transition={{
            duration: 0.7,
            ease: "linear", // Pixel game - no smooth easing!
            times: [0, 0.1, 0.5, 0.8, 1], // Control opacity/scale timing
          }}
          className={`
            absolute top-1/2 left-1/2 -translate-x-1/2 
            font-pixel-subtitle text-base font-bold pointer-events-none z-50
            ${isPositive ? "text-green-600" : "text-red-600"}
          `}
          style={{
            textShadow:
              "3px 3px 0 #fff, -2px -2px 0 #fff, 2px -2px 0 #fff, -2px 2px 0 #fff",
            WebkitTextStroke: isPositive ? "1.5px #15803d" : "1.5px #b91c1c",
          }}
        >
          {text}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
