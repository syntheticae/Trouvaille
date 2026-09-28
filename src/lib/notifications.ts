import { LocalNotifications } from '@capacitor/local-notifications'
import type { Bill, Category, Transaction } from './types'
import { parseISO, subDays, endOfMonth, addMonths, startOfMonth, format } from 'date-fns'
import { formatRupiah } from './utils'

export async function requestNotificationPermission(): Promise<boolean> {
  try {
    const status = await LocalNotifications.checkPermissions()
    if (status.display === 'granted') return true
    const res = await LocalNotifications.requestPermissions()
    return res.display === 'granted'
  } catch (e) {
    console.warn('LocalNotifications not supported on this platform:', e)
    return false
  }
}

export async function cancelAllBillNotifications(): Promise<void> {
  try {
    const pending = await LocalNotifications.getPending()
    if (pending.notifications.length > 0) {
      await LocalNotifications.cancel({ notifications: pending.notifications })
    }
  } catch (e) {
    console.warn('Failed to cancel bill notifications:', e)
  }
}

export async function syncBillNotifications(bills: Bill[]): Promise<void> {
  try {
    // Check if user disabled bill reminders in settings
    if (localStorage.getItem('trouvaille_bill_reminders_enabled') === 'false') {
      await cancelAllBillNotifications()
      return
    }

    const granted = await requestNotificationPermission()
    if (!granted) return

    // Cancel previously scheduled bill notifications
    await cancelAllBillNotifications()

    const notificationsToSchedule = []
    const now = new Date()

    for (let i = 0; i < bills.length; i++) {
      const bill = bills[i]
      if (bill.is_paid) continue

      const dueDate = parseISO(bill.due_date)
      if (isNaN(dueDate.getTime())) continue

      // 1. Notification 1 day before due date at 09:00 AM
      const dayBefore = subDays(dueDate, 1)
      dayBefore.setHours(9, 0, 0, 0)
      if (dayBefore > now) {
        notificationsToSchedule.push({
          id: (i * 2) + 1,
          title: `Upcoming Bill Tomorrow: ${bill.title}`,
          body: `Bill ${bill.title} (${bill.amount ? 'Rp ' + Number(bill.amount).toLocaleString('id-ID') : ''}) is due tomorrow!`,
          schedule: { at: dayBefore },
          sound: 'default',
        })
      }

      // 2. Notification on the Due Date at 09:00 AM
      const onDueDate = parseISO(bill.due_date)
      onDueDate.setHours(9, 0, 0, 0)
      if (onDueDate > now) {
        notificationsToSchedule.push({
          id: (i * 2) + 2,
          title: `Bill Due Today: ${bill.title}`,
          body: `Remember to pay ${bill.title} (${bill.amount ? 'Rp ' + Number(bill.amount).toLocaleString('id-ID') : ''}) today.`,
          schedule: { at: onDueDate },
          sound: 'default',
        })
      }
    }

    if (notificationsToSchedule.length > 0) {
      await LocalNotifications.schedule({ notifications: notificationsToSchedule })
    }
  } catch (e) {
    console.warn('Failed to sync bill notifications:', e)
  }
}

export const DAILY_REMINDER_NOTIFICATION_ID = 99999;
export const DAILY_REMINDER_TIME_KEY = "trouvaille_daily_reminder_time";

export function getDailyStreakReminderTime(): string {
  try {
    return localStorage.getItem(DAILY_REMINDER_TIME_KEY) || "20:00";
  } catch {
    return "20:00";
  }
}

export function setDailyStreakReminderTime(timeStr: string): void {
  try {
    localStorage.setItem(DAILY_REMINDER_TIME_KEY, timeStr);
  } catch (e) {
    console.warn("Failed to set daily streak reminder time:", e);
  }
}

export async function cancelDailyStreakReminder(): Promise<void> {
  try {
    const pending = await LocalNotifications.getPending();
    const exists = pending.notifications.some(
      (n) => n.id === DAILY_REMINDER_NOTIFICATION_ID,
    );
    if (exists) {
      await LocalNotifications.cancel({
        notifications: [{ id: DAILY_REMINDER_NOTIFICATION_ID }],
      });
    }
  } catch (e) {
    console.warn("Failed to cancel daily streak reminder:", e);
  }
}

