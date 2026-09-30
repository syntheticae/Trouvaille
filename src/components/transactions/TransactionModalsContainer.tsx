import React, { memo } from "react";
import { Check, Wallet } from "lucide-react";
import { format, parseISO } from "date-fns";
import { BottomSheet } from "../ui/BottomSheet";
import { IconRenderer } from "../ui/IconRenderer";
import { TransactionSheet } from "./TransactionSheet";
import { triggerHaptic } from "../../lib/haptics";
import type { Transaction, Category, Wallet as WalletType } from "../../lib/types";
import type { FilterType, TimeRangeType } from "./TransactionHorizonBarChart";

export interface TransactionModalsContainerProps {
  // Month & Year Picker
  monthPickerOpen: boolean;
  onCloseMonthPicker: () => void;
  timeRange: TimeRangeType;
  setTimeRange: (range: TimeRangeType) => void;
  pickerYear: number;
  setPickerYear: (year: number) => void;
  selectedCustomMonth: string;
  setSelectedCustomMonth: (month: string) => void;
  monthsList: { code: string; short: string; full: string }[];

  // Account Picker
  accountPickerOpen: boolean;
  onCloseAccountPicker: () => void;
  selectedWalletName: string | null;
  setSelectedWalletName: (name: string | null) => void;
  wallets: WalletType[];

  // Advanced Filters
  filterSheetOpen: boolean;
  onCloseFilterSheet: () => void;
  activeFiltersCount: number;
  onResetAllFilters: () => void;
  filter: FilterType;
  setFilter: (type: FilterType) => void;
  filterTabs: { key: FilterType; label: string }[];
  customStartDate: string;
  setCustomStartDate: (date: string) => void;
  customEndDate: string;
  setCustomEndDate: (date: string) => void;
  categories: Category[];
  selectedCategoryIds: string[];
  setSelectedCategoryIds: React.Dispatch<React.SetStateAction<string[]>>;
  minAmount: string;
  setMinAmount: (amt: string) => void;
  maxAmount: string;
  setMaxAmount: (amt: string) => void;
  filteredTxsCount: number;

  // Universal Transaction Sheet
  sheetOpen: boolean;
  onCloseSheet: () => void;
  editingTx: Transaction | null;
  onOpenScan?: () => void;
  onOpenVoiceAdd?: () => void;

  isIndonesian: boolean;
}

