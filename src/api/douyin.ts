import { http } from './http'
import type { DouyinAccount, LoginStatusResponse } from './types'

function pickItems<T>(data: unknown): T[] {
  if (Array.isArray(data)) return data as T[]
  if (data && typeof data === 'object' && Array.isArray((data as { items?: unknown }).items)) {
    return (data as { items: T[] }).items
  }
  return []
}

export async function listDouyinAccounts() {
  const { data } = await http.get('/douyin-accounts')
  return pickItems<DouyinAccount>(data)
}

export async function getDouyinAccount(douyinId: string) {
  const { data } = await http.get<DouyinAccount | { account: DouyinAccount }>(
    `/douyin-accounts/${douyinId}`,
  )
  return 'account' in data ? data.account : data
}

export async function getLoginStatus(douyinId: string) {
  const { data } = await http.get<LoginStatusResponse>(
    `/douyin-accounts/${douyinId}/login-status`,
  )
  return data
}

export async function verifyLoginStatus(douyinId: string) {
  const { data } = await http.post<LoginStatusResponse>(
    `/douyin-accounts/${douyinId}/login-status`,
    undefined,
    { timeout: 120000 },
  )
  return data
}

export async function setPolling(douyinId: string, enabled: boolean) {
  const { data } = await http.patch(`/douyin-accounts/${douyinId}/polling`, { enabled })
  return data
}
