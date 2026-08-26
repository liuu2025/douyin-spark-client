import { http } from './http'
import type { SendRun, SendTask } from './types'

function pickItems<T>(data: unknown): T[] {
  if (Array.isArray(data)) return data as T[]
  if (data && typeof data === 'object' && Array.isArray((data as { items?: unknown }).items)) {
    return (data as { items: T[] }).items
  }
  return []
}

function pickTask(data: unknown): SendTask {
  if (data && typeof data === 'object' && 'task' in data) {
    return (data as { task: SendTask }).task
  }
  return data as SendTask
}

export interface SendRunQuery {
  limit?: number
  page?: number
  page_size?: number
  task_id?: string
  douyin_id?: string
  owner_user_id?: string
  owner_public_uid?: string
  slot_id?: string
  status?: string
  error_code?: string
  last_error_code?: string
  date_from?: string
  date_to?: string
}

export interface SendRunList {
  items: SendRun[]
  total: number
  page: number
  page_size: number
}

export interface SendRunCandidate {
  id: string
  run_id: string
  target_type: 'friend' | 'group' | string
  sequence: number
  display_name?: string
  group_name?: string
  douyin_id?: string
  member_count?: number
  douyin_id_status?: string
  profile_url_status?: string
  member_count_status?: string
  validation_status?: string
  send_status?: string
  error_code?: string
  error_message?: string
  sent_at?: string
}

export interface SendRunCandidates {
  friends: SendRunCandidate[]
  groups: SendRunCandidate[]
}

function pickRunList(data: unknown, fallbackPageSize: number): SendRunList {
  if (data && typeof data === 'object') {
    const payload = data as {
      items?: SendRun[]
      total?: number
      page?: number
      page_size?: number
    }
    if (Array.isArray(payload.items)) {
      return {
        items: payload.items,
        total: Number(payload.total ?? payload.items.length),
        page: Number(payload.page ?? 1),
        page_size: Number(payload.page_size ?? fallbackPageSize),
      }
    }
  }
  const items = Array.isArray(data) ? (data as SendRun[]) : []
  return { items, total: items.length, page: 1, page_size: fallbackPageSize }
}

export interface SendTaskPayload {
  message_template: string
  datetime_format: string
  target_rules_json: string
  enabled: boolean
  slot_ids?: string[]
}

export async function listSendTasks(douyinId: string) {
  const { data } = await http.get(`/douyin-accounts/${douyinId}/send-tasks`)
  return pickItems<SendTask>(data)
}

export async function createSendTask(douyinId: string, payload: SendTaskPayload) {
  const { data } = await http.post<SendTask | { task: SendTask }>(
    `/douyin-accounts/${douyinId}/send-tasks`,
    payload,
  )
  return pickTask(data)
}

export async function updateSendTask(taskId: string, payload: Partial<SendTaskPayload>) {
  const { data } = await http.patch<SendTask | { task: SendTask }>(`/send-tasks/${taskId}`, payload)
  return pickTask(data)
}

export async function pauseSendTask(taskId: string) {
  await http.post(`/send-tasks/${taskId}/pause`)
}

export async function resumeSendTask(taskId: string) {
  await http.post(`/send-tasks/${taskId}/resume`)
}

export async function listTaskRuns(taskId: string, limit = 50) {
  const { data } = await http.get(`/send-tasks/${taskId}/runs`, { params: { limit } })
  return pickItems<SendRun>(data)
}

export async function listAccountRuns(douyinId: string, params: SendRunQuery = { limit: 50 }) {
  const { data } = await http.get(`/douyin-accounts/${douyinId}/send-runs`, { params })
  return pickRunList(data, params.page_size || params.limit || 50)
}

export async function getSendRunCandidates(runId: string) {
  const { data } = await http.get<SendRunCandidates>(`/send-runs/${runId}/candidates`)
  return {
    friends: data.friends || [],
    groups: data.groups || [],
  }
}

export async function listTaskSlots(taskId: string) {
  const { data } = await http.get<{ items: import('./types').SendScheduleSlot[] }>(
    `/send-tasks/${taskId}/slots`,
  )
  return data.items || []
}

export async function updateTaskSlots(taskId: string, slotIds: string[]) {
  const { data } = await http.patch<{ items?: import('./types').SendScheduleSlot[] }>(
    `/send-tasks/${taskId}/slots`,
    { slot_ids: slotIds },
  )
  return data.items || []
}
