import { BottomSheet } from "./BottomSheet";
import { Bell, CheckCircle2, Calendar } from "lucide-react";
import { useUpcomingBills, getBillDueStatusLabel } from "../../hooks/useBills";
import { formatRupiah } from "../../lib/utils";
import { format } from "date-fns";

interface NotificationSheetProps {
  isOpen: boolean;
  onClose: () => void;
}

export function NotificationSheet({ isOpen, onClose }: NotificationSheetProps) {
  const upcomingBills = useUpcomingBills();
  const lastSyncedAt = localStorage.getItem("trouvaille_last_synced");
  const syncLabel = lastSyncedAt
    ? format(new Date(lastSyncedAt), "dd MMM yyyy, HH:mm")
    : null;

  return (
    <BottomSheet isOpen={isOpen} onClose={onClose}>
      <div className="p-5 pb-28 space-y-4">
        <div
          className="flex items-center justify-between pb-4"
          style={{ borderBottom: "1px solid var(--glass-border)" }}
        >
          <div className="flex items-center gap-2.5">
            <div
              className="w-8 h-8 rounded-full flex items-center justify-center"
              style={{
                background: "var(--glass-fill-strong)",
                color: "var(--text-primary)",
              }}
            >
              <Bell size={16} />
            </div>
            <div>
              <h3
                className="font-semibold text-[16px]"
                style={{ color: "var(--text-primary)" }}
              >
                Notifications
              </h3>
              <p
                className="text-[11px]"
                style={{ color: "var(--text-tertiary)" }}
              >
                Stay on top of your finances
              </p>
            </div>
          </div>
          <span
            className="text-[11px] font-bold px-2.5 py-1 rounded-full"
            style={{
              background: "var(--glass-fill)",
              color: "var(--text-secondary)",
              border: "1px solid var(--glass-border)",
            }}
          >
            {upcomingBills.length} Active
          </span>
        </div>

        {/* Bill Reminders */}
        {upcomingBills.length > 0 && (
          <div className="space-y-2">
            <span
              className="text-[12px] font-bold"
              style={{ color: "var(--text-tertiary)" }}
            >
              Bill Reminders
            </span>
            {upcomingBills.map((bill: any) => {
              const dueStatusLabel = getBillDueStatusLabel(bill.due_date);
              return (
                <div
                  key={bill.id}
                  className="p-3.5 rounded-2xl flex items-start gap-3"
                  style={{
                    background: "var(--bg-elevated)",
                    border: "1px solid var(--glass-border)",
                  }}
                >
                  <div
                    className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0 mt-0.5"
                    style={{
                      background: "var(--glass-fill-strong)",
                      color: "var(--text-primary)",
                    }}
                  >
                    <Calendar size={15} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p
                      className="text-[13px] font-bold truncate"
                      style={{ color: "var(--text-primary)" }}
                    >
                      {bill.title}
                    </p>
                    <p
                      className="text-[11px]"
                      style={{ color: "var(--text-tertiary)" }}
                    >
                      {dueStatusLabel} · {formatRupiah(Number(bill.amount))}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Sync Status */}
        <div className="space-y-2">
          <span
            className="text-[12px] font-bold"
            style={{ color: "var(--text-tertiary)" }}
          >
            Sync Status
          </span>

          <div
            className="p-3.5 rounded-2xl flex items-start gap-3"
            style={{
              background: "var(--bg-elevated)",
              border: "1px solid var(--glass-border)",
            }}
          >
            <div
              className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0 mt-0.5"
              style={{
                background: "rgba(255, 255, 255, 0.1)",
                color: "var(--text-secondary)",
              }}
            >
              <CheckCircle2 size={15} />
            </div>
            <div className="flex-1 min-w-0">
              <p
                className="text-[13px] font-bold"
                style={{ color: "var(--text-primary)" }}
              >
                Cloud Sync
              </p>
              <p
                className="text-[11px]"
                style={{ color: "var(--text-tertiary)" }}
              >
                {syncLabel
                  ? `Last synchronized on ${syncLabel}.`
                  : "No recorded sync timestamp yet."}
              </p>
            </div>
          </div>
        </div>
      </div>
    </BottomSheet>
  );
}
