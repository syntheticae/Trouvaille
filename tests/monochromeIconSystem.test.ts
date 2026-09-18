import { describe, it, expect } from "vitest";
import {
  resolveIconComponent,
  autoSuggestIcon,
  ALL_ICONS_MAP,
  CURATED_ICON_GROUPS,
  ALL_CURATED_ICON_NAMES,
  LEGACY_PNG_ICON_MAP,
} from "../src/lib/iconRegistry";
import { getWalletIcon, DEFAULT_WALLETS } from "../src/hooks/useWallets";
import { DEFAULT_CATEGORIES, PARENT_ICON_MAP } from "../src/hooks/useCategories";

describe("Monochrome Vector Icon System & Universal Picker Suite", () => {
  describe("1. Component Resolution & Registration", () => {
    it("resolves exact PascalCase Lucide icon names", () => {
      const Utensils = resolveIconComponent("Utensils");
      expect(Utensils).toBe(ALL_ICONS_MAP["Utensils"]);

      const Wallet = resolveIconComponent("Wallet");
      expect(Wallet).toBe(ALL_ICONS_MAP["Wallet"]);

      const Landmark = resolveIconComponent("Landmark");
      expect(Landmark).toBe(ALL_ICONS_MAP["Landmark"]);

      const Coins = resolveIconComponent("Coins");
      expect(Coins).toBe(ALL_ICONS_MAP["Coins"]);
    });

    it("resolves lowercase or case-insensitive icon names", () => {
      expect(resolveIconComponent("utensils")).toBe(ALL_ICONS_MAP["Utensils"]);
      expect(resolveIconComponent("wallet")).toBe(ALL_ICONS_MAP["Wallet"]);
      expect(resolveIconComponent("LANDMARK")).toBe(ALL_ICONS_MAP["Landmark"]);
    });

    it("resolves null, undefined, or empty string gracefully without throwing", () => {
      expect(resolveIconComponent(null)).toBe(ALL_ICONS_MAP["Tag"]);
      expect(resolveIconComponent(undefined)).toBe(ALL_ICONS_MAP["Tag"]);
      expect(resolveIconComponent("")).toBe(ALL_ICONS_MAP["Tag"]);
      expect(resolveIconComponent("   ")).toBe(ALL_ICONS_MAP["Tag"]);
    });
  });

  describe("2. Backward Compatibility with Legacy 3D PNG Icons", () => {
    it("maps all core legacy PNG paths to clean vector components", () => {
      // Category PNGs
      expect(resolveIconComponent("/icons/makanan.png")).toBe(ALL_ICONS_MAP["Utensils"]);
      expect(resolveIconComponent("/icons/bensin.png")).toBe(ALL_ICONS_MAP["Fuel"]);
      expect(resolveIconComponent("/icons/gaji.png")).toBe(ALL_ICONS_MAP["Briefcase"]);
      expect(resolveIconComponent("/icons/hunian.png")).toBe(ALL_ICONS_MAP["Home"]);
      expect(resolveIconComponent("/icons/fashion.png")).toBe(ALL_ICONS_MAP["Shirt"]);
      expect(resolveIconComponent("/icons/kopi.png")).toBe(ALL_ICONS_MAP["Coffee"]);
      expect(resolveIconComponent("/icons/Groceries.png")).toBe(ALL_ICONS_MAP["ShoppingBag"]);
      expect(resolveIconComponent("/icons/donasi.png")).toBe(ALL_ICONS_MAP["HeartHandshake"]);
      expect(resolveIconComponent("/icons/olahraga.png")).toBe(ALL_ICONS_MAP["Dumbbell"]);
      expect(resolveIconComponent("/icons/hiburan.png")).toBe(ALL_ICONS_MAP["Gamepad2"]);
      expect(resolveIconComponent("/icons/investasi.png")).toBe(ALL_ICONS_MAP["TrendingUp"]);
      expect(resolveIconComponent("/icons/admin.png")).toBe(ALL_ICONS_MAP["Receipt"]);
      expect(resolveIconComponent("/icons/pajak-legal.png")).toBe(ALL_ICONS_MAP["Scale"]);

      // Account & Wallet PNGs
      expect(resolveIconComponent("/icons/Budgets/BCA.png")).toBe(ALL_ICONS_MAP["Landmark"]);
      expect(resolveIconComponent("/icons/Budgets/Mandiri.png")).toBe(ALL_ICONS_MAP["Landmark"]);
      expect(resolveIconComponent("/icons/Budgets/Cash.png")).toBe(ALL_ICONS_MAP["Banknote"]);
      expect(resolveIconComponent("/icons/Budgets/Crypto.png")).toBe(ALL_ICONS_MAP["Coins"]);
      expect(resolveIconComponent("/icons/Budgets/Dana.png")).toBe(ALL_ICONS_MAP["Smartphone"]);
      expect(resolveIconComponent("/icons/Budgets/custom.png")).toBe(ALL_ICONS_MAP["Wallet"]);
      expect(resolveIconComponent("/icons/Budgets/Liabilities.png")).toBe(ALL_ICONS_MAP["Scale"]);
      expect(resolveIconComponent("/icons/Budgets/Piutang.png")).toBe(ALL_ICONS_MAP["HandCoins"]);
    });

    it("maps emoji characters to vector icons", () => {
      expect(resolveIconComponent("🍔")).toBe(ALL_ICONS_MAP["Utensils"]);
      expect(resolveIconComponent("☕")).toBe(ALL_ICONS_MAP["Coffee"]);
      expect(resolveIconComponent("🚗")).toBe(ALL_ICONS_MAP["Car"]);
      expect(resolveIconComponent("💰")).toBe(ALL_ICONS_MAP["Banknote"]);
      expect(resolveIconComponent("🏠")).toBe(ALL_ICONS_MAP["Home"]);
    });
  });

  describe("3. Intelligent Icon Auto-Suggester", () => {
    it("suggests vector icons for Indonesian and English terms", () => {
      expect(autoSuggestIcon("kopi")).toBe("Coffee");
      expect(autoSuggestIcon("ngopi sore")).toBe("Coffee");
      expect(autoSuggestIcon("makan siang")).toBe("Utensils");
      expect(autoSuggestIcon("bensin pertamax")).toBe("Fuel");
      expect(autoSuggestIcon("bca tabungan")).toBe("Landmark");
      expect(autoSuggestIcon("gaji bulanan")).toBe("Briefcase");
      expect(autoSuggestIcon("sewa kost")).toBe("Home");
      expect(autoSuggestIcon("beli pulsa")).toBe("Smartphone");
      expect(autoSuggestIcon("bayar gym")).toBe("Dumbbell");
    });
  });

  describe("4. Curated Icon Library Integrity", () => {
    it("ensures every curated icon exists in ALL_ICONS_MAP", () => {
      for (const name of ALL_CURATED_ICON_NAMES) {
        expect(ALL_ICONS_MAP[name]).toBeDefined();
      }
    });

    it("verifies all curated icon categories have valid icons", () => {
      expect(CURATED_ICON_GROUPS.length).toBeGreaterThanOrEqual(8);
      for (const group of CURATED_ICON_GROUPS) {
        expect(group.icons.length).toBeGreaterThan(0);
        for (const iconName of group.icons) {
          expect(ALL_ICONS_MAP[iconName]).toBeDefined();
        }
      }
    });
  });

  describe("5. Application Invariants & Hooks Compatibility", () => {
    it("getWalletIcon returns valid vector icons for all default wallets", () => {
      for (const walletName of DEFAULT_WALLETS) {
        const iconName = getWalletIcon(walletName);
        expect(ALL_ICONS_MAP[iconName]).toBeDefined();
      }
    });

    it("PARENT_ICON_MAP maps all parent categories to valid vector icons", () => {
      for (const [parent, iconName] of Object.entries(PARENT_ICON_MAP)) {
        expect(ALL_ICONS_MAP[iconName]).toBeDefined();
      }
    });

    it("DEFAULT_CATEGORIES all have valid vector icons that resolve", () => {
      for (const cat of DEFAULT_CATEGORIES) {
        const resolved = resolveIconComponent(cat.emoji);
        expect(resolved).toBeDefined();
        if (cat.emoji !== "Tag") {
          expect(resolved).not.toBe(ALL_ICONS_MAP["Tag"]);
        }
      }
    });
  });
});
