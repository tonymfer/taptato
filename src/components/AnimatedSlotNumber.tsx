import { motion } from "framer-motion";
import React, { useCallback, useMemo } from "react";

interface AnimatedSlotNumberProps {
  value: number;
  className?: string;
  bgColor?: string;
  textColor?: string;
  delay?: number;
  fractionDigits?: number;
}

const DIGIT_HEIGHT = 48; // Height of each digit in pixels (increased for larger display)
const DIGITS = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9];

const AnimatedSlotNumberComponent = ({
  value,
  className = "",
  bgColor = "black",
  textColor = "white",
  delay = 0,
  fractionDigits = 2,
}: AnimatedSlotNumberProps) => {
  // Format number with commas and split into segments
  const formattedSegments = useMemo(() => {
    // Using Intl.NumberFormat().formatToParts() is a more robust way to handle
    // number formatting across different locales. It correctly identifies
    // digits and group separators (e.g., commas, periods, or spaces).
    const parts = new Intl.NumberFormat(undefined, {
      minimumFractionDigits: fractionDigits,
      maximumFractionDigits: fractionDigits,
    }).formatToParts(value ?? 0);

    const segments: Array<{
      type: "digit" | "comma" | "decimal";
      value: string;
      index: number;
    }> = [];
    let digitIndex = 0;
    let runningIndex = 0;

    parts.forEach((part) => {
      if (part.type === "integer" || part.type === "fraction") {
        for (const char of part.value) {
          segments.push({ type: "digit", value: char, index: digitIndex++ });
          runningIndex++;
        }
      } else if (part.type === "group") {
        segments.push({
          type: "comma",
          value: ",",
          index: runningIndex++,
        });
      } else if (part.type === "decimal") {
        segments.push({
          type: "decimal",
          value: ".",
          index: runningIndex++,
        });
      }
    });

    return segments;
  }, [value, fractionDigits]);

  // Memoize digit list since it never changes
  const digitList = useMemo(() => DIGITS.map((d) => d.toString()), []);

  // Memoize y position calculation
  const getYPosition = useCallback((currentDigit: number) => {
    return -currentDigit * DIGIT_HEIGHT;
  }, []);

  // Memoize the animation settings
  const animationConfig = useMemo(
    () => ({
      type: "spring" as const,
      stiffness: 400,
      damping: 30,
      mass: 0.3,
      delay: delay,
    }),
    [delay]
  );

  return (
    <div className={`flex ${className}`}>
      {formattedSegments.map((segment, index) => (
        <React.Fragment key={`segment-${index}-${formattedSegments.length}`}>
          {segment.type === "digit" ? (
            <div
              className="relative overflow-hidden"
              style={{
                width: segment.value === "1" ? "0.8ch" : "0.9ch",
                height: `${DIGIT_HEIGHT}px`,
              }}
            >
              <motion.div
                className="absolute flex flex-col items-center"
                animate={{ y: getYPosition(parseInt(segment.value)) }}
                transition={animationConfig}
              >
                {digitList.map((num) => (
                  <div
                    key={`num-${num}`}
                    style={{
                      height: `${DIGIT_HEIGHT}px`,
                      color: textColor,
                    }}
                    className="flex items-center justify-center font-medium"
                  >
                    {num}
                  </div>
                ))}
              </motion.div>
            </div>
          ) : segment.type === "decimal" ? (
            <motion.div
              className="flex items-center justify-center font-medium"
              style={{
                width: "0.3ch",
                height: `${DIGIT_HEIGHT}px`,
                color: textColor,
              }}
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              transition={{
                type: "spring",
                stiffness: 300,
                damping: 25,
                delay: delay + 0.1,
              }}
            >
              {segment.value}
            </motion.div>
          ) : (
            <motion.div
              className="flex items-center justify-center font-medium"
              style={{
                width: "0.3ch",
                height: `${DIGIT_HEIGHT}px`,
                color: textColor,
              }}
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              transition={{
                type: "spring",
                stiffness: 300,
                damping: 25,
                delay: delay + 0.1,
              }}
            >
              {segment.value}
            </motion.div>
          )}
        </React.Fragment>
      ))}
    </div>
  );
};

// Use React.memo to prevent re-rendering when props haven't changed
const AnimatedSlotNumber = React.memo(AnimatedSlotNumberComponent);

export default AnimatedSlotNumber;
