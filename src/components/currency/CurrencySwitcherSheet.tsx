import { useState, useMemo } from "react";
import {
  Search,
  X,
  Check,
  RefreshCw,
  Coins,
  ArrowRightLeft,
} from "lucide-react";
import { BottomSheet } from "../ui/BottomSheet";
import {
  useCurrency,
  CURRENCY_METADATA,
  type SupportedCurrency,
} from "../../contexts/CurrencyContext";
import { triggerHaptic } from "../../lib/haptics";
import { useToast } from "../../contexts/ToastContext";
import { formatRupiah } from "../../lib/utils";

interface CurrencySwitcherSheetProps {
  isOpen: boolean;
  onClose: () => void;
}

export function CurrencySwitcherSheet({ isOpen, onClose }: CurrencySwitcherSheetProps) {
  const {
    preferredCurrency,
    setPreferredCurrency,
    rates,
    lastUpdated,
    isLoading,
    refreshRates,
  } = useCurrency();

  const { showToast } = useToast();
  const [searchQuery, setSearchQuery] = useState("");

  const currenciesList = useMemo(() => {
    const list = Object.values(CURRENCY_METADATA);
    if (!searchQuery.trim()) return list;
    const q = searchQuery.toLowerCase().trim();
    return list.filter(
      (c) =>
        c.code.toLowerCase().includes(q) ||
        c.name.toLowerCase().includes(q) ||
        c.symbol.toLowerCase().includes(q) ||
        c.countryCode.toLowerCase().includes(q)
    );
  }, [searchQuery]);

  const handleSelect = (code: SupportedCurrency) => {
    triggerHaptic("medium");
    setPreferredCurrency(code);
    showToast(`Base currency changed to ${code}`, "update", () => {});
    onClose();
  };

  const handleRefresh = async () => {
    triggerHaptic("light");
    try {
      await refreshRates();
      showToast("Exchange rates updated to latest market quotes", "update", () => {});
    } catch {
      showToast("Failed to refresh live exchange rates", "delete", () => {});
    }
  };

  const formattedLastUpdated = useMemo(() => {
    if (!lastUpdated) return "Offline defaults";
    const date = new Date(lastUpdated);
    return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  }, [lastUpdated]);

  return (
    <BottomSheet isOpen={isOpen} onClose={onClose}>
      <div className="p-5 pb-8 space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div
              className="w-9 h-9 rounded-2xl flex items-center justify-center shrink-0"
              style={{
                background: "var(--glass-fill)",
                border: "1px solid var(--glass-border)",
                color: "var(--text-primary)",
              }}
            >
              <Coins size={16} strokeWidth={1.75} />
            </div>
            <div>
              <h2
                className="text-[16px] font-semibold tracking-tight"
                style={{ color: "var(--text-primary)" }}
              >
                Base Currency & Rates
              </h2>
              <p
                className="text-[11px] font-medium"
                style={{ color: "var(--text-tertiary)" }}
              >
                Choose your default viewing & valuation currency
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={handleRefresh}
            disabled={isLoading}
            className="px-2.5 py-1.5 rounded-full text-[11px] font-semibold inline-flex items-center gap-1.5 glass-surface border border-[var(--glass-border)] active:scale-95 transition-all cursor-pointer select-none"
            style={{ color: "var(--text-primary)" }}
            title="Refresh Live Market Quotes"
          >
            <RefreshCw
              size={12}
              strokeWidth={1.75}
              className={isLoading ? "animate-spin" : ""}
            />
            <span>{isLoading ? "Syncing..." : "Sync"}</span>
          </button>
        </div>

        {/* Live Rates Status Bar */}
        <div
          className="px-3 py-2 rounded-xl flex items-center justify-between text-[11px] border border-[var(--glass-border)] bg-[var(--glass-fill)] text-[var(--text-secondary)]"
        >
          <div className="flex items-center gap-1.5">
            <ArrowRightLeft size={12} strokeWidth={1.75} className="opacity-70" />
            <span className="font-medium">Market Rates (Open Exchange API)</span>
          </div>
          <span className=" text-[10px] opacity-70">
            Updated {formattedLastUpdated}
          </span>
        </div>

        {/* Search Input */}
        <div
          className="flex items-center gap-2 px-3 py-2 rounded-xl border border-[var(--glass-border)] bg-[var(--bg-elevated)]"
        >
          <Search size={14} style={{ color: "var(--text-tertiary)" }} />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search currency, code, or country..."
            className="flex-1 bg-transparent text-[13px] font-medium outline-none placeholder:text-[var(--text-tertiary)]"
            style={{ color: "var(--text-primary)" }}
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery("")}
              className="p-0.5 rounded-full text-[var(--text-tertiary)] hover:text-[var(--text-primary)]"
            >
              <X size={12} />
            </button>
          )}
        </div>

        {/* Apple iOS Grouped Currency List */}
        <div className="pb-4">
          {currenciesList.length === 0 ? (
            <div className="py-8 text-center text-[12px] text-[var(--text-tertiary)]">
              No currencies match &quot;{searchQuery}&quot;
            </div>
          ) : (
            <div className="rounded-2xl border border-[var(--glass-border)] bg-[var(--bg-elevated)] divide-y divide-[var(--glass-border)] overflow-hidden">
              {currenciesList.map((currency) => {
                const isSelected = preferredCurrency === currency.code;
                const foreignPerIdr = rates[currency.code] || 1;
                const idrPerUnit = foreignPerIdr > 0 ? 1 / foreignPerIdr : 1;

                return (
                  <button
                    key={currency.code}
                    type="button"
                    onClick={() => handleSelect(currency.code)}
                    className={`w-full flex items-center justify-between py-2.5 px-3.5 transition-colors cursor-pointer text-left select-none ${
                      isSelected
                        ? "bg-black/[0.04] dark:bg-white/[0.06]"
                        : "hover:bg-black/[0.02] dark:hover:bg-white/[0.02] active:bg-black/[0.04] dark:active:bg-white/[0.04]"
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div
                        className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0  font-bold text-[10px] tracking-wider border border-[var(--glass-border)] bg-[var(--glass-fill)]"
                        style={{
                          color: isSelected ? "var(--text-primary)" : "var(--text-secondary)",
                        }}
                      >
                        {currency.countryCode}
                      </div>

                      <div className="min-w-0 pr-2">
                        <div className="flex items-center gap-1.5">
                          <span
                            className="text-[13px] font-medium"
                            style={{ color: "var(--text-primary)" }}
                          >
                            {currency.code}
                          </span>
                          <span
                            className="text-[11px]  opacity-70"
                            style={{ color: "var(--text-tertiary)" }}
                          >
                            ({currency.symbol})
                          </span>
                        </div>
                        <p
                          className="text-[11px] truncate mt-0.5"
                          style={{ color: "var(--text-tertiary)" }}
                        >
                          {currency.name}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2.5 shrink-0">
                      <div className="text-right">
                        <span
                          className="text-[11px] font-medium  block"
                          style={{ color: "var(--text-primary)" }}
                        >
                          {currency.code === "IDR"
                            ? "Base (1:1)"
                            : `1 ${currency.code} ≈ ${formatRupiah(Math.round(idrPerUnit))}`}
                        </span>
                        <span
                          className="text-[9px] font-medium opacity-60 block"
                          style={{ color: "var(--text-tertiary)" }}
                        >
                          {currency.decimals} decimals
                        </span>
                      </div>

                      {isSelected && (
                        <div className="w-4.5 h-4.5 rounded-full flex items-center justify-center shrink-0 bg-black dark:bg-white text-white dark:text-black">
                          <Check size={11} strokeWidth={2.5} />
                        </div>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </BottomSheet>
  );
}
