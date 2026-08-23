const fs = require("fs");

const code = `import { motion } from "framer-motion"

export function LoadingScreen({ message }: { message?: string }) {
  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-[var(--bg-canvas)] select-none">
      {/* Background Subtle Radial Glow */}
      <div
        className="absolute w-72 h-72 rounded-full pointer-events-none blur-3xl opacity-20"
        style={{ background: "radial-gradient(circle, var(--accent) 0%, transparent 70%)" }}
      />

      {/* 3 Zen Floating Stones / Pebbles */}
      <div className="relative flex items-center justify-center gap-3.5 mb-8">
        {/* Stone 1 */}
        <motion.div
          animate={{
            y: [0, -9, 0],
            scale: [1, 1.06, 1],
            rotate: [0, -4, 0]
          }}
          transition={{
            duration: 2.2,
            repeat: Infinity,
            ease: "easeInOut",
            delay: 0
          }}
          className="w-8 h-10 rounded-[18px] shadow-lg relative overflow-hidden"
          style={{
            background: "linear-gradient(135deg, rgba(255,255,255,0.18), rgba(255,255,255,0.04))",
            border: "1px solid rgba(255,255,255,0.16)",
            backdropFilter: "blur(12px)",
            boxShadow: "0 10px 25px -5px rgba(0,0,0,0.5)"
          }}
        >
          <div className="absolute top-1 left-2 right-2 h-[1px] bg-white/30 rounded-full" />
        </motion.div>

        {/* Stone 2 (Center Hero Stone) */}
        <motion.div
          animate={{
            y: [0, -14, 0],
            scale: [1, 1.08, 1],
            rotate: [0, 6, 0]
          }}
          transition={{
            duration: 2.4,
            repeat: Infinity,
            ease: "easeInOut",
            delay: 0.25
          }}
          className="w-10 h-12 rounded-[22px] shadow-2xl relative overflow-hidden"
          style={{
            background: "linear-gradient(135deg, rgba(255,255,255,0.25), rgba(255,255,255,0.06))",
            border: "1.5px solid rgba(255,255,255,0.24)",
            backdropFilter: "blur(16px)",
            boxShadow: "0 14px 30px -4px rgba(0,0,0,0.6)"
          }}
        >
          <div className="absolute top-1.5 left-2.5 right-2.5 h-[1.5px] bg-white/45 rounded-full" />
        </motion.div>

        {/* Stone 3 */}
        <motion.div
          animate={{
            y: [0, -8, 0],
            scale: [1, 1.05, 1],
            rotate: [0, -5, 0]
          }}
          transition={{
            duration: 2.1,
            repeat: Infinity,
            ease: "easeInOut",
            delay: 0.5
          }}
          className="w-7 h-9 rounded-[16px] shadow-lg relative overflow-hidden"
          style={{
            background: "linear-gradient(135deg, rgba(255,255,255,0.16), rgba(255,255,255,0.03))",
            border: "1px solid rgba(255,255,255,0.14)",
            backdropFilter: "blur(12px)",
            boxShadow: "0 8px 20px -4px rgba(0,0,0,0.45)"
          }}
        >
          <div className="absolute top-1 left-1.5 right-1.5 h-[1px] bg-white/25 rounded-full" />
        </motion.div>
      </div>

      {/* Brand & Loading Label */}
      <div className="text-center space-y-1 z-10">
        <h1 className="text-[15px] font-extrabold tracking-[0.25em] uppercase text-[var(--text-primary)] opacity-90">
          Trouvaille
        </h1>
        <p className="text-[11px] font-medium tracking-wide text-[var(--text-tertiary)]">
          {message || "Crafting your finances..."}
        </p>
      </div>
    </div>
  )
}
`;

fs.writeFileSync("src/components/ui/LoadingScreen.tsx", code, "utf8");
console.log("Created src/components/ui/LoadingScreen.tsx");
