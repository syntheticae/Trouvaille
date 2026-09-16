import type { ReactNode } from "react"
import { motion } from "framer-motion"
import type { HTMLMotionProps } from "framer-motion"

interface GlassCardProps extends HTMLMotionProps<"div"> {
  children: ReactNode
  className?: string
}

export function GlassCard({ children, className = "", ...props }: GlassCardProps) {
  return (
    <motion.div 
      className={`glass ${className}`}
      {...props}
    >
      {children}
    </motion.div>
  )
}
