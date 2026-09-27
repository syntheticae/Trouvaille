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
  revealDelayMs = 32,
  encryptedClassName = "opacity-40 font-mono tracking-widest",
  revealedClassName = "font-medium",
  className = "",
  glyphs = LUXURY_CIPHER_GLYPHS,
}) => {
  const [revealedCount, setRevealedCount] = useState<number>(() => {
    return isCompleted ? text.length : 0;
  });
  const [wavefrontChars, setWavefrontChars] = useState<string[]>(["·", "·", "·"]);

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

    // Active state: decrypt wavefront character-by-character
    setRevealedCount(0);
    let current = 0;
    const total = text.length;

    intervalRef.current = window.setInterval(() => {
      // Scramble only the active decoding wavefront (next 3 characters)
      setWavefrontChars([
        glyphs[Math.floor(Math.random() * glyphs.length)],
        glyphs[Math.floor(Math.random() * glyphs.length)],
        glyphs[Math.floor(Math.random() * glyphs.length)],
      ]);

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
  }, [isActive, isCompleted, text, revealDelayMs, glyphs]);

  // If pending, render text quietly
  if (!isActive && !isCompleted) {
    return <span className={className}>{text}</span>;
  }

  // If completed, render full resolved string
  if (isCompleted) {
    return <span className={`${className} ${revealedClassName}`}>{text}</span>;
  }

  // Active state: revealed portion + decoding wavefront + gentle tail
  const revealedPart = text.slice(0, revealedCount);
  const remainingCount = Math.max(0, text.length - revealedCount);
  const activeWavefront = wavefrontChars.slice(0, Math.min(3, remainingCount)).join("");
  const trailingDots = "·".repeat(Math.max(0, remainingCount - 3));

  return (
    <span className={className}>
      <span className={revealedClassName}>{revealedPart}</span>
      <span className={encryptedClassName}>{activeWavefront}</span>
      {trailingDots.length > 0 && (
        <span className="opacity-20 font-mono tracking-widest">{trailingDots}</span>
      )}
    </span>
  );
};
