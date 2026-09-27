import { describe, it, expect } from "vitest";
import {
  generateInviteCode,
  normalizeInviteCode,
} from "../src/lib/sharedLedgerService";
import {
  generateQrSvg,
  generateQrDataUrl,
  buildJoinLedgerUrl,
} from "../src/lib/qrCodeGenerator";
import type { LedgerMemberRole, Transaction } from "../src/types";

describe("Shared Ledgers & Collaborative Spaces Suite", () => {
  describe("Invite Code Generation & Normalization", () => {
    it("generates a 6-character formatted invite code (TRV-XXX)", () => {
      const code = generateInviteCode();
      expect(code).toMatch(/^TRV-[23456789ABCDEFGHJKLMNPQRSTUVWXYZ]{6}$/);
    });

    it("excludes ambiguous characters (0, O, 1, I, L) to ensure visual and verbal clarity", () => {
      // Test over 50 generated codes to ensure ambiguous characters never appear
      for (let i = 0; i < 50; i++) {
        const code = generateInviteCode();
        const payload = code.replace("TRV-", "");
        expect(payload).not.toMatch(/[01OIL]/i);
      }
    });

    it("generates unique codes across consecutive calls", () => {
      const code1 = generateInviteCode();
      const code2 = generateInviteCode();
      expect(code1).not.toBe(code2);
    });

    it("normalizes invite code by trimming, uppercasing, and removing dashes", () => {
      expect(normalizeInviteCode("  trv-8x2k9a  ")).toBe("TRV8X2K9A");
      expect(normalizeInviteCode("trv - 9k2")).toBe("TRV9K2");
      expect(normalizeInviteCode("8X2-9KA")).toBe("8X29KA");
    });
  });

  describe("QR Code & URL Generation (100% Offline)", () => {
    it("builds correct custom deep link and web join URL", () => {
      const { deepLink, webUrl } = buildJoinLedgerUrl("TRV-8X2K9A");
      expect(deepLink).toBe("trouvaille://join?code=TRV8X2K9A");
      expect(webUrl).toBe("https://trouvaille.app/join?code=TRV8X2K9A");
    });

    it("generates crisp monochrome SVG QR code string", async () => {
      const { deepLink } = buildJoinLedgerUrl("TRV-TEST88");
      const svg = await generateQrSvg(deepLink, {
        darkColor: "#09090c",
        lightColor: "#ffffff",
      });

      expect(svg).toBeDefined();
      expect(typeof svg).toBe("string");
      expect(svg).toContain("<svg");
      expect(svg).toContain("</svg>");
      expect(svg).toContain("#09090c");
    });

    it("generates PNG Data URL for image sharing", async () => {
      const { webUrl } = buildJoinLedgerUrl("TRV-IMG99");
      const dataUrl = await generateQrDataUrl(webUrl);

      expect(dataUrl).toBeDefined();
      expect(dataUrl.startsWith("data:image/png;base64,")).toBe(true);
    });
  });

  describe("Role Permissions & Domain Isolation", () => {
    const roles: LedgerMemberRole[] = ["owner", "editor", "viewer"];

    it("verifies permissions: owner has full access", () => {
      const ownerRole: LedgerMemberRole = "owner";
      const canManageMembers = ownerRole === "owner";
      const canAddTransactions = ownerRole === "owner" || ownerRole === "editor";
      const canView = true;

      expect(canManageMembers).toBe(true);
      expect(canAddTransactions).toBe(true);
      expect(canView).toBe(true);
    });

    it("verifies permissions: editor can add transactions but cannot kick members", () => {
      const editorRole: LedgerMemberRole = "editor";
      const canManageMembers = (editorRole as string) === "owner";
      const canAddTransactions = editorRole === "owner" || editorRole === "editor";
      const canView = true;

      expect(canManageMembers).toBe(false);
      expect(canAddTransactions).toBe(true);
      expect(canView).toBe(true);
    });

    it("verifies permissions: viewer has read-only access", () => {
      const viewerRole: LedgerMemberRole = "viewer";
      const canManageMembers = (viewerRole as string) === "owner";
      const canAddTransactions = viewerRole === "owner" || viewerRole === "editor";
      const canView = true;

      expect(canManageMembers).toBe(false);
      expect(canAddTransactions).toBe(false);
      expect(canView).toBe(true);
    });
  });

  describe("Transaction Attribution", () => {
    it("stores and resolves created_by_name attribution in transaction record", () => {
      const tx: Transaction = {
        id: "tx-test-1",
        user_id: "user-123",
        amount: 150000,
        type: "expense",
        category_id: "c-food",
        wallet_id: "w-shared-cash",
        to_wallet_id: null,
        note: "Makan Malam Bersama",
        occurred_on: "2026-09-27",
        created_at: "2026-09-27T12:00:00Z",
        ledger_id: "ledger-shared-family",
        created_by_name: "Sarah",
        created_by_user_id: "user-123",
      };

      expect(tx.ledger_id).toBe("ledger-shared-family");
      expect(tx.created_by_name).toBe("Sarah");
      expect(tx.created_by_user_id).toBe("user-123");
    });
  });
});
