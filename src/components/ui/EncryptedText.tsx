import React, { useEffect, useState, useRef } from "react";

interface EncryptedTextProps {
  text: string;
  isActive?: boolean;
  isCompleted?: boolean;
  revealDelayMs?: number;
  encryptedClassName?: string;
  revealedClassName?: string;
  className?: string;
  glyphs?: string;
}

const LUXURY_CIPHER_GLYPHS = "01◈⟡∷█▞⬡_~·/0x";

export const EncryptedText: React.FC<EncryptedTextProps> = ({
  text,
  isActive = false,
  isCompleted = false,
  revealDelayMs = 28,
  encryptedClassName = "opacity-55 font-mono tracking-wide",
  revealedClassName = "font-bold",
  className = "",
  glyphs = LUXURY_CIPHER_GLYPHS,
}) => {
  const [revealedCount, setRevealedCount] = useState<number>(() => {
    return isCompleted ? text.length : 0;
  });

  const generateScramble = () => {
    return Array.from({ length: text.length }, (_, i) => {
      if (text[i] === " ") return " ";
      return glyphs[Math.floor(Math.random() * glyphs.length)];
    });
  };

  const [scrambleChars, setScrambleChars] = useState<string[]>(generateScramble);
  const intervalRef = useRef<number | null>(null);

  useEffect(() => {
    if (isCompleted) {
      setRevealedCount(text.length);
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      return;
    }

    if (!isActive) {
      setRevealedCount(0);
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      return;
    }

    // Active state: decrypt character-by-character from left to right
    setRevealedCount(0);
    let current = 0;
    const total = text.length;

    intervalRef.current = window.setInterval(() => {
      // Randomize remaining unrevealed characters while preserving spaces
      setScrambleChars(generateScramble());

      current += 1;
      setRevealedCount(Math.min(current, total));

      if (current >= total) {
        if (intervalRef.current) {
          clearInterval(intervalRef.current);
          intervalRef.current = null;
        }
      }
    }, revealDelayMs);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [isActive, isCompleted, text, revealDelayMs]);

  // If pending (not active and not completed), render quiet text
  if (!isActive && !isCompleted) {
    return <span className={className}>{text}</span>;
  }

  // If completed, render full resolved string
  if (isCompleted) {
    return <span className={`${className} ${revealedClassName}`}>{text}</span>;
  }

  // Active state: revealed real characters + scrambling cipher characters (spaces preserved)
  const revealedPart = text.slice(0, revealedCount);
  const scrambledPart = scrambleChars.slice(revealedCount).join("");

  return (
    <span className={className}>
      <span className={revealedClassName}>{revealedPart}</span>
      <span className={encryptedClassName}>{scrambledPart}</span>
    </span>
  );
};
