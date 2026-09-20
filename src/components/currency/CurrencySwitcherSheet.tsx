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
      <div className="p-5 pb-8 space-y-4 max-h-[85vh] overflow-y-auto no-scrollbar">
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
          className="p-3 rounded-2xl flex items-center justify-between text-[11px]"
          style={{
            background: "var(--glass-fill)",
            border: "1px solid var(--glass-border)",
            color: "var(--text-secondary)",
          }}
        >
          <div className="flex items-center gap-1.5">
            <ArrowRightLeft size={13} strokeWidth={1.75} className="opacity-70" />
            <span>Market Rates (Open Exchange API)</span>
          </div>
          <span className="font-mono text-[10px] opacity-70">
            Updated {formattedLastUpdated}
          </span>
        </div>

        {/* Search Input */}
        <div
          className="flex items-center gap-2.5 px-3.5 py-2.5 rounded-2xl"
          style={{
            background: "var(--bg-elevated)",
            border: "1px solid var(--glass-border)",
          }}
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
              className="p-1 rounded-full text-[var(--text-tertiary)] hover:text-[var(--text-primary)]"
            >
              <X size={12} />
            </button>
          )}
        </div>

        {/* Currency List */}
        <div className="space-y-1.5">
          {currenciesList.map((currency) => {
            const isSelected = preferredCurrency === currency.code;
            const foreignPerIdr = rates[currency.code] || 1;
            const idrPerUnit = foreignPerIdr > 0 ? 1 / foreignPerIdr : 1;

            return (
              <button
                key={currency.code}
                type="button"
                onClick={() => handleSelect(currency.code)}
                className="w-full flex items-center justify-between p-3.5 rounded-2xl transition-all cursor-pointer text-left active:scale-[0.99] select-none"
                style={{
                  background: isSelected
                    ? "var(--bg-elevated)"
                    : "var(--glass-fill)",
                  border: isSelected
                    ? "1px solid var(--text-primary)"
                    : "1px solid var(--glass-border)",
                }}
              >
                <div className="flex items-center gap-3 min-w-0">
                  {/* Monochrome ISO Country Code Badge */}
                  <div
                    className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 font-mono font-bold text-[11px] tracking-wider"
                    style={{
                      background: isSelected
                        ? "var(--text-primary)"
                        : "var(--bg-elevated)",
                      color: isSelected
                        ? "var(--bg-base)"
                        : "var(--text-secondary)",
                      border: "1px solid var(--glass-border)",
                    }}
                  >
                    {currency.countryCode}
                  </div>

                  <div className="min-w-0 pr-2">
                    <div className="flex items-center gap-2">
                      <span
                        className="text-[13px] font-semibold"
                        style={{ color: "var(--text-primary)" }}
                      >
                        {currency.code}
                      </span>
                      <span
                        className="text-[11px] font-medium font-mono opacity-80"
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

                <div className="flex items-center gap-3 shrink-0">
                  <div className="text-right">
                    <span
                      className="text-[11px] font-semibold font-mono block"
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
                    <div
                      className="w-5 h-5 rounded-full flex items-center justify-center shrink-0"
                      style={{
                        background: "var(--text-primary)",
                        color: "var(--bg-base)",
                      }}
                    >
                      <Check size={12} strokeWidth={2.5} />
                    </div>
                  )}
                </div>
              </button>
            );
          })}

          {currenciesList.length === 0 && (
            <div className="text-center py-8">
              <p
                className="text-[13px] font-medium"
                style={{ color: "var(--text-tertiary)" }}
              >
                No currency matches &quot;{searchQuery}&quot;
              </p>
            </div>
          )}
        </div>
      </div>
    </BottomSheet>
  );
}
