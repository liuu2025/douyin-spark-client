import { http } from './http'
import type { AdminUserDetail, AdminUserSummary } from './types'

export interface AdminUserListParams {
  page?: number
  page_size?: number
  public_uid?: string
  nickname?: string
  qq_email?: string
  role?: string
  status?: string
}

export interface AdminUserListResponse {
  items: AdminUserSummary[]
  total: number
  page: number
  page_size: number
}

export async function listAdminUsers(params: AdminUserListParams = {}) {
  const { data } = await http.get<AdminUserListResponse>('/admin/users', { params })
  return data
}

export async function getAdminUser(publicUid: string) {
  const { data } = await http.get<AdminUserDetail>(`/admin/users/${publicUid}`)
  return data
}

export async function updateAdminUserStatus(publicUid: string, status: 'active' | 'disabled') {
  const { data } = await http.patch<{ user: AdminUserSummary }>(
    `/admin/users/${publicUid}/status`,
    { status },
  )
  return data.user
}