export async function syncDailyStreakReminder(
  hasLoggedToday: boolean = false,
): Promise<void> {
  try {
    // Check if user disabled daily streak reminders in settings (default true)
    if (localStorage.getItem("trouvaille_daily_reminder_enabled") === "false") {
      await cancelDailyStreakReminder();
      return;
    }

    const granted = await requestNotificationPermission();
    if (!granted) return;

    // Parse customized reminder hour and minute (defaults to 20:00)
    const timeStr = getDailyStreakReminderTime();
    const [hStr, mStr] = timeStr.split(":");
    const hour = parseInt(hStr, 10) || 20;
    const minute = parseInt(mStr, 10) || 0;

    await cancelDailyStreakReminder();

    const now = new Date();
    const scheduledTime = new Date();
    scheduledTime.setHours(hour, minute, 0, 0);

    // If already logged today or if time has already passed today, start from tomorrow
    if (hasLoggedToday || scheduledTime <= now) {
      scheduledTime.setDate(scheduledTime.getDate() + 1);
    }

    await LocalNotifications.schedule({
      notifications: [
        {
          id: DAILY_REMINDER_NOTIFICATION_ID,
          title: "Maintain Your Financial Streak",
          body: "No transactions recorded today. Log your expenses now to keep your consistency streak active!",
          schedule: {
            at: scheduledTime,
            every: "day",
            allowWhileIdle: true,
          },
          sound: "default",
        },
      ],
    });
  } catch (e) {
    console.warn("Failed to sync daily streak reminder:", e);
  }
}

/**
 * Triggers an immediate native local notification on device (Lock Screen, Notification Center, Banner).
 * Used when Apple Shortcuts automations (Bank notification reader, Back Tap receipt scanner, Dialog input) complete.
 */
export async function showNativeLocalNotification({
  title,
  body,
  id,
}: {
  title: string;
  body: string;
  id?: number;
}): Promise<void> {
  try {
    const granted = await requestNotificationPermission();
    if (!granted) return;

    const notifId = id || Math.floor(Math.random() * 800000) + 100000;
    await LocalNotifications.schedule({
      notifications: [
        {
          id: notifId,
          title,
          body,
          schedule: { at: new Date(Date.now() + 100) },
          sound: "default",
        },
      ],
    });
  } catch (e) {
    console.warn("Failed to fire native local notification:", e);
  }
}

export const WEEKLY_DIGEST_NOTIFICATION_ID = 88888;
export const WEEKLY_DIGEST_ENABLED_KEY = "trouvaille_weekly_digest_enabled";

export async function cancelWeeklyDigestNotification(): Promise<void> {
  try {
    const pending = await LocalNotifications.getPending();
    const exists = pending.notifications.some((n) => n.id === WEEKLY_DIGEST_NOTIFICATION_ID);
    if (exists) {
      await LocalNotifications.cancel({ notifications: [{ id: WEEKLY_DIGEST_NOTIFICATION_ID }] });
    }
  } catch (e) {
    console.warn("Failed to cancel weekly digest notification:", e);
  }
}

export async function syncWeeklyDigestNotification(
  transactions: Transaction[] = [],
  isIndonesian: boolean = true,
): Promise<void> {
  try {
    if (localStorage.getItem(WEEKLY_DIGEST_ENABLED_KEY) === "false") {
      await cancelWeeklyDigestNotification();
      return;
    }

    const granted = await requestNotificationPermission();
    if (!granted) return;

    await cancelWeeklyDigestNotification();

    const now = new Date();
    const nextSunday = new Date();
    const dayOfWeek = now.getDay();
    const daysUntilSunday = (7 - dayOfWeek) % 7;
    if (daysUntilSunday === 0 && (now.getHours() > 19 || (now.getHours() === 19 && now.getMinutes() >= 30))) {
      nextSunday.setDate(now.getDate() + 7);
    } else {
      nextSunday.setDate(now.getDate() + (daysUntilSunday === 0 ? 0 : daysUntilSunday));
    }
    nextSunday.setHours(19, 30, 0, 0);

    const sevenDaysAgo = new Date(Date.now() - 7 * 86400000).toISOString().slice(0, 10);
    const weekExpense = transactions
      .filter((t) => t.type === "expense" && (t.occurred_on || t.created_at || "").slice(0, 10) >= sevenDaysAgo)
      .reduce((acc, t) => acc + Number(t.amount || 0), 0);

    const spendText = weekExpense > 0 ? formatRupiah(weekExpense) : "Rp 0";
    const notifTitle = isIndonesian ? "Rekap Finansial Mingguan" : "Weekly Financial Digest";
    const notifBody = isIndonesian
      ? `Pengeluaran 7 hari terakhir: ${spendText}. Ketuk untuk evaluasi performa dan alokasi kas Anda.`
      : `Total spend over the last 7 days: ${spendText}. Tap to review your performance.`;

    await LocalNotifications.schedule({
      notifications: [
        {
          id: WEEKLY_DIGEST_NOTIFICATION_ID,
          title: notifTitle,
          body: notifBody,
          schedule: {
            at: nextSunday,
            every: "week",
            allowWhileIdle: true,
          },
          sound: "default",
        },
      ],
    });
  } catch (e) {
    console.warn("Failed to sync weekly digest notification:", e);
  }
}

export const MONTH_END_NOTIFICATION_ID = 77777;
export const MONTH_END_REVIEW_ENABLED_KEY = "trouvaille_month_end_review_enabled";

export async function cancelMonthEndReviewNotification(): Promise<void> {
  try {
    const pending = await LocalNotifications.getPending();
    const exists = pending.notifications.some((n) => n.id === MONTH_END_NOTIFICATION_ID);
    if (exists) {
      await LocalNotifications.cancel({ notifications: [{ id: MONTH_END_NOTIFICATION_ID }] });
    }
  } catch (e) {
    console.warn("Failed to cancel month-end review notification:", e);
  }
}

