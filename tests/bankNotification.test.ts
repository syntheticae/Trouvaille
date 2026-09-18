import { describe, it, expect } from "vitest";
import { parseBankNotification } from "../src/lib/bankNotificationParser";
import type { Category, Wallet } from "../src/lib/types";

describe("Bank & E-Wallet Notification Parser Suite", () => {
  const mockCategories: Category[] = [
    { id: "c-food", name: "Makanan", type: "expense", emoji: "🍜" },
    { id: "c-coffee", name: "Kopi", type: "expense", emoji: "☕" },
    { id: "c-transport", name: "Transport", type: "expense", emoji: "🚗" },
    { id: "c-bills", name: "Tagihan", type: "expense", emoji: "💡" },
  ];

  const mockWallets: Wallet[] = [
    { id: "w-bca", name: "BCA", type: "bank", balance: 1000000 },
    { id: "w-gopay", name: "GoPay", type: "ewallet", balance: 500000 },
    { id: "w-livin", name: "Mandiri Livin", type: "bank", balance: 750000 },
  ];

  it("parses BCA transfer notification successfully", () => {
    const raw = "BCA: Transfer berhasil ke REK 123456 Rp 50.000 untuk Kopi Kenangan";
    const res = parseBankNotification(raw, mockCategories, mockWallets);

    expect(res).not.toBeNull();
    expect(res?.sourceApp).toBe("BCA");
    expect(res?.amount).toBe(50000);
    expect(res?.suggestedWalletId).toBe("w-bca");
    expect(res?.type).toBe("expense");
  });

  it("parses QRIS payment notification successfully", () => {
    const raw = "Pembayaran QRIS Rp 35.000 di Alfamart berhasil";
    const res = parseBankNotification(raw, mockCategories, mockWallets);

    expect(res).not.toBeNull();
    expect(res?.sourceApp).toBe("QRIS");
    expect(res?.amount).toBe(35000);
    expect(res?.type).toBe("expense");
  });

  it("parses GoPay notification with coffee merchant", () => {
    const raw = "Kamu telah bayar Rp 45.000 ke Fore Coffee via GoPay";
    const res = parseBankNotification(raw, mockCategories, mockWallets);

    expect(res).not.toBeNull();
    expect(res?.sourceApp).toBe("GoPay");
    expect(res?.amount).toBe(45000);
    expect(res?.suggestedWalletId).toBe("w-gopay");
    expect(res?.type).toBe("expense");
  });

  it("parses Mandiri Livin bill payment", () => {
    const raw = "Livin by Mandiri: Pembayaran sukses Rp 150.000 PLN Listrik";
    const res = parseBankNotification(raw, mockCategories, mockWallets);

    expect(res).not.toBeNull();
    expect(res?.sourceApp).toBe("Mandiri Livin");
    expect(res?.amount).toBe(150000);
    expect(res?.suggestedWalletId).toBe("w-livin");
  });

  it("ignores non-financial text", () => {
    const raw = "Halo apa kabar besok kita ketemu ya";
    const res = parseBankNotification(raw, mockCategories, mockWallets);
    expect(res).toBeNull();
  });
});
