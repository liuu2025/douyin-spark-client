import { http } from './http'
import type {
  DouyinAccount,
  LoginStatusResponse,
  SendRun,
  SendScheduleSlot,
  SendTask,
} from './types'
import type {
  SendRunCandidates,
  SendRunList,
  SendRunQuery,
  SendTaskPayload,
} from './sendTasks'

export interface AdminDouyinAccountParams {
  page?: number
  page_size?: number
  owner_public_uid?: string
  douyin_id?: string
  status?: string
  login_state?: string
  polling_entitlement_status?: string
}

export interface AdminDouyinAccountList {
  items: DouyinAccount[]
  total: number
  page: number
  page_size: number
}

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

export async function listAdminDouyinAccounts(params: AdminDouyinAccountParams = {}) {
  const { data } = await http.get<AdminDouyinAccountList>('/admin/douyin-accounts', { params })
  return {
    items: data.items || [],
    total: data.total || 0,
    page: data.page || params.page || 1,
    page_size: data.page_size || params.page_size || 20,
  }
}

export async function getAdminDouyinAccount(douyinId: string) {
  const { data } = await http.get<DouyinAccount | { account: DouyinAccount }>(
    `/admin/douyin-accounts/${douyinId}`,
  )
  return 'account' in data ? data.account : data
}

export async function redeemAdminDouyinAccountCode(douyinId: string, code: string) {
  const { data } = await http.post<DouyinAccount | { account?: DouyinAccount; result?: DouyinAccount }>(
    `/admin/douyin-accounts/${douyinId}/redeem-code`,
    { code },
  )
  if (data && typeof data === 'object' && 'account' in data && data.account) return data.account
  if (data && typeof data === 'object' && 'result' in data && data.result) return data.result
  return data as DouyinAccount
}
export async function setAdminDouyinPolling(douyinId: string, enabled: boolean) {
  const { data } = await http.patch(`/admin/douyin-accounts/${douyinId}/polling`, { enabled })
  return data
}

export async function getAdminLoginStatus(douyinId: string) {
  const { data } = await http.get<LoginStatusResponse>(
    `/admin/douyin-accounts/${douyinId}/login-status`,
  )
  return data
}

export async function verifyAdminLoginStatus(douyinId: string) {
  const { data } = await http.post<LoginStatusResponse>(
    `/admin/douyin-accounts/${douyinId}/login-status`,
    undefined,
    { timeout: 120000 },
  )
  return data
}

export async function listAdminAccountSendTasks(douyinId: string) {
  const { data } = await http.get(`/admin/douyin-accounts/${douyinId}/send-tasks`)
  return pickItems<SendTask>(data)
}

export async function createAdminSendTask(douyinId: string, payload: SendTaskPayload) {
  const { data } = await http.post<SendTask | { task: SendTask }>(
    `/admin/douyin-accounts/${douyinId}/send-tasks`,
    payload,
  )
  return pickTask(data)
}

export async function updateAdminSendTask(taskId: string, payload: Partial<SendTaskPayload>) {
  const { data } = await http.patch<SendTask | { task: SendTask }>(
    `/admin/send-tasks/${taskId}`,
    payload,
  )
  return pickTask(data)
}

export async function pauseAdminSendTask(taskId: string) {
  await http.post(`/admin/send-tasks/${taskId}/pause`)
}

export async function resumeAdminSendTask(taskId: string) {
  await http.post(`/admin/send-tasks/${taskId}/resume`)
}

export async function listAdminTaskSlots(taskId: string) {
  const { data } = await http.get<{ items?: SendScheduleSlot[] }>(
    `/admin/send-tasks/${taskId}/slots`,
  )
  return data.items || []
}

export async function updateAdminTaskSlots(taskId: string, slotIds: string[]) {
  const { data } = await http.patch<{ items?: SendScheduleSlot[] }>(
    `/admin/send-tasks/${taskId}/slots`,
    { slot_ids: slotIds },
  )
  return data.items || []
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

export async function listAdminAccountRuns(
  douyinId: string,
  params: SendRunQuery = { limit: 50 },
) {
  const { data } = await http.get(`/admin/douyin-accounts/${douyinId}/send-runs`, {
    params,
  })
  return pickRunList(data, params.page_size || params.limit || 50)
}

export async function listAdminSendRuns(params: SendRunQuery = { limit: 50 }) {
  const { data } = await http.get('/admin/send-runs', { params })
  return pickRunList(data, params.page_size || params.limit || 50)
}

export async function getAdminSendRunCandidates(runId: string) {
  const { data } = await http.get<SendRunCandidates>(`/admin/send-runs/${runId}/candidates`)
  return {
    friends: data.friends || [],
    groups: data.groups || [],
  }
}
