import { writeFileSync } from "fs"

// Minimal 1x1 transparent PNG placeholder
const darkPng = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==", "base64")

writeFileSync("public/pwa-192x192.png", darkPng)
writeFileSync("public/pwa-512x512.png", darkPng)
writeFileSync("public/apple-touch-icon.png", darkPng)
console.log("Placeholder icons created")
