import { LocalNotifications } from '@capacitor/local-notifications'
import type { Bill } from './types'
import { parseISO, subDays } from 'date-fns'

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
      const onDueDate = new Date(dueDate)
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

export async function cancelDailyStreakReminder(): Promise<void> {
  try {
    const pending = await LocalNotifications.getPending()
    const exists = pending.notifications.some((n) => n.id === DAILY_REMINDER_NOTIFICATION_ID)
    if (exists) {
      await LocalNotifications.cancel({ notifications: [{ id: DAILY_REMINDER_NOTIFICATION_ID }] })
    }
  } catch (e) {
    console.warn('Failed to cancel daily streak reminder:', e)
  }
}

export async function syncDailyStreakReminder(hasLoggedToday: boolean): Promise<void> {
  try {
    // Check if user disabled daily streak reminders in settings (default true)
    if (localStorage.getItem('trouvaille_daily_reminder_enabled') === 'false') {
      await cancelDailyStreakReminder()
      return
    }

    const granted = await requestNotificationPermission()
    if (!granted) return

    // If user already logged today, streak is already safe!
    if (hasLoggedToday) {
      await cancelDailyStreakReminder()
      return
    }

    const now = new Date()
    const scheduledTime = new Date()
    scheduledTime.setHours(20, 0, 0, 0)

    // If already past 20:00 today, do not schedule for the past
    if (scheduledTime <= now) {
      await cancelDailyStreakReminder()
      return
    }

    await cancelDailyStreakReminder()

    await LocalNotifications.schedule({
      notifications: [
        {
          id: DAILY_REMINDER_NOTIFICATION_ID,
          title: 'Jaga Rekor Finansialmu',
          body: 'Belum ada transaksi tercatat hari ini. Catat pengeluaranmu sekarang untuk menjaga streak konsistensimu tetap aktif!',
          schedule: { at: scheduledTime },
          sound: 'default',
        },
      ],
    })
  } catch (e) {
    console.warn('Failed to sync daily streak reminder:', e)
  }
}