export async function syncMonthEndReviewNotification(
  isIndonesian: boolean = true,
): Promise<void> {
  try {
    if (localStorage.getItem(MONTH_END_REVIEW_ENABLED_KEY) === "false") {
      await cancelMonthEndReviewNotification();
      return;
    }

    const granted = await requestNotificationPermission();
    if (!granted) return;

    await cancelMonthEndReviewNotification();

    const now = new Date();
    let targetDate = endOfMonth(now);
    targetDate.setHours(20, 30, 0, 0);

    if (targetDate <= now) {
      targetDate = endOfMonth(addMonths(now, 1));
      targetDate.setHours(20, 30, 0, 0);
    }

    const notifTitle = isIndonesian ? "Evaluasi Akhir Bulan Siap" : "Month-End Wealth Review";
    const notifBody = isIndonesian
      ? "Bulan ini telah berakhir. Neraca Keuangan dan Laporan Arus Kas Anda siap ditinjau."
      : "This month has concluded. Your Balance Sheet and Cash Flow reports are ready.";

    await LocalNotifications.schedule({
      notifications: [
        {
          id: MONTH_END_NOTIFICATION_ID,
          title: notifTitle,
          body: notifBody,
          schedule: {
            at: targetDate,
            allowWhileIdle: true,
          },
          sound: "default",
        },
      ],
    });
  } catch (e) {
    console.warn("Failed to sync month-end review notification:", e);
  }
}

export const BUDGET_ALERTS_ENABLED_KEY = "trouvaille_budget_alerts_enabled";

export async function checkBudgetThresholdAlerts(
  transactions: Transaction[],
  categories: Category[],
  isIndonesian: boolean = true,
): Promise<void> {
  try {
    if (localStorage.getItem(BUDGET_ALERTS_ENABLED_KEY) === "false") return;

    const monthKey = format(new Date(), "yyyy-MM");
    const storageKey = `trouvaille_budget_alert_history_${monthKey}`;
    let alertHistory: Record<string, { reached80?: boolean; reached100?: boolean }> = {};
    try {
      const raw = localStorage.getItem(storageKey);
      if (raw) alertHistory = JSON.parse(raw);
    } catch {}

    const monthStart = format(startOfMonth(new Date()), "yyyy-MM-dd");
    const currentMonthExpenses = transactions.filter(
      (t) => t.type === "expense" && (t.occurred_on || t.created_at || "").slice(0, 10) >= monthStart,
    );

    const spendByCategory: Record<string, number> = {};
    currentMonthExpenses.forEach((t) => {
      if (t.category_id) {
        spendByCategory[t.category_id] = (spendByCategory[t.category_id] || 0) + Number(t.amount || 0);
      }
    });

    let updated = false;

    for (const cat of categories) {
      if (!cat.budget_amount || cat.budget_amount <= 0) continue;
      const spent = spendByCategory[cat.id] || 0;
      const pct = (spent / cat.budget_amount) * 100;
      const catRecord = alertHistory[cat.id] || {};

      if (pct >= 100 && !catRecord.reached100) {
        catRecord.reached100 = true;
        catRecord.reached80 = true;
        alertHistory[cat.id] = catRecord;
        updated = true;

        const title = isIndonesian ? `Batas Anggaran Tercapai: ${cat.name}` : `Budget Exceeded: ${cat.name}`;
        const body = isIndonesian
          ? `Pengeluaran telah mencapai 100% (${formatRupiah(spent)} dari anggaran ${formatRupiah(cat.budget_amount)}).`
          : `Spending reached 100% (${formatRupiah(spent)} of ${formatRupiah(cat.budget_amount)} budget).`;

        await showNativeLocalNotification({ title, body });
      } else if (pct >= 80 && !catRecord.reached80 && !catRecord.reached100) {
        catRecord.reached80 = true;
        alertHistory[cat.id] = catRecord;
        updated = true;

        const title = isIndonesian ? `Peringatan Anggaran (80%): ${cat.name}` : `Budget Alert (80%): ${cat.name}`;
        const body = isIndonesian
          ? `Pengeluaran mencapai ${Math.round(pct)}% (${formatRupiah(spent)} dari anggaran ${formatRupiah(cat.budget_amount)}). Sisa: ${formatRupiah(cat.budget_amount - spent)}.`
          : `Spending reached ${Math.round(pct)}% (${formatRupiah(spent)} of ${formatRupiah(cat.budget_amount)}). Remaining: ${formatRupiah(cat.budget_amount - spent)}.`;

        await showNativeLocalNotification({ title, body });
      }
    }

    if (updated) {
      try {
        localStorage.setItem(storageKey, JSON.stringify(alertHistory));
      } catch {}
    }
  } catch (e) {
    console.warn("Failed to check budget threshold alerts:", e);
  }
}


