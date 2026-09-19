import { useState, useMemo } from "react";
import { Plus, Trash2, Check, Bell, Calendar as CalendarIcon } from "lucide-react";
import { BottomSheet } from "../ui/BottomSheet";
import { GlassDatePicker } from "../ui/GlassDatePicker";
import { DetectedRecurringSection } from "../bills/DetectedRecurringSection";
import {
  useBills,
  useAddBill,
  useUpdateBill,
  useDeleteBill,
  useMarkBillPaid,
} from "../../hooks/useBills";
import { useAllTransactions } from "../../hooks/useTransactions";
import { useCategories } from "../../hooks/useCategories";
import {
  detectRecurringTransactions,
  type DetectedRecurringItem,
} from "../../lib/financialMath";
import type { RepeatRule } from "../../lib/types";
import { formatRupiah } from "../../lib/utils";
import { triggerHaptic } from "../../lib/haptics";
import { useToast } from "../../contexts/ToastContext";
import { format, parseISO } from "date-fns";

interface BillManagementSheetsProps {
  isOpen: boolean;
  onClose: () => void;
}

export function BillManagementSheets({
  isOpen,
  onClose,
}: BillManagementSheetsProps) {
  const { data: bills = [] } = useBills();
  const addBill = useAddBill();
  const updateBill = useUpdateBill();
  const deleteBill = useDeleteBill();
  const markBillPaid = useMarkBillPaid();
  const { data: allTxs = [] } = useAllTransactions();
  const { data: categories = [] } = useCategories();
  const { showToast } = useToast();

  const [billSheetOpen, setBillSheetOpen] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [editingBill, setEditingBill] = useState<any>(null);

  const [billTitle, setBillTitle] = useState("");
  const [billAmount, setBillAmount] = useState("");
  const [billDate, setBillDate] = useState<Date>(new Date());
  const [billRepeat, setBillRepeat] = useState<
    "none" | "weekly" | "monthly" | "yearly"
  >("monthly");
  const [billIsPaid, setBillIsPaid] = useState(false);

  const [ignoredRecurringIds, setIgnoredRecurringIds] = useState<string[]>(
    () => {
      try {
        const raw = localStorage.getItem("trouvaille_ignored_recurring_ids");
        return raw ? JSON.parse(raw) : [];
      } catch {
        return [];
      }
    },
  );
  const [confirmingRecurringId, setConfirmingRecurringId] = useState<
    string | null
  >(null);

  const persistIgnoredRecurringIds = (nextIds: string[]) => {
    setIgnoredRecurringIds(nextIds);
    localStorage.setItem(
      "trouvaille_ignored_recurring_ids",
      JSON.stringify(nextIds),
    );
  };

  const detectedRecurringItems = useMemo(() => {
    return detectRecurringTransactions(
      allTxs,
      bills,
      categories,
      new Date(),
    ).filter(
      (item) =>
        item.type === "expense" &&
        item.status === "detected" &&
        !ignoredRecurringIds.includes(item.id),
    );
  }, [allTxs, bills, categories, ignoredRecurringIds]);

  const handleIgnoreRecurring = (item: DetectedRecurringItem) => {
    if (ignoredRecurringIds.includes(item.id)) return;
    persistIgnoredRecurringIds([...ignoredRecurringIds, item.id]);
    triggerHaptic("light");
    showToast(
      `${item.title} hidden from recurring suggestions`,
      "update",
      () => {},
    );
  };

  const mapRecurringFrequencyToBillRule = (
    frequency: DetectedRecurringItem["frequency"],
  ): RepeatRule => {
    if (frequency === "weekly") return "weekly";
    if (frequency === "monthly") return "monthly";
    if (frequency === "yearly") return "yearly";
    return "none";
  };

  const handleConfirmRecurring = (item: DetectedRecurringItem) => {
    const repeatRule = mapRecurringFrequencyToBillRule(item.frequency);
    const note =
      repeatRule === "none"
        ? `Detected ${item.frequency} recurring pattern from transaction history. Review cadence manually after confirmation.`
        : `Confirmed from detected ${item.frequency} recurring transaction pattern.`;

    setConfirmingRecurringId(item.id);
    addBill.mutate(
      {
        title: item.title,
        amount: Math.round(item.typicalAmount),
        due_date: item.nextExpectedDate,
        repeat_rule: repeatRule,
        note,
        is_paid: false,
      },
      {
        onSuccess: () => {
          setConfirmingRecurringId(null);
          triggerHaptic("medium");
          showToast(`${item.title} added to recurring bills`, "add", () => {});
        },
        onError: () => {
          setConfirmingRecurringId(null);
          showToast(
            "Failed to confirm detected recurring item",
            "delete",
            () => {},
          );
        },
      },
    );
  };

  const handleOpenAddBill = () => {
    setEditingBill(null);
    setBillTitle("");
    setBillAmount("");
    setBillDate(new Date());
    setBillRepeat("monthly");
    setBillIsPaid(false);
    setBillSheetOpen(true);
  };

  const handleOpenEditBill = (b: any) => {
    setEditingBill(b);
    setBillTitle(b.title || "");
    setBillAmount(b.amount ? String(b.amount) : "");
    setBillDate(b.due_date ? parseISO(b.due_date) : new Date());
    setBillRepeat(b.repeat_rule || "monthly");
    setBillIsPaid(!!b.is_paid);
    setBillSheetOpen(true);
  };

  const handleSaveBill = () => {
    if (!billTitle) return;
    const num = Number(billAmount);
    const payload = {
      title: billTitle,
      amount: num > 0 ? num : null,
      due_date: format(billDate, "yyyy-MM-dd"),
      repeat_rule: billRepeat,
      is_paid: billIsPaid,
    };
    if (editingBill) {
      updateBill.mutate(
        { id: editingBill.id, ...payload },
        {
          onSuccess: () => {
            setBillSheetOpen(false);
            setEditingBill(null);
            setBillTitle("");
            setBillAmount("");
            showToast("Bill updated", "update", () => {});
          },
        },
      );
    } else {
      addBill.mutate(payload, {
        onSuccess: () => {
          setBillSheetOpen(false);
          setBillTitle("");
          setBillAmount("");
          showToast("Bill created", "add", () => {});
        },
      });
    }
  };

  return (
    <>
      {/* Bill List Sheet */}
      <BottomSheet isOpen={isOpen} onClose={onClose}>
        <div className="p-5 pb-16 space-y-4">
          <div className="flex items-center justify-between sticky top-0 bg-transparent z-10 pb-2">
            <div>
              <h3
                className="font-semibold text-lg"
                style={{ color: "var(--text-primary)" }}
              >
                Recurring Bills
              </h3>
              <p
                className="text-[11px] font-semibold mt-0.5"
                style={{ color: "var(--text-tertiary)" }}
              >
                {bills.filter((b: any) => !b.is_paid).length} unpaid ·{" "}
                {bills.filter((b: any) => b.is_paid).length} paid
              </p>
            </div>
            <button
              onClick={() => {
                onClose();
                setTimeout(() => handleOpenAddBill(), 300);
              }}
              className="w-8 h-8 rounded-full flex items-center justify-center font-bold shadow-md active:scale-95 cursor-pointer"
              style={{
                background: "var(--accent)",
                color: "var(--accent-ink)",
              }}
            >
              <Plus size={16} />
            </button>
          </div>
          <div className="space-y-2 pb-6">
            <DetectedRecurringSection
              items={detectedRecurringItems}
              confirmingId={confirmingRecurringId}
              onConfirm={handleConfirmRecurring}
              onIgnore={handleIgnoreRecurring}
            />
            {bills.map((b: any) => {
              const isPaid = !!b.is_paid;
              const isTogglingBill =
                markBillPaid.isPending &&
                markBillPaid.variables?.bill.id === b.id;
              return (
                <div
                  key={b.id}
                  onClick={() => {
                    onClose();
                    setTimeout(() => handleOpenEditBill(b), 300);
                  }}
                  className="glass-surface p-3.5 rounded-2xl flex items-center justify-between cursor-pointer active:scale-98 transition-all"
                  style={{ opacity: isPaid ? 0.75 : 1 }}
                >
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    <div
                      className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
                      style={{
                        background: isPaid
                          ? "rgba(16, 185, 129, 0.15)"
                          : "var(--bg-elevated)",
                        border: isPaid
                          ? "1px solid rgba(16, 185, 129, 0.3)"
                          : "1px solid var(--glass-border)",
                        color: isPaid ? "#34d399" : "var(--text-tertiary)",
                      }}
                    >
                      {isPaid ? <Check size={20} /> : <Bell size={20} />}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <p
                          className={`font-bold text-[14px] truncate ${isPaid ? "line-through text-neutral-400" : ""}`}
                          style={{
                            color: isPaid
                              ? "var(--text-tertiary)"
                              : "var(--text-primary)",
                          }}
                        >
                          {b.title}
                        </p>
                        {isPaid && (
                          <span className="px-1.5 py-0.5 rounded-md text-[9px] font-semibold uppercase bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                            Paid
                          </span>
                        )}
                      </div>
                      <p
                        className="text-[11px] font-semibold mt-0.5"
                        style={{ color: "var(--text-tertiary)" }}
                      >
                        <span className="capitalize">{b.repeat_rule}</span> ·
                        Due {b.due_date} · {formatRupiah(Number(b.amount || 0))}
                      </p>
                    </div>
                  </div>
                  <div
                    className="flex items-center gap-1.5 shrink-0 ml-2"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <button
                      onClick={() => {
                        markBillPaid.mutate(
                          { bill: b, paid: !isPaid },
                          {
                            onSuccess: () => {
                              showToast(
                                isPaid
                                  ? `Marked ${b.title} as unpaid`
                                  : `Marked ${b.title} as paid`,
                                "update",
                                () => {},
                              );
                            },
                            onError: (error: any) => {
                              showToast(
                                error?.message || `Failed to update ${b.title}`,
                                "delete",
                                () => {},
                              );
                            },
                          },
                        );
                        triggerHaptic("medium");
                      }}
                      disabled={isTogglingBill}
                      className="text-[11px] font-semibold px-2.5 py-1.5 rounded-full flex items-center gap-1 active:scale-95 transition-all disabled:opacity-60 disabled:cursor-not-allowed cursor-pointer"
                      style={{
                        background: isPaid
                          ? "var(--glass-fill-strong)"
                          : "var(--accent)",
                        color: isPaid
                          ? "var(--text-secondary)"
                          : "var(--accent-ink)",
                        border: isPaid
                          ? "1px solid var(--glass-border)"
                          : "none",
                      }}
                      title={
                        isPaid ? "Tandai Belum Bayar" : "Tandai Sudah Bayar"
                      }
                    >
                      <Check size={12} />
                      <span>
                        {isTogglingBill
                          ? "Saving..."
                          : isPaid
                            ? "Unmark"
                            : "Paid"}
                      </span>
                    </button>
                    <button
                      onClick={() => {
                        showToast("Bill deleted", "delete", () =>
                          deleteBill.mutate(b.id),
                        );
                      }}
                      className="w-8 h-8 rounded-full flex items-center justify-center active:scale-95 cursor-pointer"
                      style={{
                        background: "rgba(239, 68, 68, 0.12)",
                        color: "#ef4444",
                      }}
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              );
            })}
            {bills.length === 0 && (
              <p
                className="text-sm text-center py-4"
                style={{ color: "var(--text-tertiary)" }}
              >
                No recurring bills registered.
              </p>
            )}
          </div>
        </div>
      </BottomSheet>

      {/* Add/Edit Bill Sheet */}
      <BottomSheet
        isOpen={billSheetOpen}
        onClose={() => setBillSheetOpen(false)}
      >
        <div className="p-5 pb-16 space-y-4">
          <h3
            className="font-semibold text-lg"
            style={{ color: "var(--text-primary)" }}
          >
            {editingBill ? "Edit Recurring Bill" : "Add Recurring Bill"}
          </h3>
          <div>
            <label
              className="text-[11px] font-bold uppercase tracking-wider mb-1.5 block px-1"
              style={{ color: "var(--text-tertiary)" }}
            >
              Bill Title
            </label>
            <input
              type="text"
              value={billTitle}
              onChange={(e) => setBillTitle(e.target.value)}
              placeholder="e.g. Netflix, Gym, Internet"
              className="w-full p-3.5 rounded-2xl outline-none font-semibold text-[15px]"
              style={{
                background: "var(--bg-elevated)",
                border: "1px solid var(--glass-border)",
                color: "var(--text-primary)",
              }}
            />
          </div>
          <div>
            <label
              className="text-[11px] font-bold uppercase tracking-wider mb-1.5 block px-1"
              style={{ color: "var(--text-tertiary)" }}
            >
              Nominal Amount (IDR)
            </label>
            <input
              type="text"
              inputMode="numeric"
              pattern="[0-9]*"
              value={billAmount ? formatRupiah(Number(billAmount)) : ""}
              onChange={(e) => {
                const raw = e.target.value.replace(/[^0-9]/g, "");
                setBillAmount(raw);
              }}
              placeholder="Rp 0"
              className="w-full p-3.5 rounded-2xl outline-none font-bold text-[16px] amount"
              style={{
                background: "var(--bg-elevated)",
                border: "1px solid var(--glass-border)",
                color: "var(--text-primary)",
              }}
            />
          </div>
          <div>
            <label
              className="text-[11px] font-bold uppercase tracking-wider mb-1.5 block px-1"
              style={{ color: "var(--text-tertiary)" }}
            >
              Payment Status
            </label>
            <div
              className="flex p-1 rounded-2xl"
              style={{
                background: "var(--bg-elevated)",
                border: "1px solid var(--glass-border)",
              }}
            >
              <button
                type="button"
                onClick={() => setBillIsPaid(false)}
                className="flex-1 py-2 rounded-xl text-[11px] font-bold transition-all cursor-pointer"
                style={{
                  background: !billIsPaid ? "var(--accent)" : "transparent",
                  color: !billIsPaid
                    ? "var(--accent-ink)"
                    : "var(--text-tertiary)",
                }}
              >
                Unpaid (Belum)
              </button>
              <button
                type="button"
                onClick={() => setBillIsPaid(true)}
                className="flex-1 py-2 rounded-xl text-[11px] font-bold transition-all flex items-center justify-center gap-1 cursor-pointer"
                style={{
                  background: billIsPaid ? "var(--accent)" : "transparent",
                  color: billIsPaid
                    ? "var(--accent-ink)"
                    : "var(--text-tertiary)",
                }}
              >
                <Check size={12} />
                <span>Paid (Sudah Bayar)</span>
              </button>
            </div>
          </div>
          <div>
            <label
              className="text-[11px] font-bold uppercase tracking-wider mb-1.5 block px-1"
              style={{ color: "var(--text-tertiary)" }}
            >
              Due Date
            </label>
            <button
              onClick={() => setPickerOpen(true)}
              className="w-full p-3.5 rounded-2xl flex justify-between items-center cursor-pointer"
              style={{
                background: "var(--bg-elevated)",
                border: "1px solid var(--glass-border)",
                color: "var(--text-primary)",
              }}
            >
              <span className="font-medium text-sm">
                Due Date: {format(billDate, "dd MMM yyyy")}
              </span>
              <CalendarIcon size={18} style={{ color: "var(--accent)" }} />
            </button>
          </div>
          <div>
            <label
              className="text-[11px] font-bold uppercase tracking-wider mb-1.5 block px-1"
              style={{ color: "var(--text-tertiary)" }}
            >
              Repeat Frequency
            </label>
            <div
              className="flex p-1 rounded-2xl"
              style={{
                background: "var(--bg-elevated)",
                border: "1px solid var(--glass-border)",
              }}
            >
              {(["none", "weekly", "monthly", "yearly"] as const).map((r) => (
                <button
                  key={r}
                  onClick={() => setBillRepeat(r)}
                  className="flex-1 py-2 rounded-xl text-[11px] font-bold transition-all cursor-pointer"
                  style={{
                    background:
                      billRepeat === r ? "var(--accent)" : "transparent",
                    color:
                      billRepeat === r
                        ? "var(--accent-ink)"
                        : "var(--text-tertiary)",
                  }}
                >
                  {r === "none"
                    ? "None"
                    : r === "weekly"
                      ? "Weekly"
                      : r === "monthly"
                        ? "Monthly"
                        : "Yearly"}
                </button>
              ))}
            </div>
          </div>
          <button
            onClick={handleSaveBill}
            className="w-full py-4 rounded-[20px] font-semibold text-[15px] shadow-lg active:scale-95 cursor-pointer"
            style={{ background: "var(--accent)", color: "var(--accent-ink)" }}
          >
            {editingBill ? "Update Bill" : "Save Bill"}
          </button>
        </div>
      </BottomSheet>

      {/* Date Picker Sheet for Bills */}
      <BottomSheet isOpen={pickerOpen} onClose={() => setPickerOpen(false)}>
        <div className="p-5 pb-10 flex flex-col items-center">
          <h3
            className="font-semibold text-lg mb-4"
            style={{ color: "var(--text-primary)" }}
          >
            Select Due Date
          </h3>
          <GlassDatePicker
            date={billDate}
            onChange={(d) => {
              setBillDate(d);
              setPickerOpen(false);
            }}
          />
        </div>
      </BottomSheet>
    </>
  );
}
