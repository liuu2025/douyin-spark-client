<template>
  <section class="support-page">
    <div class="page-header">
      <div>
        <h1 class="page-title">用户咨询</h1>
        <p class="page-subtitle">管理员查看和回复普通用户的站内咨询消息。</p>
      </div>
      <el-button @click="loadConversations(false)">刷新会话</el-button>
    </div>

    <div class="content-panel support-panel">
      <div class="support-layout" v-loading="conversationsLoading">
        <aside class="conversation-list">
          <div class="conversation-search">
            <el-input
              v-model.trim="searchKeyword"
              placeholder="搜索昵称或账户ID"
              clearable
              size="large"
            />
          </div>
          <div class="conversation-scroll">
            <button
              v-for="row in filteredConversations"
              :key="row.public_uid"
              class="conversation-item"
              :class="{ active: row.public_uid === activeUid }"
              type="button"
              @click="selectConversation(row)"
            >
              <div class="conversation-main">
                <div class="conversation-top">
                  <strong>{{ conversationName(row) }}</strong>
                  <span>{{ shortTime(row.last_message_at) }}</span>
                </div>
                <div class="conversation-uid">
                  <strong>uid {{ row.public_uid }}</strong>
                </div>
                <MessageContent
                  class="conversation-message"
                  :text="row.last_message"
                  :lines="3"
                  empty-text="暂无消息"
                />
              </div>
              <el-badge
                v-if="row.message_count"
                :value="row.message_count"
                :max="99"
                class="conversation-count"
              />
            </button>
            <el-empty v-if="filteredConversations.length === 0" description="暂无咨询" />
          </div>
        </aside>

        <main class="chat-panel">
          <template v-if="activeUid">
            <div class="chat-toolbar">
              <div class="chat-title">
                <div>
                  <strong>{{ activeUserName }}</strong>
                  <div class="conversation-uid">UID {{ activeUid }}</div>
                </div>
              </div>
              <el-button @click="loadMessages(activeUid, false)">刷新消息</el-button>
            </div>
            <div class="message-list" v-loading="messagesLoading">
              <el-empty v-if="messages.length === 0 && !messagesLoading" description="暂无消息" />
              <div
                v-for="message in messages"
                :key="message.id"
                class="message-row"
                :class="{ mine: message.sender === 'admin' }"
              >
                <div class="message-bubble">
                  <div class="message-meta">
                    <strong>{{ senderText(message.sender) }}</strong> · {{ shortTime(message.created_at) }}
                  </div>
                  <MessageContent :text="message.content" :lines="10" expandable />
                </div>
              </div>
            </div>
            <div class="chat-input">
              <el-input
                v-model="replyText"
                type="textarea"
                :autosize="chatInputAutosize"
                maxlength="3000"
                show-word-limit
                placeholder="输入回复内容"
                @keyup.ctrl.enter="reply"
              />
              <el-button type="primary" size="large" :loading="replying" @click="reply">发送</el-button>
            </div>
          </template>
          <el-empty v-else description="请选择一个用户会话" />
        </main>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { ElMessage } from 'element-plus'
import MessageContent from '@/components/MessageContent.vue'
import {
  listAdminConversationMessages,
  listAdminSupportConversations,
  sendAdminSupportMessage,
} from '@/api/support'
import { errorText } from '@/api/http'
import type { SupportConversation, SupportMessage, User } from '@/api/types'
import { useAuthStore } from '@/stores/auth'
import {
  latestSupportConversationTimestamp,
  latestSupportMessageTimestamp,
  writeSeenTimestamp,
} from '@/utils/unread'
import { formatBeijingTime } from '@/utils/time'

const conversations = ref<SupportConversation[]>([])
const messages = ref<SupportMessage[]>([])
const activeUser = ref<User | null>(null)
const auth = useAuthStore()
const conversationsLoading = ref(false)
const messagesLoading = ref(false)
const replying = ref(false)
const autoRefreshTimer = ref<number | null>(null)
const autoRefreshBusy = ref(false)
const activeUid = ref('')
const replyText = ref('')
const searchKeyword = ref('')
const chatInputAutosize = { minRows: 2, maxRows: 10 }

function stopAutoRefresh() {
  if (autoRefreshTimer.value !== null) {
    window.clearInterval(autoRefreshTimer.value)
    autoRefreshTimer.value = null
  }
}

