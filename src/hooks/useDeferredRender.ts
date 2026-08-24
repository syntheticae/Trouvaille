import { useState, useEffect } from 'react'

/**
 * A hook that delays the rendering of heavy components until after page transition animations complete.
 * This prevents main-thread jank when using framer-motion for page transitions.
 * @param delayMs Delay in milliseconds before rendering (default: 150ms - typical transition duration)
 */
export function useDeferredRender(delayMs = 150) {
  const [shouldRender, setShouldRender] = useState(false)

  useEffect(() => {
    const timer = setTimeout(() => {
      setShouldRender(true)
    }, delayMs)

    return () => clearTimeout(timer)
  }, [delayMs])

  return shouldRender
}
