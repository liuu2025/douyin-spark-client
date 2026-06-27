import { http } from './http'
import type { SchedulePreferences, SendScheduleSlot } from './types'

export interface SlotPayload {
  name: string
  mode: string
  time_of_day?: string
  interval_seconds?: number
  status: string
}

export async function getSchedulePreferences(douyinId: string) {
  const { data } = await http.get<SchedulePreferences>(
    `/douyin-accounts/${douyinId}/schedule-preferences`,
  )
  return data
}

export async function updateSchedulePreferences(
  douyinId: string,
  payload: { auto_apply_new_slots: boolean },
) {
  const { data } = await http.patch<SchedulePreferences>(
    `/douyin-accounts/${douyinId}/schedule-preferences`,
    payload,
  )
  return data
}

export async function listScheduleSlots() {
  const { data } = await http.get<{ items: SendScheduleSlot[] }>('/send-schedule/slots')
  return data.items || []
}

export async function listAdminScheduleSlots() {
  const { data } = await http.get<{ items: SendScheduleSlot[] }>('/admin/send-schedule/slots')
  return data.items || []
}

export async function createAdminScheduleSlot(payload: SlotPayload) {
  const { data } = await http.post<{ slot: SendScheduleSlot }>(
    '/admin/send-schedule/slots',
    payload,
  )
  return data.slot
}

export async function updateAdminScheduleSlot(slotId: string, payload: SlotPayload) {
  const { data } = await http.patch<{ slot: SendScheduleSlot }>(
    `/admin/send-schedule/slots/${slotId}`,
    payload,
  )
  return data.slot
}

export async function enableAdminScheduleSlot(slotId: string) {
  const { data } = await http.post<{ slot?: SendScheduleSlot }>(
    `/admin/send-schedule/slots/${slotId}/enable`,
    {},
  )
  return data.slot
}

export async function disableAdminScheduleSlot(slotId: string) {
  const { data } = await http.post<{ slot?: SendScheduleSlot }>(
    `/admin/send-schedule/slots/${slotId}/disable`,
    {},
  )
  return data.slot
}