function syncAutoRefresh() {
  stopAutoRefresh()
  if (document.hidden || !activeUid.value) return
  autoRefreshTimer.value = window.setInterval(() => {
    void refreshConversationSilently()
  }, 3000)
}

async function refreshConversationSilently() {
  if (autoRefreshBusy.value || document.hidden || !activeUid.value) return
  autoRefreshBusy.value = true
  try {
    await Promise.all([loadConversations(true), loadMessages(activeUid.value, true)])
  } finally {
    autoRefreshBusy.value = false
  }
}

function senderText(sender?: string) {
  if (sender === 'admin') return '管理员'
  if (sender === 'user') return activeUserName.value
  return sender || '-'
}

function conversationName(row: SupportConversation) {
  return row.nickname || `UID ${row.public_uid}`
}

function shortTime(value?: string) {
  return formatBeijingTime(value)
}

const filteredConversations = computed(() => {
  const keyword = searchKeyword.value.trim().toLowerCase()
  if (!keyword) return conversations.value
  return conversations.value.filter((item) => {
    return (
      conversationName(item).toLowerCase().includes(keyword) ||
      item.public_uid.toLowerCase().includes(keyword)
    )
  })
})

const activeUserName = computed(() => {
  if (activeUser.value) {
    return activeUser.value.nickname || `UID ${activeUser.value.public_uid}`
  }
  const row = conversations.value.find((item) => item.public_uid === activeUid.value)
  return row ? conversationName(row) : '用户'
})

async function loadConversations(silent = false) {
  if (!silent) {
    conversationsLoading.value = true
  }
  try {
    conversations.value = await listAdminSupportConversations()
    writeSeenTimestamp(
      'admin-support',
      auth.user?.public_uid || auth.user?.id || '',
      latestSupportConversationTimestamp(conversations.value),
    )
    if (!activeUid.value && conversations.value[0]) {
      await selectConversation(conversations.value[0])
    }
  } catch (error) {
    ElMessage.error(errorText(error))
  } finally {
    if (!silent) {
      conversationsLoading.value = false
    }
  }
}

async function selectConversation(row: SupportConversation) {
  activeUid.value = row.public_uid
  activeUser.value = null
  await loadMessages(row.public_uid)
  syncAutoRefresh()
}

async function loadMessages(publicUid: string, silent = false) {
  if (!silent) {
    messagesLoading.value = true
  }
  try {
    const data = await listAdminConversationMessages(publicUid)
    activeUser.value = data.user || null
    messages.value = data.items || []
    writeSeenTimestamp(
      'admin-support',
      auth.user?.public_uid || auth.user?.id || '',
      latestSupportMessageTimestamp(messages.value),
    )
  } catch (error) {
    ElMessage.error(errorText(error))
  } finally {
    if (!silent) {
      messagesLoading.value = false
    }
  }
}

async function reply() {
  const content = replyText.value.trim()
  if (!activeUid.value || !content) {
    ElMessage.warning('请选择会话并输入回复内容。')
    return
  }
  replying.value = true
  try {
    await sendAdminSupportMessage(activeUid.value, content)
    replyText.value = ''
    await Promise.all([loadMessages(activeUid.value), loadConversations()])
  } catch (error) {
    ElMessage.error(errorText(error))
  } finally {
    replying.value = false
  }
}

function handleVisibilityChange() {
  syncAutoRefresh()
  if (!document.hidden && activeUid.value) {
    void refreshConversationSilently()
  }
}

onMounted(async () => {
  await loadConversations()
  document.addEventListener('visibilitychange', handleVisibilityChange)
  syncAutoRefresh()
})

onBeforeUnmount(() => {
  stopAutoRefresh()
  document.removeEventListener('visibilitychange', handleVisibilityChange)
})
</script>

<style scoped>
.support-layout {
  display: grid;
  grid-template-columns: minmax(220px, 260px) minmax(0, 1fr);
  height: 100%;
  min-height: 0;
  overflow: hidden;
}

.support-page {
  display: grid;
  grid-template-rows: auto minmax(0, 1fr);
  height: calc(100vh - 108px);
  min-height: 0;
  overflow: hidden;
}

.support-panel {
  min-height: 0;
  overflow: hidden;
}

.conversation-list {
  display: grid;
  grid-template-rows: auto 1fr;
  border-right: 1px solid #e5e7eb;
  background: #f9fafb;
  min-height: 0;
}

