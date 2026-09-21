# Trouvaille Architectural & Design Rules

## 1. Iconography & Visual Aesthetics Rule (STRICT)

> [!IMPORTANT]
> **NO NATIVE COLORED SYSTEM EMOJIS IN THE UI**
> Under no circumstances should native system colored emojis (e.g. 📊, ⚡, 🗓️, 🎯, 🔔, ⏱️, 🥧, 📈, 👥, 📱, etc.) be used as UI icons, dashboard widgets, modal toggles, button icons, or navigation items.

### Icon Guidelines:
- **Vector Icons Only**: Strictly use vector outline/duotone icons from `lucide-react`.
- **Stroke & Scale**: Standard stroke width is `strokeWidth={1.5}` or `strokeWidth={1.75}` with dimensions `14px` to `18px`.
- **Theme Variables**: Icons must inherit theme color variables (`var(--text-primary)`, `var(--text-secondary)`, `var(--text-tertiary)`) or be housed inside frosted squircle containers (`var(--glass-fill)` with `1px solid var(--glass-border)`).
- **Category Exceptions**: Emoji characters are permissible ONLY as user-customizable category avatars via `IconRenderer`, never as hardcoded application controls.

---

## 2. Monochrome Apple Luxury Theme System

- **Palette**: Strictly monochrome luxury glassmorphism.
  - **Dark Mode**: Deep obsidian `#09090c` / `#121214` with frosted white glass borders and accents.
  - **Light Mode**: Clean alabaster smoke `#f4f4f7` / `#ffffff` with matte black and translucent charcoal accents.
  - No vibrant rainbow accents (e.g. bright purple, neon green, orange) on core controls unless representing positive financial inflow (`var(--accent)`).
- **Typography**: Strictly geometric sans-serif (`Urbanist`). Avoid overly bold weights; prefer clean `font-medium`, `font-semibold`, and `font-light` with refined letter spacing.
- **Glassmorphism**: Use backdrop blur (`backdrop-blur-xl`, `backdrop-blur-2xl`), subtle borders (`var(--glass-border)`), and soft elevation shadows (`var(--shadow-card)`).

---

## 3. Modal & Customization Settings Layout Rule (STRICT)

- **Zero Icons / Symbols in Settings Toggles**: In customization lists and settings toggle sheets, do NOT use icons or symbols next to feature names.
- **Hierarchy Structure**:
  - Top Line: Feature Name (`text-[13px] font-semibold text-[var(--text-primary)]`).
  - Second Line: Concise functional description (`text-[11px] text-[var(--text-tertiary)]`).
  - Far Right: High-contrast Apple iOS toggle switch (`w-10 h-5.5` with `w-4.5 h-4.5` knob).
- **Active & Hover Aesthetics**:
  - Do NOT use harsh, thick, stark white outlines on active states.
  - Active ('on') states must use soft ambient frosted glass (`bg-white/[0.05] border border-white/14` with subtle inner hairline glow `inset 0 1px 0 rgba(255,255,255,0.08)` in dark mode, and soft subtle elevation in light mode).
  - Off states must be gently dimmed (`opacity: 0.6`) so active items stand out gracefully.
- **Dynamic Notch & Safe Area**: Ensure all full-screen sheets and story modals account for iOS notch and Dynamic Island safe area insets (`max(calc(env(safe-area-inset-top, 0px) + 12px), 24px)`).

---

## 4. Supabase Database & Schema Migration Rule (STRICT)

> [!IMPORTANT]
> **EXPLICIT SCHEMA NOTIFICATION & SQL INJECTION WORKFLOW**
> Whenever a new feature, data persistence layer, or refactoring requires a new Supabase table, new column, enum, index, or Row Level Security (RLS) policy, the AI must NEVER assume migrations run automatically in the cloud.

### Migration Guidelines:
- **Immediate User Notification**: The AI must proactively and explicitly inform the user whenever any database schema change is needed so that the user can inject it into the Supabase SQL Editor.
- **Provide Ready-to-Run SQL**:
  - Always write an idempotent `.sql` script in `supabase/migrations/` (using `IF NOT EXISTS`, safe column alter checks, indexes, and user-scoped RLS policies).
  - Always provide the full, ready-to-run SQL code block directly in the chat response with copy-paste instructions for the Supabase Dashboard SQL Editor.
- **Graceful Offline / Local Fallbacks**: The frontend code must always include resilient offline/local caching or fallbacks (e.g. `localStorage` or default fallbacks) so the application remains fully functional without crashing even before the user executes the SQL script in Supabase.

