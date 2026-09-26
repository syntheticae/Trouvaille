import React from "react";
import { Users, Layers, Minus, Plus } from "lucide-react";
import { formatRupiah } from "../../lib/utils";
import { triggerHaptic } from "../../lib/haptics";
import type { Category, Wallet } from "../../lib/types";
import { useLanguage } from "../../contexts/LanguageContext";

export interface SplitTransactionSectionProps {
  splitMode: "friends" | "categories";
  setSplitMode: (m: "friends" | "categories") => void;
  splitFriendType: "equal" | "custom";
  setSplitFriendType: (t: "equal" | "custom") => void;
  peopleCount: number;
  setPeopleCount: React.Dispatch<React.SetStateAction<number>>;
  friendNames: string;
  setFriendNames: (names: string) => void;
  customMyShare: number;
  setCustomMyShare: (n: number) => void;
  totalAmountNum: number;
  wallets: Wallet[];
  categories: Category[];
  categoryId: string | null;
  itemCatId2: string | null;
  setItemCatId2: (id: string) => void;
  cat1Share: number;
  cat2Share: number;
  setItemAmount1: (amount: number) => void;
  myShareFriends: number;
  friendsShare: number;
}

export function SplitTransactionSection({
  splitMode,
  setSplitMode,
  splitFriendType,
  setSplitFriendType,
  peopleCount,
  setPeopleCount,
  friendNames,
  setFriendNames,
  customMyShare,
  setCustomMyShare,
  totalAmountNum,
  categories,
  categoryId,
  itemCatId2,
  setItemCatId2,
  cat1Share,
  cat2Share,
  setItemAmount1,
  myShareFriends,
  friendsShare,
}: SplitTransactionSectionProps) {
  const { isIndonesian } = useLanguage();

  return (
    <div className="mb-3">
      <div className="flex justify-between items-center mb-1.5 px-1">
        <span
          className="text-[11px] font-semibold uppercase tracking-wider"
          style={{ color: "var(--text-tertiary)" }}
        >
          {isIndonesian ? "Konfigurasi Bagi Tagihan" : "Split Configuration"}
        </span>
        <span
          className="text-[10px] font-semibold"
          style={{ color: "var(--text-secondary)" }}
        >
          {splitMode === "friends"
            ? `${peopleCount} ${isIndonesian ? "Orang" : "People"}`
            : isIndonesian
              ? "Multi-Kategori"
              : "Multi-Category"}
        </span>
      </div>

      <div
        className="rounded-2xl p-3.5 transition-all select-none"
        style={{
          background: "var(--bg-elevated)",
          border: "1px solid var(--glass-border)",
        }}
      >
        <div className="space-y-3">
          {/* Sub-mode tabs */}
          <div
            className="flex p-1 rounded-xl glass-surface"
            style={{ background: "var(--glass-fill)" }}
          >
            <button
              type="button"
              onClick={() => {
                setSplitMode("friends");
                triggerHaptic("light");
              }}
              className="flex-1 py-1.5 rounded-lg text-[11px] font-semibold flex items-center justify-center gap-1.5 transition-all"
              style={{
                background:
                  splitMode === "friends"
                    ? "var(--bg-elevated)"
                    : "transparent",
                color:
                  splitMode === "friends"
                    ? "var(--text-primary)"
                    : "var(--text-secondary)",
                boxShadow:
                  splitMode === "friends"
                    ? "var(--shadow-card)"
                    : "none",
              }}
            >
              <Users size={12} />
              {isIndonesian ? "Bagi Bersama Teman" : "Split with Friends"}
            </button>
            <button
              type="button"
              onClick={() => {
                setSplitMode("categories");
                triggerHaptic("light");
              }}
              className="flex-1 py-1.5 rounded-lg text-[11px] font-semibold flex items-center justify-center gap-1.5 transition-all"
              style={{
                background:
                  splitMode === "categories"
                    ? "var(--bg-elevated)"
                    : "transparent",
                color:
                  splitMode === "categories"
                    ? "var(--text-primary)"
                    : "var(--text-secondary)",
                boxShadow:
                  splitMode === "categories"
                    ? "var(--shadow-card)"
                    : "none",
              }}
            >
              <Layers size={12} />
              {isIndonesian ? "Multi-Kategori" : "Multi-Category"}
            </button>
          </div>

          {splitMode === "friends" ? (
            <div className="space-y-3">
              {/* Equal vs Custom Split Toggle */}
              <div
                className="flex p-0.5 rounded-xl border border-[var(--glass-border)]"
                style={{ background: "var(--glass-fill)" }}
              >
                <button
                  type="button"
                  onClick={() => {
                    setSplitFriendType("equal");
                    triggerHaptic("light");
                  }}
                  className="flex-1 py-1.5 rounded-lg text-[11px] font-semibold transition-all"
                  style={{
                    background:
                      splitFriendType === "equal"
                        ? "var(--bg-elevated)"
                        : "transparent",
                    color:
                      splitFriendType === "equal"
                        ? "var(--text-primary)"
                        : "var(--text-tertiary)",
                  }}
                >
                  {isIndonesian ? "Bagi Rata" : "Split Equally"}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setSplitFriendType("custom");
                    if (customMyShare === 0 && totalAmountNum > 0) {
                      setCustomMyShare(Math.round(totalAmountNum / 2));
                    }
                    triggerHaptic("light");
                  }}
                  className="flex-1 py-1.5 rounded-lg text-[11px] font-semibold transition-all"
                  style={{
                    background:
                      splitFriendType === "custom"
                        ? "var(--bg-elevated)"
                        : "transparent",
                    color:
                      splitFriendType === "custom"
                        ? "var(--text-primary)"
                        : "var(--text-tertiary)",
                  }}
                >
                  {isIndonesian ? "Bagi Kustom" : "Custom Share"}
                </button>
              </div>

              {/* People & Name Selection */}
              <div className="flex items-center justify-between">
                <span
                  className="text-[11px] font-semibold"
                  style={{ color: "var(--text-secondary)" }}
                >
                  {isIndonesian ? "Jumlah Orang" : "Total People"}
                </span>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      if (peopleCount > 2) {
                        setPeopleCount((p) => p - 1);
                        triggerHaptic("light");
                      }
                    }}
                    disabled={peopleCount <= 2}
                    className="w-7 h-7 rounded-xl flex items-center justify-center active:scale-95 disabled:opacity-30 cursor-pointer"
                    style={{
                      background: "var(--glass-fill)",
                      border: "1px solid var(--glass-border)",
                      color: "var(--text-primary)",
                    }}
                  >
                    <Minus size={12} />
                  </button>
                  <span
                    className="text-[12px] font-semibold px-1"
                    style={{ color: "var(--text-primary)" }}
                  >
                    {peopleCount} {isIndonesian ? "Orang" : "People"}
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      if (peopleCount < 15) {
                        setPeopleCount((p) => p + 1);
                        triggerHaptic("light");
                      }
                    }}
                    disabled={peopleCount >= 15}
                    className="w-7 h-7 rounded-xl flex items-center justify-center active:scale-95 disabled:opacity-30 cursor-pointer"
                    style={{
                      background: "var(--glass-fill)",
                      border: "1px solid var(--glass-border)",
                      color: "var(--text-primary)",
                    }}
                  >
                    <Plus size={12} />
                  </button>
                </div>
              </div>

              {/* Friend Names Input */}
              <div
                className="rounded-xl px-3 py-2"
                style={{
                  background: "var(--glass-fill)",
                  border: "1px solid var(--glass-border)",
                }}
              >
                <input
                  type="text"
                  value={friendNames}
                  onChange={(e) => setFriendNames(e.target.value)}
                  placeholder={isIndonesian ? "Nama teman (cth. Alex, Sam)" : "Friend names (e.g. Alex, Sam)"}
                  className="bg-transparent text-[12px] font-medium w-full outline-none"
                  style={{
                    color: "var(--text-primary)",
                    fontFamily: "Urbanist, sans-serif",
                  }}
                />
              </div>

              {/* Custom Share Numeric Input & Percentage Quick Chips */}
              {splitFriendType === "custom" && (
                <div className="space-y-2 pt-1">
                  <div className="flex items-center justify-between text-[11px]">
                    <span
                      className="font-medium"
                      style={{ color: "var(--text-secondary)" }}
                    >
                      {isIndonesian ? "Bagian Anda" : "Your Personal Share"}
                    </span>
                    <span
                      className="text-[10px] font-semibold px-2 py-0.5 rounded-full border border-[var(--glass-border)]"
                      style={{
                        background: "var(--glass-fill)",
                        color: "var(--text-primary)",
                      }}
                    >
                      {totalAmountNum > 0
                        ? `${Math.round((myShareFriends / totalAmountNum) * 100)}%`
                        : "0%"}
                    </span>
                  </div>

                  <div
                    className="flex items-center gap-2 rounded-xl px-3 py-2"
                    style={{
                      background: "var(--glass-fill)",
                      border: "1px solid var(--glass-border)",
                    }}
                  >
                    <span
                      className="text-[12px] font-semibold"
                      style={{ color: "var(--text-tertiary)" }}
                    >
                      Rp
                    </span>
                    <input
                      type="number"
                      inputMode="numeric"
                      pattern="[0-9]*"
                      value={customMyShare === 0 ? "" : customMyShare}
                      onChange={(e) => {
                        const val = Math.max(
                          0,
                          Math.min(
                            totalAmountNum,
                            Number(e.target.value) || 0,
                          ),
                        );
                        setCustomMyShare(val);
                      }}
                      placeholder={isIndonesian ? "Masukkan bagian Anda..." : "Enter your share..."}
                      className="bg-transparent text-[13px] font-semibold w-full outline-none amount"
                      style={{ color: "var(--text-primary)" }}
                    />
                  </div>

                  {/* Quick Percentage Chips */}
                  <div className="flex gap-1.5">
                    {[
                      { label: "25%", ratio: 0.25 },
                      { label: "33%", ratio: 1 / 3 },
                      { label: "50%", ratio: 0.5 },
                      { label: "66%", ratio: 2 / 3 },
                      { label: "75%", ratio: 0.75 },
                    ].map((chip) => (
                      <button
                        key={chip.label}
                        type="button"
                        onClick={() => {
                          setCustomMyShare(
                            Math.round(totalAmountNum * chip.ratio),
                          );
                          triggerHaptic("light");
                        }}
                        className="flex-1 py-1 rounded-lg text-[10px] font-semibold transition-all active:scale-95 cursor-pointer"
                        style={{
                          background: "var(--glass-fill)",
                          border: "1px solid var(--glass-border)",
                          color: "var(--text-secondary)",
                        }}
                      >
                        {chip.label}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Proportional Monochrome Distribution Bar */}
              {totalAmountNum > 0 && (
                <div className="space-y-1.5 pt-1">
                  <div
                    className="h-1 rounded-full overflow-hidden flex"
                    style={{ background: "var(--glass-fill)" }}
                  >
                    <div
                      className="h-full transition-all duration-300"
                      style={{
                        width: `${Math.max(
                          0,
                          Math.min(
                            100,
                            (myShareFriends / totalAmountNum) * 100,
                          ),
                        )}%`,
                        background: "var(--text-primary)",
                      }}
                    />
                    <div
                      className="h-full transition-all duration-300"
                      style={{
                        width: `${Math.max(
                          0,
                          Math.min(
                            100,
                            (friendsShare / totalAmountNum) * 100,
                          ),
                        )}%`,
                        background: "var(--text-tertiary)",
                        opacity: 0.35,
                      }}
                    />
                  </div>
                  <div className="flex justify-between text-[9px] font-medium text-[var(--text-tertiary)]">
                    <span>
                      {isIndonesian ? "Bagian Anda:" : "Your Share:"}{" "}
                      {Math.round((myShareFriends / totalAmountNum) * 100)}
                      %
                    </span>
                    <span>
                      {isIndonesian ? "Bagian Teman:" : "Friends' Share:"}{" "}
                      {Math.round((friendsShare / totalAmountNum) * 100)}%
                    </span>
                  </div>
                </div>
              )}

              {/* Dual Result Summary Cards - Monochrome Minimalist */}
              <div className="grid grid-cols-2 gap-2 pt-1">
                <div
                  className="p-3 rounded-2xl space-y-0.5 border border-[var(--glass-border)]"
                  style={{ background: "var(--glass-fill)" }}
                >
                  <p
                    className="text-[9px] font-semibold uppercase tracking-wider text-[var(--text-tertiary)]"
                  >
                    {isIndonesian ? "Bagian Anda" : "Your Share"}
                  </p>
                  <p
                    className="text-[13px] font-semibold amount"
                    style={{ color: "var(--text-primary)" }}
                  >
                    {formatRupiah(myShareFriends)}
                  </p>
                  <p
                    className="text-[10px]"
                    style={{ color: "var(--text-tertiary)" }}
                  >
                    {isIndonesian ? "Pengeluaran Pribadi" : "Personal Expense"}
                  </p>
                </div>
                <div
                  className="p-3 rounded-2xl space-y-0.5 border border-[var(--glass-border)]"
                  style={{ background: "var(--glass-fill)" }}
                >
                  <p
                    className="text-[9px] font-semibold uppercase tracking-wider text-[var(--text-tertiary)]"
                  >
                    {isIndonesian ? "Bagian Teman" : "Friends' Share"}
                  </p>
                  <p
                    className="text-[13px] font-semibold amount"
                    style={{ color: "var(--text-primary)" }}
                  >
                    {formatRupiah(friendsShare)}
                  </p>
                  <p
                    className="text-[10px]"
                    style={{ color: "var(--text-tertiary)" }}
                  >
                    {isIndonesian
                      ? `Piutang (${peopleCount - 1} teman${
                          peopleCount > 2
                            ? ` · ~${formatRupiah(Math.round(friendsShare / (peopleCount - 1)))}/org`
                            : ""
                        })`
                      : `Receivable (${peopleCount - 1} friend${
                          peopleCount - 1 > 1 ? "s" : ""
                        }${
                          peopleCount > 2
                            ? ` · ~${formatRupiah(Math.round(friendsShare / (peopleCount - 1)))}/ea`
                            : ""
                        })`}
                  </p>
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-2.5">
              <div className="grid grid-cols-2 gap-2">
                <div
                  className="p-2.5 rounded-xl space-y-1"
                  style={{ background: "var(--glass-fill)" }}
                >
                  <span
                    className="text-[9px] font-semibold uppercase tracking-wider"
                    style={{ color: "var(--text-tertiary)" }}
                  >
                    {isIndonesian ? "Bagian 1 (Utama)" : "Part 1 (Primary)"}
                  </span>
                  <p
                    className="text-[13px] font-semibold amount"
                    style={{ color: "var(--text-primary)" }}
                  >
                    {formatRupiah(cat1Share)}
                  </p>
                  <span
                    className="text-[10px] font-semibold block truncate"
                    style={{ color: "var(--text-secondary)" }}
                  >
                    {categories.find((c) => c.id === categoryId)?.name ||
                      (isIndonesian ? "Kategori Utama" : "Primary Category")}
                  </span>
                </div>

                <div
                  className="p-2.5 rounded-xl space-y-1"
                  style={{ background: "var(--glass-fill)" }}
                >
                  <div className="flex justify-between items-center">
                    <span
                      className="text-[9px] font-semibold uppercase tracking-wider"
                      style={{ color: "var(--text-tertiary)" }}
                    >
                      {isIndonesian ? "Bagian 2" : "Part 2"}
                    </span>
                    <select
                      value={itemCatId2 || ""}
                      onChange={(e) => setItemCatId2(e.target.value)}
                      className="bg-transparent text-[10px] font-semibold outline-none"
                      style={{ color: "var(--text-primary)" }}
                    >
                      {categories.map((c) => (
                        <option
                          key={c.id}
                          value={c.id}
                          style={{ background: "#18181B", color: "#fff" }}
                        >
                          {c.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <p
                    className="text-[13px] font-semibold amount"
                    style={{ color: "var(--text-primary)" }}
                  >
                    {formatRupiah(cat2Share)}
                  </p>
                  <span
                    className="text-[10px] font-semibold block truncate"
                    style={{ color: "var(--text-secondary)" }}
                  >
                    {categories.find(
                      (c) =>
                        c.id ===
                        (itemCatId2 ||
                          (categories[1] ? categories[1].id : categoryId)),
                    )?.name || (isIndonesian ? "Kategori Sekunder" : "Secondary Category")}
                  </span>
                </div>
              </div>

              {totalAmountNum > 0 && (
                <input
                  type="range"
                  min="0"
                  max={totalAmountNum}
                  step={Math.max(1000, Math.round(totalAmountNum / 100))}
                  value={cat1Share}
                  onChange={(e) => setItemAmount1(Number(e.target.value))}
                  className="w-full accent-white cursor-pointer"
                />
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
