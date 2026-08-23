const fs = require("fs");

const code = `import { Haptics, ImpactStyle } from "@capacitor/haptics"

export const triggerHaptic = async (style: "light" | "medium" | "heavy" = "light") => {
  try {
    const impactStyle =
      style === "heavy"
        ? ImpactStyle.Heavy
        : style === "medium"
        ? ImpactStyle.Medium
        : ImpactStyle.Light
    await Haptics.impact({ style: impactStyle })
  } catch {
    // Web fallback if supported
    if (typeof navigator !== "undefined" && navigator.vibrate) {
      navigator.vibrate(style === "heavy" ? 25 : style === "medium" ? 15 : 8)
    }
  }
}

export const triggerSuccessHaptic = async () => {
  try {
    await Haptics.notification({ type: "success" as any })
  } catch {
    if (typeof navigator !== "undefined" && navigator.vibrate) {
      navigator.vibrate([10, 30, 15])
    }
  }
}
`;

fs.writeFileSync("src/lib/haptics.ts", code, "utf8");
console.log("Created src/lib/haptics.ts");
