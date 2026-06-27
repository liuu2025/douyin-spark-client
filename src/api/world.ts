import { http } from './http'
import type { WorldMessage, WorldMute } from './types'

export async function listWorldMessages(limit = 100) {
  const { data } = await http.get<{ items: WorldMessage[] }>('/world/messages', {
    params: { limit },
  })
  return data.items || []
}

export async function sendWorldMessage(content: string) {
  const { data } = await http.post<{ message: WorldMessage }>('/world/messages', { content })
  return data.message
}

export async function recallWorldMessage(messageId: string) {
  const { data } = await http.post<{ message: WorldMessage }>(
    `/admin/world/messages/${messageId}/recall`,
    {},
  )
  return data.message
}

export async function listWorldMutes(limit = 100) {
  const { data } = await http.get<{ items: WorldMute[] }>('/admin/world/mutes', {
    params: { limit },
  })
  return data.items || []
}

export async function muteWorldUser(publicUid: string, reason: string) {
  const { data } = await http.post<{ mute: WorldMute }>('/admin/world/mutes', {
    public_uid: publicUid,
    reason,
  })
  return data.mute
}

export async function unmuteWorldUser(publicUid: string) {
  const { data } = await http.delete<{ status: string; public_uid: string }>(
    `/admin/world/mutes/${publicUid}`,
  )
  return data
}