export const TransactionModalsContainer = memo(function TransactionModalsContainer({
  monthPickerOpen,
  onCloseMonthPicker,
  timeRange,
  setTimeRange,
  pickerYear,
  setPickerYear,
  selectedCustomMonth,
  setSelectedCustomMonth,
  monthsList,
  accountPickerOpen,
  onCloseAccountPicker,
  selectedWalletName,
  setSelectedWalletName,
  wallets,
  filterSheetOpen,
  onCloseFilterSheet,
  activeFiltersCount,
  onResetAllFilters,
  filter,
  setFilter,
  filterTabs,
  customStartDate,
  setCustomStartDate,
  customEndDate,
  setCustomEndDate,
  categories,
  selectedCategoryIds,
  setSelectedCategoryIds,
  minAmount,
  setMinAmount,
  maxAmount,
  setMaxAmount,
  filteredTxsCount,
  sheetOpen,
  onCloseSheet,
  editingTx,
  onOpenScan,
  onOpenVoiceAdd,
  isIndonesian,
}: TransactionModalsContainerProps) {
  return (
    <>
      {/* ====== 12-MONTH & YEAR SELECTOR BOTTOM SHEET ====== */}
      <BottomSheet
        isOpen={monthPickerOpen}
        onClose={onCloseMonthPicker}
      >
        <div className="p-5 pb-16 space-y-4">
          <div className="flex justify-between items-center mb-1">
            <div>
              <h3
                className="font-semibold text-base"
                style={{ color: "var(--text-primary)" }}
              >
                {isIndonesian ? "Pilih Rentang Waktu" : "Select Timeframe"}
              </h3>
              <p
                className="text-[11px] font-medium"
                style={{ color: "var(--text-tertiary)" }}
              >
                {isIndonesian
                  ? "Filter transaksi berdasarkan bulan atau tahun"
                  : "Filter transactions by month or year"}
              </p>
            </div>
          </div>

          {/* Quick Presets */}
          <div className="grid grid-cols-2 gap-2">
            {[
              { key: "this_month", label: isIndonesian ? "Bulan Ini" : "This Month" },
              { key: "last_month", label: isIndonesian ? "Bulan Lalu" : "Last Month" },
              { key: "last_30", label: isIndonesian ? "30 Hari Terakhir" : "Last 30 Days" },
              { key: "all", label: isIndonesian ? "Semua Waktu" : "All Time" },
            ].map((preset) => {
              const isSelected = timeRange === preset.key;
              return (
                <button
                  key={preset.key}
                  type="button"
                  onClick={() => {
                    setTimeRange(preset.key as TimeRangeType);
                    onCloseMonthPicker();
                    triggerHaptic("light");
                  }}
                  className="py-2.5 px-3 rounded-2xl text-[12px] font-semibold flex items-center justify-between active:scale-95 transition-all touch-manipulation cursor-pointer select-none"
                  style={{
                    background: isSelected
                      ? "var(--accent)"
                      : "var(--bg-elevated)",
                    color: isSelected
                      ? "var(--accent-ink)"
                      : "var(--text-primary)",
                    border: isSelected
                      ? "1px solid transparent"
                      : "1px solid var(--glass-border)",
                  }}
                >
                  <span>{preset.label}</span>
                  {isSelected && <Check size={12} strokeWidth={2.5} />}
                </button>
              );
            })}
          </div>

          {/* Elegant Year Selector Tabs */}
          <div className="pt-2">
            <div className="flex justify-between items-center mb-2 px-1">
              <span
                className="text-[11px] font-semibold uppercase tracking-wider"
                style={{ color: "var(--text-tertiary)" }}
              >
                {isIndonesian ? "Pilih Bulan dalam Tahun" : "Specific Month in Year"}
              </span>
              <span
                className="text-[12px] font-semibold"
                style={{ color: "var(--text-primary)" }}
              >
                {pickerYear}
              </span>
            </div>

            {/* Year Selector Bar */}
            <div
              className="flex p-1 rounded-2xl mb-3"
              style={{
                background: "var(--bg-elevated)",
                border: "1px solid var(--glass-border)",
              }}
            >
              {[2026, 2025, 2024, 2023].map((y) => {
                const isYSelected = pickerYear === y;
                return (
                  <button
                    key={y}
                    type="button"
                    onClick={() => {
                      setPickerYear(y);
                      triggerHaptic("light");
                    }}
                    className="flex-1 py-1.5 rounded-xl text-[12px] font-semibold transition-all touch-manipulation cursor-pointer select-none"
                    style={{
                      background: isYSelected ? "var(--accent)" : "transparent",
                      color: isYSelected
                        ? "var(--accent-ink)"
                        : "var(--text-secondary)",
                    }}
                  >
                    {y}
                  </button>
                );
              })}
            </div>

            {/* 12-Month iOS Grid */}
            <div className="grid grid-cols-4 gap-2">
              {monthsList.map((m) => {
                const monthKey = `${pickerYear}-${m.code}`;
                const isSelected =
                  timeRange === "custom_month" &&
                  selectedCustomMonth === monthKey;
                return (
                  <button
                    key={m.code}
                    type="button"
                    onClick={() => {
                      setSelectedCustomMonth(monthKey);
                      setTimeRange("custom_month");
                      onCloseMonthPicker();
                      triggerHaptic("light");
                    }}
                    className="p-3 rounded-2xl text-[12px] font-semibold text-center active:scale-95 transition-all touch-manipulation cursor-pointer select-none"
                    style={{
                      background: isSelected
                        ? "var(--accent)"
                        : "var(--bg-elevated)",
                      color: isSelected
                        ? "var(--accent-ink)"
                        : "var(--text-primary)",
                      border: isSelected
                        ? "1.5px solid var(--accent)"
                        : "1px solid var(--glass-border)",
                      boxShadow: isSelected
                        ? "0 0 0 1px var(--accent-glow)"
                        : "none",
                    }}
                  >
                    {m.short}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </BottomSheet>

      {/* Account Picker Glass Sheet */}
      <BottomSheet
        isOpen={accountPickerOpen}
        onClose={onCloseAccountPicker}
      >
        <div className="p-5 pb-12 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3
                className="font-semibold text-base"
                style={{ color: "var(--text-primary)" }}
              >
                {isIndonesian ? "Filter Berdasarkan Rekening" : "Filter by Account"}
              </h3>
              <p
                className="text-[12px]"
                style={{ color: "var(--text-tertiary)" }}
              >
                {isIndonesian
                  ? "Tampilkan transaksi dari akun atau dompet tertentu"
                  : "Show transactions from a specific account"}
              </p>
            </div>
            {selectedWalletName && (
              <button
                type="button"
                onClick={() => {
                  setSelectedWalletName(null);
                  onCloseAccountPicker();
                  triggerHaptic("light");
                }}
                className="text-[12px] font-bold px-3 py-1 rounded-full touch-manipulation cursor-pointer select-none"
                style={{
                  background: "var(--glass-fill)",
                  color: "var(--text-secondary)",
                }}
              >
                {isIndonesian ? "Atur Ulang" : "Reset"}
              </button>
            )}
          </div>

          <div className="grid grid-cols-3 gap-x-2 gap-y-2.5">
            {/* All Accounts Option */}
            <button
              type="button"
              onClick={() => {
                setSelectedWalletName(null);
                onCloseAccountPicker();
                triggerHaptic("light");
              }}
              className="flex flex-col items-center gap-1.5 p-2 rounded-2xl active:scale-95 transition-transform touch-manipulation cursor-pointer select-none"
              style={{
                background:
                  selectedWalletName === null
                    ? "var(--glass-fill-strong)"
                    : "transparent",
                color: "var(--text-primary)",
                border:
                  selectedWalletName === null
                    ? "1.5px solid var(--accent)"
                    : "1px solid transparent",
              }}
            >
              <div
                className="w-10 h-10 rounded-xl flex items-center justify-center"
                style={{
                  background:
                    selectedWalletName === null
                      ? "var(--dock-active-pill)"
                      : "var(--bg-elevated)",
                  border: "1px solid var(--glass-border)",
                }}
              >
                <Wallet size={18} style={{ color: "var(--text-primary)" }} />
              </div>
              <span className="text-[11px] font-bold text-center line-clamp-1">
                {isIndonesian ? "Semua Akun" : "All Accounts"}
              </span>
            </button>

            {/* Wallets */}
            {wallets.map((w) => {
              const isSelected = selectedWalletName === w.name;
              return (
                <button
                  key={w.id}
                  type="button"
                  onClick={() => {
                    setSelectedWalletName(w.name);
                    onCloseAccountPicker();
                    triggerHaptic("light");
                  }}
                  className="flex flex-col items-center gap-1.5 p-2 rounded-2xl active:scale-95 transition-transform touch-manipulation cursor-pointer select-none"
                  style={{
                    background: isSelected
                      ? "var(--glass-fill-strong)"
                      : "transparent",
                    color: "var(--text-primary)",
                    border: isSelected
                      ? "1.5px solid var(--accent)"
                      : "1px solid transparent",
                  }}
                >
                  <div
                    className="w-10 h-10 rounded-xl flex items-center justify-center"
                    style={{
                      background: isSelected
                        ? "var(--dock-active-pill)"
                        : "var(--bg-elevated)",
                      border: "1px solid var(--glass-border)",
                    }}
                  >
                    <IconRenderer icon={w.icon} size="w-6 h-6" />
                  </div>
                  <span className="text-[11px] font-bold text-center line-clamp-1">
                    {w.name}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </BottomSheet>

      {/* ====== ADVANCED FILTERS BOTTOM SHEET ====== */}
      <BottomSheet
        isOpen={filterSheetOpen}
        onClose={onCloseFilterSheet}
      >
        <div className="p-5 pb-16 space-y-5">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div>
              <h3
                className="font-semibold text-base"
                style={{ color: "var(--text-primary)" }}
              >
                {isIndonesian ? "Filter" : "Filters"}
              </h3>
              <p
                className="text-[11px] font-medium"
                style={{ color: "var(--text-tertiary)" }}
              >
                {isIndonesian
                  ? "Saring berdasarkan waktu, jenis, akun, kategori & nominal"
                  : "Refine by timeframe, type, account, category & amount"}
              </p>
            </div>
            {activeFiltersCount > 0 && (
              <button
                type="button"
                onClick={onResetAllFilters}
                className="text-[12px] font-bold px-3 py-1 rounded-full touch-manipulation cursor-pointer select-none active:scale-95 transition-transform"
                style={{
                  background: "var(--glass-fill)",
                  color: "var(--text-secondary)",
                }}
              >
                {isIndonesian ? "Reset Semua" : "Reset All"}
              </button>
            )}
          </div>

          {/* 1. Transaction Type */}
          <div>
            <label
              className="text-[11px] font-bold uppercase tracking-wider mb-2 block px-0.5"
              style={{ color: "var(--text-tertiary)" }}
            >
              {isIndonesian ? "Jenis Transaksi" : "Transaction Type"}
            </label>
            <div
              className="flex p-1 rounded-2xl glass-surface"
              style={{
                background: "var(--bg-elevated)",
                border: "1px solid var(--glass-border)",
              }}
            >
              {filterTabs.map((tab) => {
                const isSelected = filter === tab.key;
                return (
                  <button
                    key={tab.key}
                    type="button"
                    onClick={() => {
                      setFilter(tab.key);
                      triggerHaptic("light");
                    }}
                    className="flex-1 py-1.5 rounded-xl text-[11px] font-bold transition-all touch-manipulation cursor-pointer select-none"
                    style={{
                      background: isSelected ? "var(--accent)" : "transparent",
                      color: isSelected
                        ? "var(--accent-ink)"
                        : "var(--text-secondary)",
                    }}
                  >
                    {tab.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* 2. Timeframe & Date Range */}
          <div>
            <label
              className="text-[11px] font-bold uppercase tracking-wider mb-2 block px-0.5"
              style={{ color: "var(--text-tertiary)" }}
            >
              {isIndonesian ? "Rentang Waktu & Tanggal" : "Timeframe & Date Range"}
            </label>
            <div className="grid grid-cols-3 gap-1.5 mb-2.5">
              {[
                { key: "this_month", label: isIndonesian ? "Bulan Ini" : "This Month" },
                { key: "last_month", label: isIndonesian ? "Bulan Lalu" : "Last Month" },
                { key: "last_30", label: isIndonesian ? "30 Hari Terakhir" : "Last 30 Days" },
                { key: "all", label: isIndonesian ? "Semua Waktu" : "All Time" },
                { key: "custom_range", label: isIndonesian ? "Rentang Kustom" : "Custom Range" },
              ].map((preset) => {
                const isSelected = timeRange === preset.key;
                return (
                  <button
                    key={preset.key}
                    type="button"
                    onClick={() => {
                      setTimeRange(preset.key as TimeRangeType);
                      triggerHaptic("light");
                    }}
                    className="py-2 px-2.5 rounded-xl text-[11px] font-bold text-center active:scale-95 transition-all touch-manipulation cursor-pointer select-none"
                    style={{
                      background: isSelected
                        ? "var(--accent)"
                        : "var(--bg-elevated)",
                      color: isSelected
                        ? "var(--accent-ink)"
                        : "var(--text-primary)",
                      border: isSelected
                        ? "1px solid transparent"
                        : "1px solid var(--glass-border)",
                    }}
                  >
                    {preset.label}
                  </button>
                );
              })}
            </div>

            {timeRange === "custom_range" && (
              <div
                className="grid grid-cols-2 gap-2 p-3 rounded-2xl glass-surface"
                style={{
                  background: "var(--bg-elevated)",
                  border: "1px solid var(--glass-border)",
                }}
              >
                <div className="relative p-2.5 rounded-xl border border-[var(--glass-border)] bg-[var(--glass-fill)] min-w-0 transition-colors hover:border-[var(--text-secondary)] flex flex-col justify-center cursor-pointer">
                  <span
                    className="text-[10px] font-bold uppercase tracking-wider block mb-1 text-[var(--text-tertiary)]"
                  >
                    {isIndonesian ? "Tanggal Mulai" : "Start Date"}
                  </span>
                  <div className="text-[13px] font-semibold text-[var(--text-primary)] truncate">
                    {customStartDate
                      ? format(parseISO(customStartDate), isIndonesian ? "d MMM yyyy" : "MMM d, yyyy")
                      : "-"}
                  </div>
                  <input
                    type="date"
                    value={customStartDate}
                    onChange={(e) => setCustomStartDate(e.target.value)}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                  />
                </div>
                <div className="relative p-2.5 rounded-xl border border-[var(--glass-border)] bg-[var(--glass-fill)] min-w-0 transition-colors hover:border-[var(--text-secondary)] flex flex-col justify-center cursor-pointer">
                  <span
                    className="text-[10px] font-bold uppercase tracking-wider block mb-1 text-[var(--text-tertiary)]"
                  >
                    {isIndonesian ? "Tanggal Selesai" : "End Date"}
                  </span>
                  <div className="text-[13px] font-semibold text-[var(--text-primary)] truncate">
                    {customEndDate
                      ? format(parseISO(customEndDate), isIndonesian ? "d MMM yyyy" : "MMM d, yyyy")
                      : "-"}
                  </div>
                  <input
                    type="date"
                    value={customEndDate}
                    onChange={(e) => setCustomEndDate(e.target.value)}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                  />
                </div>
              </div>
            )}
          </div>

          {/* 3. Account / Wallet Filter */}
          <div>
            <div className="flex items-center justify-between mb-2 px-0.5">
              <label
                className="text-[11px] font-bold uppercase tracking-wider"
                style={{ color: "var(--text-tertiary)" }}
              >
                {isIndonesian ? "Akun" : "Account"}
              </label>
              {selectedWalletName && (
                <button
                  type="button"
                  onClick={() => setSelectedWalletName(null)}
                  className="text-[11px] font-bold text-[var(--accent)]"
                >
                  {isIndonesian ? "Semua Akun" : "All Accounts"}
                </button>
              )}
            </div>
            <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5">
              <button
                type="button"
                onClick={() => {
                  setSelectedWalletName(null);
                  triggerHaptic("light");
                }}
                className="px-3 py-1.5 rounded-full text-[11px] font-bold shrink-0 active:scale-95 transition-all cursor-pointer select-none"
                style={{
                  background:
                    selectedWalletName === null
                      ? "var(--accent)"
                      : "var(--bg-elevated)",
                  color:
                    selectedWalletName === null
                      ? "var(--accent-ink)"
                      : "var(--text-primary)",
                  border:
                    selectedWalletName === null
                      ? "1px solid transparent"
                      : "1px solid var(--glass-border)",
                }}
              >
                {isIndonesian ? "Semua Akun" : "All Accounts"}
              </button>
              {wallets.map((w) => {
                const isSelected = selectedWalletName === w.name;
                return (
                  <button
                    key={w.id}
                    type="button"
                    onClick={() => {
                      setSelectedWalletName(isSelected ? null : w.name);
                      triggerHaptic("light");
                    }}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-bold shrink-0 active:scale-95 transition-all cursor-pointer select-none"
                    style={{
                      background: isSelected
                        ? "var(--accent)"
                        : "var(--bg-elevated)",
                      color: isSelected
                        ? "var(--accent-ink)"
                        : "var(--text-primary)",
                      border: isSelected
                        ? "1px solid transparent"
                        : "1px solid var(--glass-border)",
                    }}
                  >
                    <IconRenderer icon={w.icon} size="w-3.5 h-3.5" />
                    <span>{w.name}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* 4. Category Multi-Select Filter */}
          <div>
            <div className="flex items-center justify-between mb-2 px-0.5">
              <label
                className="text-[11px] font-bold uppercase tracking-wider"
                style={{ color: "var(--text-tertiary)" }}
              >
                {isIndonesian ? "Kategori" : "Categories"}
              </label>
              {selectedCategoryIds.length > 0 && (
                <button
                  type="button"
                  onClick={() => setSelectedCategoryIds([])}
                  className="text-[11px] font-bold text-[var(--accent)]"
                >
                  {isIndonesian ? "Hapus Pilihan" : "Clear Categories"}
                </button>
              )}
            </div>
            <div className="flex flex-wrap gap-1.5 py-0.5">
              {categories.map((c) => {
                const isSelected = selectedCategoryIds.includes(c.id);
                return (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => {
                      setSelectedCategoryIds((prev) =>
                        isSelected
                          ? prev.filter((id) => id !== c.id)
                          : [...prev, c.id],
                      );
                      triggerHaptic("light");
                    }}
                    className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold active:scale-95 transition-all cursor-pointer select-none"
                    style={{
                      background: isSelected
                        ? "var(--accent)"
                        : "var(--bg-elevated)",
                      color: isSelected
                        ? "var(--accent-ink)"
                        : "var(--text-primary)",
                      border: isSelected
                        ? "1px solid transparent"
                        : "1px solid var(--glass-border)",
                    }}
                  >
                    <IconRenderer icon={c.emoji || ""} size="w-3.5 h-3.5" />
                    <span>{c.name}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* 5. Amount Range (Min / Max) */}
          <div>
            <label
              className="text-[11px] font-bold uppercase tracking-wider mb-2 block px-0.5"
              style={{ color: "var(--text-tertiary)" }}
            >
              {isIndonesian ? "Rentang Nominal" : "Amount Range"}
            </label>
            <div className="grid grid-cols-2 gap-2">
              <div
                className="p-3 rounded-2xl glass-surface"
                style={{
                  background: "var(--bg-elevated)",
                  border: "1px solid var(--glass-border)",
                }}
              >
                <span
                  className="text-[10px] font-bold uppercase tracking-wider block mb-1"
                  style={{ color: "var(--text-tertiary)" }}
                >
                  {isIndonesian ? "Nominal Min" : "Min Amount"}
                </span>
                <input
                  type="number"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  placeholder="0"
                  value={minAmount}
                  onChange={(e) => setMinAmount(e.target.value)}
                  className="w-full bg-transparent text-[13px] font-bold outline-none"
                  style={{ color: "var(--text-primary)" }}
                />
              </div>
              <div
                className="p-3 rounded-2xl glass-surface"
                style={{
                  background: "var(--bg-elevated)",
                  border: "1px solid var(--glass-border)",
                }}
              >
                <span
                  className="text-[10px] font-bold uppercase tracking-wider block mb-1"
                  style={{ color: "var(--text-tertiary)" }}
                >
                  {isIndonesian ? "Nominal Maks" : "Max Amount"}
                </span>
                <input
                  type="number"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  placeholder={isIndonesian ? "Tanpa Batas" : "Unlimited"}
                  value={maxAmount}
                  onChange={(e) => setMaxAmount(e.target.value)}
                  className="w-full bg-transparent text-[13px] font-bold outline-none"
                  style={{ color: "var(--text-primary)" }}
                />
              </div>
            </div>
          </div>

          {/* Action Button */}
          <button
            type="button"
            onClick={() => {
              onCloseFilterSheet();
              triggerHaptic("medium");
            }}
            className="w-full py-3.5 rounded-2xl font-semibold text-[14px] active:scale-95 transition-all shadow-xl mt-2 cursor-pointer"
            style={{
              background: "var(--accent)",
              color: "var(--accent-ink)",
            }}
          >
            {isIndonesian
              ? `Tampilkan ${filteredTxsCount} Transaksi`
              : `Show ${filteredTxsCount} Transactions`}
          </button>
        </div>
      </BottomSheet>

      {/* Universal Transaction Sheet */}
      {sheetOpen && (
        <TransactionSheet
          isOpen={sheetOpen}
          onClose={onCloseSheet}
          transaction={editingTx}
          onOpenScan={onOpenScan}
          onOpenVoiceAdd={onOpenVoiceAdd}
        />
      )}
    </>
  );
});
