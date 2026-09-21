import { useState, useMemo, useEffect } from "react";
import {
  calculateDebtPayoffSchedule,
  type DebtItem,
  type DebtPayoffComparison,
} from "../../lib/financialMath";
import { formatRupiah } from "../../lib/utils";
import { triggerHaptic } from "../../lib/haptics";
import {
  Flame,
  Snowflake,
  Plus,
  Trash2,
  Edit2,
  CheckCircle2,
  ChevronDown,
  CreditCard,
  TrendingDown,
  X,
} from "lucide-react";
import { addMonths, format } from "date-fns";
import { motion, AnimatePresence } from "framer-motion";

const DEFAULT_DEBTS: DebtItem[] = [];
const DUMMY_DEBT_IDS = new Set(["debt-cc-1", "debt-pl-2", "debt-loan-3"]);

const STORAGE_KEY = "trouvaille_debts_v1";

interface DebtPayoffSimulatorCardProps {
  hideBalance?: boolean;
}

export function DebtPayoffSimulatorCard({
  hideBalance = false,
}: DebtPayoffSimulatorCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [debts, setDebts] = useState<DebtItem[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          return parsed.filter((d: DebtItem) => !DUMMY_DEBT_IDS.has(d.id));
        }
      }
    } catch {
      // ignore
    }
    return DEFAULT_DEBTS;
  });

  const [extraPayment, setExtraPayment] = useState<number>(1000000);
  const [strategy, setStrategy] = useState<"snowball" | "avalanche">("avalanche");

  // Modal / Form state for Add / Edit
  const [debtModalOpen, setDebtModalOpen] = useState(false);
  const [editingDebtId, setEditingDebtId] = useState<string | null>(null);
  const [formName, setFormName] = useState("");
  const [formBalance, setFormBalance] = useState("");
  const [formMinPay, setFormMinPay] = useState("");
  const [formApr, setFormApr] = useState("");

  // Persist debts
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(debts));
    } catch {
      // ignore
    }
  }, [debts]);

  const comparison: DebtPayoffComparison = useMemo(() => {
    return calculateDebtPayoffSchedule(debts, extraPayment);
  }, [debts, extraPayment]);

  const activeResult = strategy === "snowball" ? comparison.snowball : comparison.avalanche;

  const now = new Date();
  const projectedFreeDate = useMemo(() => {
    if (activeResult.totalMonths === 0) return "Debt Free";
    return format(addMonths(now, activeResult.totalMonths), "MMM yyyy");
  }, [now, activeResult.totalMonths]);

  const mask = (val: string) => (hideBalance ? "••••••" : val);

  const openAddDebt = () => {
    setEditingDebtId(null);
    setFormName("");
    setFormBalance("");
    setFormMinPay("");
    setFormApr("15");
    setDebtModalOpen(true);
    triggerHaptic("light");
  };

  const openEditDebt = (d: DebtItem) => {
    setEditingDebtId(d.id);
    setFormName(d.name);
    setFormBalance(d.balance.toLocaleString("id-ID"));
    setFormMinPay(d.minPayment.toLocaleString("id-ID"));
    setFormApr(String(d.interestRate));
    setDebtModalOpen(true);
    triggerHaptic("light");
  };

  const handleSaveDebtForm = (e: React.FormEvent) => {
    e.preventDefault();
    const balanceNum = parseFloat(formBalance.replace(/\D/g, "")) || 0;
    const minPayNum = parseFloat(formMinPay.replace(/\D/g, "")) || 0;
    const aprNum = parseFloat(formApr) || 0;

    if (!formName.trim() || balanceNum <= 0 || minPayNum <= 0) return;

    if (editingDebtId) {
      setDebts((prev) =>
        prev.map((d) =>
          d.id === editingDebtId
            ? {
                ...d,
                name: formName.trim(),
                balance: balanceNum,
                minPayment: minPayNum,
                interestRate: aprNum,
              }
            : d
        )
      );
    } else {
      const newDebt: DebtItem = {
        id: `debt-${Date.now()}`,
        name: formName.trim(),
        balance: balanceNum,
        minPayment: minPayNum,
        interestRate: aprNum,
      };
      setDebts((prev) => [...prev, newDebt]);
    }

    setDebtModalOpen(false);
    triggerHaptic("medium");
  };

  const handleDeleteDebt = (id: string) => {
    setDebts((prev) => prev.filter((d) => d.id !== id));
    triggerHaptic("light");
  };

  const handleClearAllDebts = () => {
    if (!confirm("Clear all debt records?")) return;
    setDebts([]);
    triggerHaptic("medium");
  };

  return (
    <section className="glass-surface rounded-3xl overflow-hidden transition-all">
      {/* Collapsible Header Button — Identical UX to What-If Simulator */}
      <button
        type="button"
        onClick={() => {
          setIsExpanded(!isExpanded);
          triggerHaptic("light");
        }}
        className="w-full p-4 flex items-center justify-between text-left select-none active:bg-white/5 transition-colors"
      >
        <div className="flex items-center gap-2.5 min-w-0">
          <div
            className="w-7 h-7 rounded-full flex items-center justify-center shrink-0"
            style={{
              background: "var(--glass-fill-strong)",
              border: "1px solid var(--glass-border)",
              color: "var(--text-primary)",
            }}
          >
            <CreditCard size={14} />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span
                className="text-[10px] font-semibold uppercase tracking-wider"
                style={{ color: "var(--text-tertiary)" }}
              >
                Debt Payoff Engine
              </span>
              <span
                className="text-[9px] font-semibold uppercase px-2 py-0.2 rounded-full"
                style={{
                  background: "var(--glass-fill)",
                  color: "var(--text-secondary)",
                  border: "1px solid var(--glass-border)",
                }}
              >
                {strategy.toUpperCase()}
              </span>
            </div>
            <p
              className="text-[13px] font-bold mt-0.5 truncate"
              style={{ color: "var(--text-primary)" }}
            >
              {activeResult.totalMonths > 0
                ? `Debt-Free in ${activeResult.totalMonths} Mos (${projectedFreeDate})`
                : debts.length === 0
                ? "No Active Debts"
                : "All Debts Cleared"}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {!isExpanded && comparison.totalInitialDebt > 0 && (
            <span
              className="text-[11px] font-semibold hidden sm:inline"
              style={{ color: "var(--text-secondary)" }}
            >
              {mask(formatRupiah(comparison.totalInitialDebt))}
            </span>
          )}
          <motion.div
            animate={{ rotate: isExpanded ? 180 : 0 }}
            transition={{ duration: 0.2 }}
            style={{ color: "var(--text-secondary)" }}
          >
            <ChevronDown size={18} />
          </motion.div>
        </div>
      </button>

      {/* Expandable Body with Framer Motion */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25 }}
          >
            <div
              className="p-4 pt-2 space-y-4 border-t"
              style={{ borderColor: "var(--glass-border)" }}
            >
              {debts.length === 0 ? (
                <div className="py-8 text-center space-y-2">
                  <p className="text-[13px] font-semibold" style={{ color: "var(--text-primary)" }}>
                    No Debts Recorded
                  </p>
                  <p className="text-[11.5px] max-w-xs mx-auto" style={{ color: "var(--text-tertiary)" }}>
                    You currently have no active liabilities or loans. Tap below to track credit cards, paylaters, or installments.
                  </p>
                  <div className="pt-2">
                    <button
                      type="button"
                      onClick={openAddDebt}
                      className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-[12px] font-semibold cursor-pointer active:scale-95 transition-all"
                      style={{
                        background: "var(--accent)",
                        color: "var(--accent-ink)",
                      }}
                    >
                      <Plus size={13} />
                      Add Debt Account
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  {/* 1. Summary Cards */}
              <div
                className="grid grid-cols-2 gap-3 p-3 rounded-2xl"
                style={{
                  background: "var(--bg-surface)",
                  border: "1px solid var(--glass-border)",
                }}
              >
                <div>
                  <span
                    className="text-[10px] font-bold uppercase tracking-wider block"
                    style={{ color: "var(--text-tertiary)" }}
                  >
                    Total Debt Principal
                  </span>
                  <span
                    className="text-[16px] font-semibold tracking-tight block mt-0.5"
                    style={{ color: "var(--text-primary)" }}
                  >
                    {mask(formatRupiah(comparison.totalInitialDebt))}
                  </span>
                </div>
                <div>
                  <span
                    className="text-[10px] font-bold uppercase tracking-wider block"
                    style={{ color: "var(--text-tertiary)" }}
                  >
                    Required Minimum / Mo
                  </span>
                  <span
                    className="text-[16px] font-semibold tracking-tight block mt-0.5"
                    style={{ color: "var(--text-primary)" }}
                  >
                    {mask(formatRupiah(comparison.totalMinPayment))}
                  </span>
                </div>
              </div>

              {/* 2. Strategy Selector */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-[11px] font-bold px-0.5">
                  <span style={{ color: "var(--text-secondary)" }}>Payoff Strategy:</span>
                  <span
                    className="text-[10px] uppercase font-bold"
                    style={{ color: "var(--text-tertiary)" }}
                  >
                    {strategy === "avalanche"
                      ? "Minimizes Total Interest"
                      : "Quick Psychological Wins"}
                  </span>
                </div>

                <div
                  className="grid grid-cols-2 gap-1.5 p-1 rounded-2xl"
                  style={{
                    background: "var(--bg-surface)",
                    border: "1px solid var(--glass-border)",
                  }}
                >
                  <button
                    type="button"
                    onClick={() => {
                      setStrategy("avalanche");
                      triggerHaptic("medium");
                    }}
                    className="flex items-center justify-center gap-1.5 py-2 rounded-xl text-[12px] font-semibold transition-all active:scale-98 cursor-pointer"
                    style={{
                      background:
                        strategy === "avalanche" ? "var(--accent)" : "transparent",
                      color:
                        strategy === "avalanche"
                          ? "var(--accent-ink)"
                          : "var(--text-secondary)",
                      boxShadow:
                        strategy === "avalanche"
                          ? "0 2px 8px var(--shadow-strength)"
                          : "none",
                    }}
                  >
                    <Flame size={13} />
                    Avalanche (APR)
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setStrategy("snowball");
                      triggerHaptic("medium");
                    }}
                    className="flex items-center justify-center gap-1.5 py-2 rounded-xl text-[12px] font-semibold transition-all active:scale-98 cursor-pointer"
                    style={{
                      background:
                        strategy === "snowball" ? "var(--accent)" : "transparent",
                      color:
                        strategy === "snowball"
                          ? "var(--accent-ink)"
                          : "var(--text-secondary)",
                      boxShadow:
                        strategy === "snowball"
                          ? "0 2px 8px var(--shadow-strength)"
                          : "none",
                    }}
                  >
                    <Snowflake size={13} />
                    Snowball (Balance)
                  </button>
                </div>
              </div>

              {/* 3. Extra Monthly Accelerator (How much extra can you pay?) */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-[11px] font-bold px-0.5">
                  <span style={{ color: "var(--text-secondary)" }}>
                    Extra Monthly Payment (Accelerator):
                  </span>
                  <span
                    className="font-semibold text-[12px]"
                    style={{ color: "var(--text-primary)" }}
                  >
                    {extraPayment > 0 ? `+${formatRupiah(extraPayment)}/mo` : "Min only"}
                  </span>
                </div>

                {/* Formatted Numeric Input */}
                <div
                  className="flex items-center gap-2 p-2.5 rounded-2xl"
                  style={{
                    background: "var(--bg-surface)",
                    border: "1px solid var(--glass-border)",
                  }}
                >
                  <span
                    className="text-[12px] font-bold pl-2"
                    style={{ color: "var(--text-tertiary)" }}
                  >
                    Rp
                  </span>
                  <input
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    value={extraPayment ? extraPayment.toLocaleString("id-ID") : ""}
                    onChange={(e) => {
                      const raw = e.target.value.replace(/\D/g, "");
                      const num = raw ? parseInt(raw, 10) : 0;
                      setExtraPayment(num);
                    }}
                    placeholder="0"
                    className="flex-1 bg-transparent text-[14px] font-semibold focus:outline-none"
                    style={{ color: "var(--text-primary)" }}
                  />
                  {extraPayment > 0 && (
                    <button
                      type="button"
                      onClick={() => setExtraPayment(0)}
                      className="text-[10px] font-bold px-2 py-1 rounded-lg text-[var(--text-tertiary)] hover:text-[var(--text-primary)]"
                    >
                      Clear
                    </button>
                  )}
                </div>

                {/* Quick Presets */}
                <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar">
                  {[0, 250000, 500000, 1000000, 2000000, 3000000].map((val) => (
                    <button
                      key={val}
                      type="button"
                      onClick={() => {
                        setExtraPayment(val);
                        triggerHaptic("light");
                      }}
                      className="px-2.5 py-1 rounded-xl text-[10px] font-semibold whitespace-nowrap active:scale-95 transition-all cursor-pointer"
                      style={{
                        background:
                          extraPayment === val
                            ? "var(--accent)"
                            : "var(--glass-fill)",
                        color:
                          extraPayment === val
                            ? "var(--accent-ink)"
                            : "var(--text-secondary)",
                        border: "1px solid var(--glass-border)",
                      }}
                    >
                      {val === 0 ? "Min Only" : `+${formatRupiah(val)}`}
                    </button>
                  ))}
                </div>
              </div>

              {/* 4. Payoff Projection Result Hero */}
              <div
                className="p-4 rounded-2xl space-y-3"
                style={{
                  background: "var(--glass-fill)",
                  border: "1px solid var(--glass-border)",
                }}
              >
                <div className="flex items-start justify-between">
                  <div>
                    <span
                      className="text-[9px] font-semibold uppercase tracking-wider block"
                      style={{ color: "var(--text-tertiary)" }}
                    >
                      Estimated Debt-Free Date
                    </span>
                    <div className="flex items-baseline gap-2 mt-0.5">
                      <span
                        className="text-[22px] font-semibold tracking-tight"
                        style={{ color: "var(--text-primary)" }}
                      >
                        {activeResult.totalMonths}
                      </span>
                      <span
                        className="text-[12px] font-bold"
                        style={{ color: "var(--text-secondary)" }}
                      >
                        Months ({projectedFreeDate})
                      </span>
                    </div>
                  </div>

                  <div className="text-right">
                    <span
                      className="text-[9px] font-semibold uppercase tracking-wider block"
                      style={{ color: "var(--text-tertiary)" }}
                    >
                      Total Interest Accrued
                    </span>
                    <span
                      className="text-[15px] font-semibold block mt-0.5"
                      style={{ color: "var(--text-primary)" }}
                    >
                      {mask(formatRupiah(activeResult.totalInterest))}
                    </span>
                  </div>
                </div>

                {/* Savings comparison insight */}
                {comparison.interestSaved > 0 && (
                  <div
                    className="flex items-center gap-2 p-2.5 rounded-xl text-[11px] font-bold"
                    style={{
                      background: "var(--bg-elevated)",
                      border: "1px solid var(--glass-border)",
                      color: "var(--text-secondary)",
                    }}
                  >
                    <TrendingDown size={14} className="shrink-0" style={{ color: "var(--text-primary)" }} />
                    <span>
                      Avalanche saves{" "}
                      <strong style={{ color: "var(--text-primary)" }}>
                        {mask(formatRupiah(comparison.interestSaved))}
                      </strong>{" "}
                      interest compared to Snowball.
                    </span>
                  </div>
                )}

                {/* Debt Payoff Order Roadmap */}
                {activeResult.debtPayoffOrder.length > 0 && (
                  <div className="space-y-1.5 pt-1">
                    <span
                      className="text-[10px] font-bold uppercase tracking-wider block"
                      style={{ color: "var(--text-tertiary)" }}
                    >
                      Clearance Milestone Order:
                    </span>
                    <div className="space-y-1">
                      {activeResult.debtPayoffOrder.map((step, idx) => (
                        <div
                          key={step.id}
                          className="flex items-center justify-between text-[11px] p-2 rounded-xl"
                          style={{
                            background: "var(--bg-surface)",
                            border: "1px solid var(--glass-border)",
                          }}
                        >
                          <div className="flex items-center gap-2">
                            <span
                              className="w-4 h-4 rounded-full flex items-center justify-center text-[9px] font-semibold"
                              style={{
                                background: "var(--glass-border)",
                                color: "var(--text-primary)",
                              }}
                            >
                              {idx + 1}
                            </span>
                            <span
                              className="font-bold"
                              style={{ color: "var(--text-primary)" }}
                            >
                              {step.name}
                            </span>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <span
                              className="text-[10px] font-medium"
                              style={{ color: "var(--text-tertiary)" }}
                            >
                              Month {step.paidMonth}
                            </span>
                            <CheckCircle2
                              size={12}
                              style={{ color: "var(--text-primary)" }}
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* 5. Debt Portfolio List & Manage Debts */}
              <div className="space-y-2 pt-1">
                <div className="flex items-center justify-between px-0.5">
                  <span
                    className="text-[11px] font-semibold uppercase tracking-wider"
                    style={{ color: "var(--text-secondary)" }}
                  >
                    Your Debts ({debts.length})
                  </span>
                  <div className="flex items-center gap-1.5">
                    {debts.length > 0 && (
                      <button
                        type="button"
                        onClick={handleClearAllDebts}
                        className="px-2 py-1 rounded-lg text-[10px] font-bold flex items-center gap-1 cursor-pointer active:scale-95"
                        style={{
                          background: "var(--glass-fill)",
                          color: "var(--text-tertiary)",
                        }}
                        title="Clear all debts"
                      >
                        <Trash2 size={10} />
                        Clear All
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={openAddDebt}
                      className="px-2.5 py-1 rounded-xl text-[10px] font-semibold flex items-center gap-1 cursor-pointer active:scale-95"
                      style={{
                        background: "var(--accent)",
                        color: "var(--accent-ink)",
                      }}
                    >
                      <Plus size={11} />
                      Add Debt
                    </button>
                  </div>
                </div>

                <div className="space-y-1.5">
                  {debts.map((d) => (
                    <div
                      key={d.id}
                      className="p-3 rounded-2xl flex items-center justify-between gap-2"
                      style={{
                        background: "var(--bg-surface)",
                        border: "1px solid var(--glass-border)",
                      }}
                    >
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <h4
                            className="text-[12px] font-bold truncate"
                            style={{ color: "var(--text-primary)" }}
                          >
                            {d.name}
                          </h4>
                          <span
                            className="text-[9px] font-semibold px-1.5 py-0.2 rounded-full"
                            style={{
                              background: "var(--glass-fill)",
                              color: "var(--text-secondary)",
                              border: "1px solid var(--glass-border)",
                            }}
                          >
                            {d.interestRate}% APR
                          </span>
                        </div>
                        <p
                          className="text-[11px] font-medium mt-0.5"
                          style={{ color: "var(--text-tertiary)" }}
                        >
                          Balance:{" "}
                          <strong style={{ color: "var(--text-primary)" }}>
                            {mask(formatRupiah(d.balance))}
                          </strong>{" "}
                          • Min: {mask(formatRupiah(d.minPayment))}/mo
                        </p>
                      </div>

                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          type="button"
                          onClick={() => openEditDebt(d)}
                          className="p-2 rounded-lg text-[var(--text-tertiary)] hover:text-[var(--text-primary)] transition-colors cursor-pointer"
                          title="Edit nominal"
                        >
                          <Edit2 size={13} />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteDebt(d.id)}
                          className="p-2 rounded-lg text-[var(--text-tertiary)] hover:text-[var(--text-primary)] transition-colors cursor-pointer"
                          title="Delete debt"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}
        </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Add / Edit Debt Modal */}
      {debtModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-md">
          <div
            className="w-full max-w-sm rounded-[24px] p-5 space-y-4"
            style={{
              background: "var(--bg-elevated)",
              border: "1px solid var(--glass-border)",
              boxShadow: "var(--shadow-card), 0 16px 40px var(--shadow-strength)",
            }}
          >
            <div className="flex items-center justify-between">
              <h3
                className="text-[14px] font-semibold"
                style={{ color: "var(--text-primary)" }}
              >
                {editingDebtId ? "Edit Debt Item" : "Add Debt Item"}
              </h3>
              <button
                type="button"
                onClick={() => setDebtModalOpen(false)}
                className="p-1 rounded-lg text-[var(--text-tertiary)] hover:text-[var(--text-primary)] transition-colors cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleSaveDebtForm} className="space-y-3">
              <div>
                <label
                  className="text-[10px] font-bold uppercase tracking-wider block mb-1"
                  style={{ color: "var(--text-tertiary)" }}
                >
                  Debt Name / Label
                </label>
                <input
                  type="text"
                  placeholder="e.g. BCA Credit Card, Shopee PayLater"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl text-[12px] font-bold bg-transparent focus:outline-none"
                  style={{
                    border: "1px solid var(--glass-border)",
                    color: "var(--text-primary)",
                  }}
                  required
                />
              </div>

              <div>
                <label
                  className="text-[10px] font-bold uppercase tracking-wider block mb-1"
                  style={{ color: "var(--text-tertiary)" }}
                >
                  Remaining Principal Balance (Rp)
                </label>
                <input
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  placeholder="e.g. 10.000.000"
                  value={formBalance}
                  onChange={(e) => {
                    const raw = e.target.value.replace(/\D/g, "");
                    const num = raw ? parseInt(raw, 10) : 0;
                    setFormBalance(num ? num.toLocaleString("id-ID") : "");
                  }}
                  className="w-full px-3 py-2 rounded-xl text-[13px] font-semibold bg-transparent focus:outline-none"
                  style={{
                    border: "1px solid var(--glass-border)",
                    color: "var(--text-primary)",
                  }}
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label
                    className="text-[10px] font-bold uppercase tracking-wider block mb-1"
                    style={{ color: "var(--text-tertiary)" }}
                  >
                    Monthly Min Pay (Rp)
                  </label>
                  <input
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    placeholder="e.g. 500.000"
                    value={formMinPay}
                    onChange={(e) => {
                      const raw = e.target.value.replace(/\D/g, "");
                      const num = raw ? parseInt(raw, 10) : 0;
                      setFormMinPay(num ? num.toLocaleString("id-ID") : "");
                    }}
                    className="w-full px-3 py-2 rounded-xl text-[12px] font-semibold bg-transparent focus:outline-none"
                    style={{
                      border: "1px solid var(--glass-border)",
                      color: "var(--text-primary)",
                    }}
                    required
                  />
                </div>

                <div>
                  <label
                    className="text-[10px] font-bold uppercase tracking-wider block mb-1"
                    style={{ color: "var(--text-tertiary)" }}
                  >
                    Interest APR (%)
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    placeholder="e.g. 24"
                    value={formApr}
                    onChange={(e) => setFormApr(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl text-[12px] font-semibold bg-transparent focus:outline-none"
                    style={{
                      border: "1px solid var(--glass-border)",
                      color: "var(--text-primary)",
                    }}
                    required
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setDebtModalOpen(false)}
                  className="px-3.5 py-1.5 rounded-xl text-[11px] font-bold"
                  style={{ color: "var(--text-tertiary)" }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 rounded-xl text-[11px] font-semibold active:scale-95 transition-transform"
                  style={{
                    background: "var(--accent)",
                    color: "var(--accent-ink)",
                  }}
                >
                  Save Debt
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </section>
  );
}
