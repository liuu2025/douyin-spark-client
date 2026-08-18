import { createCacheKey, readCache, writeCache } from '@/utils/cache'
import type { Notice, SupportConversation, SupportMessage } from '@/api/types'

function toEpochMs(value?: string | number | Date | null) {
  if (!value) return 0
  if (typeof value === 'number') return Number.isFinite(value) ? value : 0
  if (value instanceof Date) return value.getTime()
  const parsed = Date.parse(value)
  return Number.isFinite(parsed) ? parsed : 0
}

function seenCacheKey(scope: string, userKey: string) {
  return createCacheKey('unread-seen:v1', { scope, userKey })
}

export function readSeenTimestamp(scope: string, userKey: string) {
  if (!userKey) return 0
  return readCache<number>(seenCacheKey(scope, userKey), 0) || 0
}

export function writeSeenTimestamp(scope: string, userKey: string, value?: string | number | Date | null) {
  if (!userKey) return
  const timestamp = toEpochMs(value)
  if (!timestamp) return
  writeCache(seenCacheKey(scope, userKey), timestamp)
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('douyin-spark:seen-updated'))
  }
}

export function latestTimestamp(values: Array<string | number | Date | null | undefined>) {
  return values.reduce<number>((latest, value) => Math.max(latest, toEpochMs(value)), 0)
}

export function latestNoticeTimestamp(notices: Notice[]) {
  return latestTimestamp(notices.map((notice) => notice.published_at || notice.created_at))
}

export function latestSupportMessageTimestamp(messages: SupportMessage[]) {
  return latestTimestamp(messages.map((message) => message.created_at))
}

export function latestSupportConversationTimestamp(conversations: SupportConversation[]) {
  return latestTimestamp(conversations.map((conversation) => conversation.last_message_at))
}

export function hasUserUnreadSupport(messages: SupportMessage[], seenAt: number) {
  return messages.some((message) => message.sender === 'admin' && toEpochMs(message.created_at) > seenAt)
}

export function hasNoticeUpdates(notices: Notice[], seenAt: number) {
  return latestNoticeTimestamp(notices) > seenAt
}

export function hasAdminSupportUnread(conversations: SupportConversation[], seenAt: number) {
  return conversations.some(
    (conversation) =>
      conversation.last_sender === 'user' &&
      toEpochMs(conversation.last_message_at) > seenAt,
  )
}