.conversation-search {
  padding: 12px;
  border-bottom: 1px solid #e5e7eb;
}

.conversation-scroll {
  min-height: 0;
  overflow: auto;
  overscroll-behavior: contain;
  padding: 8px;
}

.conversation-item {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  gap: 8px;
  width: 100%;
  padding: 10px 8px;
  border: 0;
  border-radius: 8px;
  background: transparent;
  color: inherit;
  text-align: left;
  cursor: pointer;
}

.conversation-item.active {
  background: #e8f1ff;
}

.conversation-item:hover {
  background: #eef2f7;
}

.conversation-item.active:hover {
  background: #e8f1ff;
}

.conversation-main {
  min-width: 0;
}

.conversation-top {
  display: flex;
  justify-content: space-between;
  gap: 10px;
  align-items: center;
}

.conversation-top strong {
  overflow: hidden;
  color: #111827;
  font-size: 15px;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.conversation-top span {
  flex: 0 0 auto;
  color: #9ca3af;
  font-size: 12px;
}

.conversation-message,
.conversation-time {
  margin-top: 4px;
  color: #6b7280;
  font-size: 12px;
}

.conversation-message {
  line-height: 1.55;
}

.conversation-uid {
  margin-top: 4px;
  color: #374151;
  font-size: 12px;
}

.conversation-count {
  align-self: center;
  justify-self: end;
}

.chat-panel {
  display: grid;
  grid-template-rows: auto 1fr auto;
  min-width: 0;
  min-height: 0;
  background: #ffffff;
}

.chat-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 14px;
  padding: 14px 18px;
  border-bottom: 1px solid #e5e7eb;
}

.chat-title {
  display: flex;
  min-width: 0;
  align-items: center;
}

.message-list {
  min-height: 0;
  padding: 18px;
  overflow: auto;
  overscroll-behavior: contain;
  background: #f5f7fb;
}

.message-row {
  display: flex;
  align-items: flex-start;
  margin-bottom: 14px;
}

.message-row.mine {
  justify-content: flex-end;
}

.message-bubble {
  max-width: min(560px, 78%);
  padding: 10px 12px;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  background: #ffffff;
  line-height: 1.6;
}

.message-row.mine .message-bubble {
  border-color: #bfdbfe;
  background: #eff6ff;
}

.message-meta {
  margin-bottom: 4px;
  color: #6b7280;
  font-size: 12px;
}

.chat-input {
  display: grid;
  grid-template-columns: 1fr auto;
  gap: 10px;
  align-items: end;
  padding: 14px 18px;
  border-top: 1px solid #e5e7eb;
  background: #ffffff;
}

.chat-input :deep(.el-textarea__inner) {
  overflow-y: auto;
  resize: none;
}

:global(:root.dark) .conversation-list {
  border-color: var(--app-border);
  background: var(--app-surface-soft);
}

:global(:root.dark) .conversation-search,
:global(:root.dark) .chat-toolbar,
:global(:root.dark) .chat-input {
  border-color: var(--app-border);
  background: var(--app-surface);
}

:global(:root.dark) .conversation-item.active,
:global(:root.dark) .conversation-item.active:hover {
  background: #172554;
}

:global(:root.dark) .conversation-item:hover {
  background: var(--app-surface-hover);
}

:global(:root.dark) .conversation-top strong,
:global(:root.dark) .conversation-uid {
  color: var(--app-text);
}

:global(:root.dark) .conversation-top span,
:global(:root.dark) .conversation-message,
:global(:root.dark) .conversation-time,
:global(:root.dark) .message-meta {
  color: var(--app-text-muted);
}

:global(:root.dark) .chat-panel {
  background: var(--app-surface);
}

:global(:root.dark) .message-list {
  background: var(--app-bg);
}

:global(:root.dark) .message-bubble {
  border-color: var(--app-border);
  background: var(--app-surface-soft);
  color: var(--app-text-body);
}

:global(:root.dark) .message-row.mine .message-bubble {
  border-color: #2563eb;
  background: #172554;
}

@media (max-width: 720px) {
  .support-layout {
    grid-template-columns: 1fr;
    height: auto;
  }

  .support-page {
    height: auto;
    overflow: visible;
  }

  .conversation-list {
    border-right: 0;
    border-bottom: 1px solid #e5e7eb;
    max-height: 360px;
  }
}
</style>
