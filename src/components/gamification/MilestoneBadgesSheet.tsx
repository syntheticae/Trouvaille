import { useState } from "react";
import {
  Flame,
  Award,
  Zap,
  ShieldCheck,
  Shield,
  TrendingUp,
  Users,
  Target,
  Scale,
  Lock,
  Check,
  Calendar,
  Sparkles,
} from "lucide-react";
import { BottomSheet } from "../ui/BottomSheet";
import { triggerHaptic } from "../../lib/haptics";
import type { Milestone, MilestoneSummary } from "../../hooks/useMilestones";
import { format, subDays } from "date-fns";
import { id as idLocale } from "date-fns/locale";

interface MilestoneBadgesSheetProps {
  isOpen: boolean;
  onClose: () => void;
  milestoneSummary: MilestoneSummary;
  streak: number;
  loggedToday: boolean;
  loggedDates?: Set<string>;
}

export function MilestoneBadgesSheet({
  isOpen,
  onClose,
  milestoneSummary,
  streak,
  loggedToday,
  loggedDates = new Set(),
}: MilestoneBadgesSheetProps) {
  const [selectedMilestone, setSelectedMilestone] = useState<Milestone | null>(
    null,
  );

  const { milestones, totalUnlocked, totalMilestones, completionPct } =
    milestoneSummary;

  // Last 7 days micro-calendar representation
  const last7Days = Array.from({ length: 7 }, (_, i) => {
    const d = subDays(new Date(), 6 - i);
    const dateStr = format(d, "yyyy-MM-dd");
    const isLogged = loggedDates.has(dateStr);
    const isCurrentDay = i === 6;
    return {
      date: d,
      dateStr,
      dayLabel: format(d, "EE", { locale: idLocale }),
      dayNumber: format(d, "d"),
      isLogged,
      isCurrentDay,
    };
  });

  const renderMilestoneIcon = (iconName: Milestone["iconName"], size = 18) => {
    const props = { size, strokeWidth: 1.75, className: "text-[var(--text-primary)]" };
    switch (iconName) {
      case "Zap":
        return <Zap {...props} />;
      case "Flame":
        return <Flame {...props} />;
      case "Award":
        return <Award {...props} />;
      case "ShieldCheck":
        return <ShieldCheck {...props} />;
      case "Shield":
        return <Shield {...props} />;
      case "TrendingUp":
        return <TrendingUp {...props} />;
      case "Users":
        return <Users {...props} />;
      case "Target":
        return <Target {...props} />;
      case "Scale":
        return <Scale {...props} />;
      default:
        return <Award {...props} />;
    }
  };

  return (
    <BottomSheet isOpen={isOpen} onClose={onClose} title="Prestasi & Konsistensi">
      <div className="p-4 space-y-4 pb-10">
        {/* 1. STREAK HERO CARD */}
        <section
          className="p-4 rounded-[22px] border relative overflow-hidden"
          style={{
            background: "var(--glass-fill)",
            borderColor: "var(--glass-border)",
          }}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div
                className="w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 border"
                style={{
                  background: "var(--bg-elevated)",
                  borderColor: "var(--glass-border)",
                }}
              >
                <Flame size={20} strokeWidth={1.75} className="text-[var(--text-primary)]" />
              </div>
              <div>
                <span className="text-[10px] font-semibold uppercase tracking-wider text-[var(--text-tertiary)] block">
                  Daily Logging Streak
                </span>
                <div className="flex items-baseline gap-1.5 mt-0.5">
                  <span className="text-[24px] font-semibold text-[var(--text-primary)] amount leading-none">
                    {streak}
                  </span>
                  <span className="text-[13px] font-medium text-[var(--text-secondary)]">
                    Consecutive Days
                  </span>
                </div>
              </div>
            </div>

            <div
              className="px-2.5 py-1 rounded-full text-[10px] font-semibold flex items-center gap-1 border"
              style={{
                background: loggedToday
                  ? "var(--bg-elevated)"
                  : "var(--glass-fill)",
                borderColor: "var(--glass-border)",
                color: loggedToday
                  ? "var(--text-primary)"
                  : "var(--text-tertiary)",
              }}
            >
              {loggedToday ? (
                <>
                  <Check size={11} strokeWidth={2} />
                  <span>Logged Today</span>
                </>
              ) : (
                <>
                  <Calendar size={11} strokeWidth={1.75} />
                  <span>Not Logged Today</span>
                </>
              )}
            </div>
          </div>

          {/* Micro 7-Day Consistency Tracker */}
          <div className="mt-3 pt-3 border-t border-white/5">
            <div className="flex justify-between items-center mb-1.5 text-[10px] text-[var(--text-tertiary)]">
              <span>Last 7 Days Consistency</span>
              <span className="font-semibold text-[var(--text-secondary)]">
                {last7Days.filter((d) => d.isLogged).length}/7 Days Active
              </span>
            </div>
            <div className="grid grid-cols-7 gap-1.5 text-center">
              {last7Days.map((item) => (
                <div
                  key={item.dateStr}
                  className={`p-1.5 rounded-xl border flex flex-col items-center justify-between transition-all ${
                    item.isLogged
                      ? "border-[var(--glass-border)] bg-white/[0.06]"
                      : "border-transparent bg-white/[0.02] opacity-50"
                  }`}
                >
                  <span className="text-[9px] font-semibold uppercase text-[var(--text-tertiary)]">
                    {item.dayLabel.slice(0, 3)}
                  </span>
                  <div
                    className={`w-5 h-5 rounded-full flex items-center justify-center my-0.5 text-[10px] font-semibold ${
                      item.isLogged
                        ? "bg-[var(--text-primary)] text-[var(--bg-elevated)]"
                        : "text-[var(--text-tertiary)]"
                    }`}
                  >
                    {item.isLogged ? (
                      <Check size={10} strokeWidth={2.5} />
                    ) : (
                      item.dayNumber
                    )}
                  </div>
                  {item.isCurrentDay && (
                    <span className="w-1 h-1 rounded-full bg-[var(--text-primary)]" />
                  )}
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* 2. OVERALL COMPLETION PROGRESS */}
        <section
          className="p-3.5 rounded-2xl border"
          style={{
            background: "var(--glass-fill)",
            borderColor: "var(--glass-border)",
          }}
        >
          <div className="flex justify-between items-center text-[12px] mb-1.5">
            <div className="flex items-center gap-1.5">
              <Sparkles size={13} strokeWidth={1.75} className="text-[var(--text-primary)]" />
              <span className="font-semibold text-[var(--text-primary)]">
                Financial Achievements
              </span>
            </div>
            <span className="font-semibold text-[var(--text-primary)] amount">
              {totalUnlocked} / {totalMilestones} ({completionPct}%)
            </span>
          </div>

          <div className="w-full h-2 rounded-full overflow-hidden bg-white/10">
            <div
              className="h-full rounded-full bg-[var(--text-primary)] transition-all duration-700"
              style={{ width: `${completionPct}%` }}
            />
          </div>
        </section>

        {/* 3. MILESTONE DETAIL MODAL / PREVIEW */}
        {selectedMilestone && (
          <div
            className="p-3.5 rounded-2xl border transition-all animate-fadeIn"
            style={{
              background: "var(--bg-elevated)",
              borderColor: "var(--glass-border)",
            }}
          >
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-2.5">
                <div
                  className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 border"
                  style={{
                    background: "var(--glass-fill)",
                    borderColor: "var(--glass-border)",
                  }}
                >
                  {renderMilestoneIcon(selectedMilestone.iconName, 18)}
                </div>
                <div>
                  <h4 className="text-[13px] font-semibold text-[var(--text-primary)] leading-tight">
                    {selectedMilestone.title}
                  </h4>
                  <span className="text-[10px] font-semibold uppercase text-[var(--text-tertiary)]">
                    Criteria: {selectedMilestone.criteria}
                  </span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSelectedMilestone(null)}
                className="text-[11px] text-[var(--text-tertiary)] hover:text-[var(--text-primary)] px-2 py-0.5 rounded cursor-pointer"
              >
                Close
              </button>
            </div>

            <p className="text-[11px] text-[var(--text-secondary)] mt-2 leading-relaxed">
              {selectedMilestone.description}
            </p>

            <div className="mt-2.5 pt-2 border-t border-white/5 flex items-center justify-between text-[10px]">
              <span className="text-[var(--text-tertiary)]">
                Current Status:{" "}
                <strong className="text-[var(--text-primary)] font-semibold">
                  {selectedMilestone.currentValueText}
                </strong>
              </span>
              <span
                className="px-2 py-0.5 rounded-full font-semibold uppercase"
                style={{
                  background: selectedMilestone.isUnlocked
                    ? "var(--glass-fill)"
                    : "white/5",
                  color: selectedMilestone.isUnlocked
                    ? "var(--text-primary)"
                    : "var(--text-tertiary)",
                  border: "1px solid var(--glass-border)",
                }}
              >
                {selectedMilestone.isUnlocked
                  ? "Unlocked"
                  : `Progress ${selectedMilestone.progressPct}%`}
              </span>
            </div>
          </div>
        )}

        {/* 4. BADGES GRID */}
        <div className="grid grid-cols-3 gap-2.5">
          {milestones.map((m) => {
            const isSelected = selectedMilestone?.id === m.id;
            return (
              <button
                key={m.id}
                type="button"
                onClick={() => {
                  triggerHaptic("light");
                  setSelectedMilestone(isSelected ? null : m);
                }}
                className={`p-3 rounded-2xl border text-left flex flex-col items-center justify-between transition-all cursor-pointer active:scale-95 relative overflow-hidden ${
                  m.isUnlocked
                    ? isSelected
                      ? "border-[var(--text-primary)] bg-white/[0.08]"
                      : "border-[var(--glass-border)] bg-[var(--glass-fill)]"
                    : "border-white/5 bg-white/[0.02] opacity-60"
                }`}
                style={{ minHeight: "116px" }}
              >
                {/* Status Indicator Icon */}
                <div className="w-full flex justify-between items-start">
                  <div
                    className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 border ${
                      m.isUnlocked
                        ? "border-[var(--glass-border)] bg-[var(--bg-elevated)]"
                        : "border-transparent bg-white/5"
                    }`}
                  >
                    {renderMilestoneIcon(m.iconName, 16)}
                  </div>
                  {m.isUnlocked ? (
                    <div className="w-4 h-4 rounded-full bg-[var(--text-primary)] flex items-center justify-center">
                      <Check size={9} strokeWidth={3} className="text-[var(--bg-elevated)]" />
                    </div>
                  ) : (
                    <div className="w-4 h-4 rounded-full bg-white/10 flex items-center justify-center">
                      <Lock size={9} strokeWidth={2} className="text-[var(--text-tertiary)]" />
                    </div>
                  )}
                </div>

                <div className="w-full text-center mt-2">
                  <h5 className="text-[11px] font-semibold text-[var(--text-primary)] leading-tight line-clamp-1">
                    {m.title}
                  </h5>
                  <p className="text-[9px] text-[var(--text-tertiary)] mt-0.5 line-clamp-1">
                    {m.isUnlocked ? "Unlocked" : `${m.progressPct}% Complete`}
                  </p>
                </div>

                {/* Micro Progress Line for locked badges */}
                {!m.isUnlocked && (
                  <div className="w-full h-1 rounded-full overflow-hidden bg-white/10 mt-1.5">
                    <div
                      className="h-full rounded-full bg-[var(--text-tertiary)]"
                      style={{ width: `${m.progressPct}%` }}
                    />
                  </div>
                )}
              </button>
            );
          })}
        </div>

        {/* 5. FOOTER ENCOURAGEMENT */}
        <p className="text-[10px] text-[var(--text-tertiary)] text-center leading-relaxed pt-1">
          Consistent transaction logging enhances forecast precision, safeguards emergency reserves, and builds durable financial habits.
        </p>
      </div>
    </BottomSheet>
  );
}
