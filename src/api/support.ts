import { http } from './http'
import type { SupportConversation, SupportMessage, User } from './types'

export async function listSupportMessages(limit = 100) {
  const { data } = await http.get<{ items: SupportMessage[] }>('/support/messages', {
    params: { limit },
  })
  return data.items || []
}

export async function sendSupportMessage(content: string) {
  const { data } = await http.post<{ message: SupportMessage }>('/support/messages', { content })
  return data.message
}

export async function listAdminSupportConversations(limit = 50) {
  const { data } = await http.get<{ items: SupportConversation[] }>(
    '/admin/support/conversations',
    { params: { limit } },
  )
  return data.items || []
}

export async function listAdminConversationMessages(publicUid: string, limit = 100) {
  const { data } = await http.get<{ user: User; items: SupportMessage[] }>(
    `/admin/support/conversations/${publicUid}/messages`,
    { params: { limit } },
  )
  return data
}

export async function sendAdminSupportMessage(publicUid: string, content: string) {
  const { data } = await http.post<{ message: SupportMessage }>(
    `/admin/support/conversations/${publicUid}/messages`,
    { content },
  )
  return data.message
}
