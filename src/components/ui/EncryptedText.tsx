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

const DEFAULT_GLYPHS = "0123456789ABCDEF◈⟡∷█▞⬡~_+=/<>[]{}*&$#@!";

export const EncryptedText: React.FC<EncryptedTextProps> = ({
  text,
  isActive = false,
  isCompleted = false,
  revealDelayMs = 38,
  encryptedClassName = "opacity-45 font-mono",
  revealedClassName = "font-medium",
  className = "",
  glyphs = DEFAULT_GLYPHS,
}) => {
  const [revealedCount, setRevealedCount] = useState<number>(() => {
    return isCompleted ? text.length : 0;
  });
  const [scrambleChars, setScrambleChars] = useState<string[]>(() => {
    return Array.from({ length: text.length }, () =>
      glyphs[Math.floor(Math.random() * glyphs.length)]
    );
  });

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

    // Step is active: run decryption sequence
    setRevealedCount(0);
    let currentRevealed = 0;
    const totalChars = text.length;

    intervalRef.current = window.setInterval(() => {
      // Scramble remaining characters
      setScrambleChars(
        Array.from({ length: totalChars }, () =>
          glyphs[Math.floor(Math.random() * glyphs.length)]
        )
      );

      // Advance reveal position
      currentRevealed += 1;
      setRevealedCount(Math.min(currentRevealed, totalChars));

      if (currentRevealed >= totalChars) {
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

  // If pending (not active and not completed), render quiet text
  if (!isActive && !isCompleted) {
    return <span className={className}>{text}</span>;
  }

  // If completed, render full resolved text
  if (isCompleted) {
    return <span className={`${className} ${revealedClassName}`}>{text}</span>;
  }

  // Active state: stream revealed + scrambling tail
  return (
    <span className={className}>
      <span className={revealedClassName}>{text.slice(0, revealedCount)}</span>
      <span className={encryptedClassName}>
        {scrambleChars.slice(revealedCount).join("")}
      </span>
    </span>
  );
};
