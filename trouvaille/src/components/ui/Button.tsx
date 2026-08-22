import { motion } from "framer-motion"
import type { HTMLMotionProps } from "framer-motion"

interface ButtonProps extends HTMLMotionProps<"button"> {
  variant?: "primary" | "ghost" | "glass"
  size?: "sm" | "md" | "lg"
  children: React.ReactNode
}

export function Button({ variant = "primary", size = "md", children, className, style, ...props }: ButtonProps) {
  const baseStyle = variant === "primary"
    ? { background: "var(--ink-primary)", color: "var(--bg-canvas)" }
    : variant === "ghost"
    ? { color: "var(--ink-secondary)", border: "1px solid var(--hairline)" }
    : {}
  const s = { sm: "px-3 py-1.5 text-sm rounded-xl", md: "px-5 py-3 text-base rounded-2xl", lg: "px-6 py-4 text-lg rounded-glass" }
  const v = { primary: "font-semibold", ghost: "bg-transparent", glass: "glass" }
  return (
    <motion.button
      className={"flex items-center justify-center gap-2 " + v[variant] + " " + s[size] + " " + (className ?? "")}
      style={{ ...baseStyle, ...style }}
      whileTap={{ scale: 0.95 }}
      {...props}
    >
      {children}
    </motion.button>
  )
}
