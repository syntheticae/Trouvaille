const fs = require("fs");

const code = `import { motion } from "framer-motion"

export function LoadingScreen() {
  const dotAnimation = {
    y: [0, -10, 0],
    opacity: [0.35, 1, 0.35],
    scale: [0.88, 1.12, 0.88]
  }

  const dotTransition = (delay: number) => ({
    duration: 0.9,
    repeat: Infinity,
    ease: "easeInOut" as const,
    delay
  })

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center select-none"
      style={{ background: "var(--bg-base)" }}
    >
      {/* 3 Minimal Wave Dots */}
      <div className="flex items-center justify-center gap-2">
        <motion.div
          animate={dotAnimation}
          transition={dotTransition(0)}
          className="w-2.5 h-2.5 rounded-full"
          style={{ background: "var(--text-primary)" }}
        />
        <motion.div
          animate={dotAnimation}
          transition={dotTransition(0.18)}
          className="w-2.5 h-2.5 rounded-full"
          style={{ background: "var(--text-primary)" }}
        />
        <motion.div
          animate={dotAnimation}
          transition={dotTransition(0.36)}
          className="w-2.5 h-2.5 rounded-full"
          style={{ background: "var(--text-primary)" }}
        />
      </div>
    </div>
  )
}
`;

fs.writeFileSync("src/components/ui/LoadingScreen.tsx", code, "utf8");
console.log("Updated LoadingScreen.tsx with 3 theme-adaptive wave dots and no text");
