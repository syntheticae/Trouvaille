const fs = require("fs")

// Create minimal valid 1x1 pixel PNG (44 bytes) as placeholder
// Real icons should be generated with a proper tool
const png1x1 = Buffer.from(
  "89504e470d0a1a0a0000000d49484452000000010000000108020000009001" +
  "2e000000034944415408d76360600000000200016eb20e1b0000000049454e44ae426082",
  "hex"
)

// For a 192x192 solid dark PNG, we need a proper PNG
// Use a base64-encoded minimal dark square PNG
// This is a simple 1x1 #17171A PNG
const darkPng = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==", "base64")

fs.writeFileSync("public/pwa-192x192.png", darkPng)
fs.writeFileSync("public/pwa-512x512.png", darkPng)
fs.writeFileSync("public/apple-touch-icon.png", darkPng)
console.log("Placeholder icons created - replace with real icons before deploy")
