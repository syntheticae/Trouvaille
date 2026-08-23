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

export async function syncBillNotifications(bills: Bill[]): Promise<void> {
  try {
    const granted = await requestNotificationPermission()
    if (!granted) return

    // Cancel previously scheduled bill notifications
    const pending = await LocalNotifications.getPending()
    if (pending.notifications.length > 0) {
      await LocalNotifications.cancel({ notifications: pending.notifications })
    }

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
          title: `⚠️ Upcoming Bill Tomorrow: ${bill.title}`,
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
          title: `🚨 Bill Due Today: ${bill.title}`,
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
