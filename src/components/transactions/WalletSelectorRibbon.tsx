import { ChevronRight } from "lucide-react";
import { IconRenderer } from "../ui/IconRenderer";
import { triggerHaptic } from "../../lib/haptics";
import { useTheme } from "../../contexts/ThemeContext";
import { useLanguage } from "../../contexts/LanguageContext";
import type { Wallet, TransactionType } from "../../lib/types";

export interface WalletSelectorRibbonProps {
  type: TransactionType;
  displayFromWallets: Wallet[];
  displayToWallets: Wallet[];
  walletId: string | null;
  toWalletId: string | null;
  onSelectWallet: (id: string) => void;
  onSelectToWallet: (id: string) => void;
  onOpenMore: (target: "from" | "to") => void;
}

export function WalletSelectorRibbon({
  type,
  displayFromWallets,
  displayToWallets,
  walletId,
  toWalletId,
  onSelectWallet,
  onSelectToWallet,
  onOpenMore,
}: WalletSelectorRibbonProps) {
  const { theme } = useTheme();
  const isDark = theme !== "light";
  const { isIndonesian } = useLanguage();

  const getChipStyle = (isSelected: boolean) => ({
    background: isSelected
      ? isDark
        ? "linear-gradient(180deg, rgba(255,255,255,0.96) 0%, rgba(255,255,255,0.84) 48%, rgba(244,245,247,0.90) 100%)"
        : "#18181b"
      : "var(--bg-elevated)",
    border: isSelected
      ? isDark
        ? "1px solid rgba(255, 255, 255, 0.95)"
        : "1px solid #18181b"
      : "1px solid var(--glass-border)",
    color: isSelected
      ? isDark
        ? "#000000"
        : "#ffffff"
      : "var(--text-secondary)",
    boxShadow: isSelected
      ? isDark
        ? "inset 0 1px 0 #ffffff, 0 3px 12px rgba(0, 0, 0, 0.28)"
        : "0 3px 10px rgba(0, 0, 0, 0.16)"
      : "none",
  });

  if (type === "transfer") {
    return (
      <div className="space-y-3.5 mb-4">
        {/* From Account */}
        <div>
          <div className="flex items-center justify-between mb-2 px-1 select-none">
            <span
              className="text-[11px] font-semibold uppercase tracking-wider"
              style={{ color: "var(--text-tertiary)" }}
            >
              {isIndonesian ? "Dari Akun" : "From Account"}
            </span>
            <button
              type="button"
              onClick={() => {
                triggerHaptic("light");
                onOpenMore("from");
              }}
              className="text-[11px] font-medium flex items-center gap-0.5 active:opacity-70 transition-opacity cursor-pointer"
              style={{ color: "var(--text-secondary)" }}
            >
              <span>{isIndonesian ? "Semua" : "All"}</span>
              <ChevronRight size={13} strokeWidth={1.75} />
            </button>
          </div>

          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5 -mx-1 px-1 select-none">
            {displayFromWallets.map((w) => {
              const isSelected = walletId === w.id;
              return (
                <button
                  key={w.id}
                  type="button"
                  onClick={() => {
                    triggerHaptic("light");
                    onSelectWallet(w.id);
                  }}
                  className="whitespace-nowrap px-3.5 py-2 rounded-2xl text-[12px] font-medium flex items-center gap-2 shrink-0 transition-all active:scale-[0.96] cursor-pointer"
                  style={getChipStyle(isSelected)}
                >
                  <span className="shrink-0 flex items-center justify-center">
                    <IconRenderer icon={w.icon} size="w-3.5 h-3.5" />
                  </span>
                  <span className="font-semibold leading-none">{w.name}</span>
                </button>
              );
            })}

            <button
              type="button"
              onClick={() => {
                triggerHaptic("light");
                onOpenMore("from");
              }}
              className="whitespace-nowrap px-3 py-2 rounded-2xl text-[11px] font-medium flex items-center gap-1 shrink-0 transition-all active:scale-[0.96] cursor-pointer"
              style={{
                background: "var(--glass-fill)",
                border: "1px dashed var(--glass-border)",
                color: "var(--text-tertiary)",
              }}
            >
              <span>{isIndonesian ? "+ Lainnya" : "+ More"}</span>
            </button>
          </div>
        </div>

        {/* To Account */}
        <div>
          <div className="flex items-center justify-between mb-2 px-1 select-none">
            <span
              className="text-[11px] font-semibold uppercase tracking-wider"
              style={{ color: "var(--text-tertiary)" }}
            >
              {isIndonesian ? "Ke Akun" : "To Account"}
            </span>
            <button
              type="button"
              onClick={() => {
                triggerHaptic("light");
                onOpenMore("to");
              }}
              className="text-[11px] font-medium flex items-center gap-0.5 active:opacity-70 transition-opacity cursor-pointer"
              style={{ color: "var(--text-secondary)" }}
            >
              <span>{isIndonesian ? "Semua" : "All"}</span>
              <ChevronRight size={13} strokeWidth={1.75} />
            </button>
          </div>

          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5 -mx-1 px-1 select-none">
            {displayToWallets.map((w) => {
              const isSelected = toWalletId === w.id;
              return (
                <button
                  key={w.id}
                  type="button"
                  onClick={() => {
                    triggerHaptic("light");
                    onSelectToWallet(w.id);
                  }}
                  className="whitespace-nowrap px-3.5 py-2 rounded-2xl text-[12px] font-medium flex items-center gap-2 shrink-0 transition-all active:scale-[0.96] cursor-pointer"
                  style={getChipStyle(isSelected)}
                >
                  <span className="shrink-0 flex items-center justify-center">
                    <IconRenderer icon={w.icon} size="w-3.5 h-3.5" />
                  </span>
                  <span className="font-semibold leading-none">{w.name}</span>
                </button>
              );
            })}

            <button
              type="button"
              onClick={() => {
                triggerHaptic("light");
                onOpenMore("to");
              }}
              className="whitespace-nowrap px-3 py-2 rounded-2xl text-[11px] font-medium flex items-center gap-1 shrink-0 transition-all active:scale-[0.96] cursor-pointer"
              style={{
                background: "var(--glass-fill)",
                border: "1px dashed var(--glass-border)",
                color: "var(--text-tertiary)",
              }}
            >
              <span>{isIndonesian ? "+ Lainnya" : "+ More"}</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="mb-4">
      {/* Header Label & More Action */}
      <div className="flex items-center justify-between mb-2 px-1 select-none">
        <span
          className="text-[11px] font-semibold uppercase tracking-wider"
          style={{ color: "var(--text-tertiary)" }}
        >
          {isIndonesian ? "Akun" : "Account"}
        </span>
        <button
          type="button"
          onClick={() => {
            triggerHaptic("light");
            onOpenMore("from");
          }}
          className="text-[11px] font-medium flex items-center gap-0.5 active:opacity-70 transition-opacity cursor-pointer"
          style={{ color: "var(--text-secondary)" }}
        >
          <span>{isIndonesian ? "Semua" : "All"}</span>
          <ChevronRight size={13} strokeWidth={1.75} />
        </button>
      </div>

      {/* Horizontal Ribbon Carousel */}
      <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5 -mx-1 px-1 select-none">
        {displayFromWallets.map((w) => {
          const isSelected = walletId === w.id;
          return (
            <button
              key={w.id}
              type="button"
              onClick={() => {
                triggerHaptic("light");
                onSelectWallet(w.id);
              }}
              className="whitespace-nowrap px-3.5 py-2 rounded-2xl text-[12px] font-medium flex items-center gap-2 shrink-0 transition-all active:scale-[0.96] cursor-pointer"
              style={getChipStyle(isSelected)}
            >
              <span className="shrink-0 flex items-center justify-center">
                <IconRenderer icon={w.icon} size="w-3.5 h-3.5" />
              </span>
              <span className="font-semibold leading-none">{w.name}</span>
            </button>
          );
        })}

        {/* Action Button: More */}
        <button
          type="button"
          onClick={() => {
            triggerHaptic("light");
            onOpenMore("from");
          }}
          className="whitespace-nowrap px-3 py-2 rounded-2xl text-[11px] font-medium flex items-center gap-1 shrink-0 transition-all active:scale-[0.96] cursor-pointer"
          style={{
            background: "var(--glass-fill)",
            border: "1px dashed var(--glass-border)",
            color: "var(--text-tertiary)",
          }}
        >
          <span>{isIndonesian ? "+ Lainnya" : "+ More"}</span>
        </button>
      </div>
    </div>
  );
}
