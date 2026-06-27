import { http } from './http'
import type { Notice } from './types'

export async function listNotices(limit = 50) {
  const { data } = await http.get<{ items: Notice[] }>('/notices', { params: { limit } })
  return data.items || []
}

export async function listAdminNotices(limit = 50) {
  const { data } = await http.get<{ items: Notice[] }>('/admin/notices', { params: { limit } })
  return data.items || []
}

export async function createNotice(payload: { title: string; content: string }) {
  const { data } = await http.post<{ notice: Notice }>('/admin/notices', payload)
  return data.notice
}

export async function archiveNotice(noticeId: string) {
  const { data } = await http.post<{ notice: Notice }>(`/admin/notices/${noticeId}/archive`, {})
  return data.notice
}
