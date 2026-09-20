import { describe, it, expect } from "vitest";
import { INDONESIAN_CARD_PRESETS, type EmoneyCardData } from "../src/components/nfc/NfcCardReaderModal";

describe("Indonesian Contactless E-Money NFC Reader Suite", () => {
  it("provides comprehensive preset coverage for all major Indonesian transit & toll cards", () => {
    const cardTypes = INDONESIAN_CARD_PRESETS.map((c) => c.cardType);
    expect(cardTypes).toContain("flazz");
    expect(cardTypes).toContain("emoney");
    expect(cardTypes).toContain("tapcash");
    expect(cardTypes).toContain("brizzi");
    expect(cardTypes).toContain("jakcard");
  });

  it("validates card integrity and masked UID formatting", () => {
    INDONESIAN_CARD_PRESETS.forEach((card: EmoneyCardData) => {
      expect(card.balance).toBeGreaterThan(0);
      expect(card.issuerName.length).toBeGreaterThan(3);
      expect(card.productName.length).toBeGreaterThan(3);
      expect(card.cardUid.length).toBeGreaterThan(10);
      expect(card.lastTapAmount).toBeGreaterThan(0);
      expect(["mrt", "toll", "bus"]).toContain(card.lastTapTransitType);
    });
  });

  it("includes correct transit operators for Jakarta urban mobility", () => {
    const locations = INDONESIAN_CARD_PRESETS.map((c) => c.lastTapLocation).join(" ");
    expect(locations).toContain("MRT");
    expect(locations).toContain("Tol");
    expect(locations).toContain("TransJakarta");
  });
});
