import { http } from './http'
import type { RedeemCode, RedeemResult } from './types'

function pickItems<T>(data: unknown): T[] {
  if (Array.isArray(data)) return data as T[]
  if (data && typeof data === 'object' && Array.isArray((data as { items?: unknown }).items)) {
    return (data as { items: T[] }).items
  }
  return []
}

export interface CreateRedeemCodesPayload {
  assigned_public_uid?: string
  days: number
  count: number
}

export async function listMyRedeemCodes() {
  const { data } = await http.get('/redeem-codes/my')
  return pickItems<RedeemCode>(data)
}

export async function redeemCodeToDouyinAccount(douyinId: string, code: string) {
  const { data } = await http.post<{ result?: RedeemResult; account?: RedeemResult }>(
    `/douyin-accounts/${douyinId}/redeem-code`,
    { code },
  )
  return data.result || data.account || data
}

export async function listAdminRedeemCodes(limit = 200) {
  const { data } = await http.get('/admin/redeem-codes', { params: { limit } })
  return pickItems<RedeemCode>(data)
}

export async function createAdminRedeemCodes(payload: CreateRedeemCodesPayload) {
  const { data } = await http.post('/admin/redeem-codes', payload)
  return pickItems<RedeemCode>(data)
}

export async function disableAdminRedeemCode(codeId: string) {
  const { data } = await http.post<{ code?: RedeemCode }>(
    `/admin/redeem-codes/${codeId}/disable`,
    {},
  )
  return data.code
}
