<template>
  <section>
    <div class="page-header">
      <div>
        <h1 class="page-title">消息中心</h1>
      </div>
    </div>

    <div class="content-panel">
      <div class="panel-body">
        <el-tabs v-model="activeTab" class="message-tabs">
          <el-tab-pane label="系统通知" name="notices">
            <div class="toolbar">
              <strong>系统通知</strong>
              <el-button @click="loadNotices(true)">刷新</el-button>
            </div>
            <div class="notice-reader" v-loading="noticesLoading">
              <aside class="notice-list">
                <button
                  v-for="notice in notices"
                  :key="notice.id"
                  class="notice-item"
                  :class="{ active: notice.id === selectedNotice?.id }"
                  type="button"
                  @click="selectedNotice = notice"
                >
                  <strong>{{ notice.title }}</strong>
                  <span>{{ shortTime(notice.published_at || notice.created_at) }}</span>
                  <p>{{ notice.content }}</p>
                </button>
                <el-empty v-if="notices.length === 0" description="暂无系统通知" />
              </aside>
              <article class="notice-detail">
                <template v-if="selectedNotice">
                  <div class="notice-detail-header">
                    <h2>{{ selectedNotice.title }}</h2>
                    <span>{{ shortTime(selectedNotice.published_at || selectedNotice.created_at) }}</span>
                  </div>
                  <div class="notice-content">{{ selectedNotice.content }}</div>
                </template>
                <el-empty v-else description="请选择一条系统通知" />
              </article>
            </div>
          </el-tab-pane>

          <el-tab-pane :label="auth.isAdmin ? '用户咨询' : '联系管理员'" name="support">
            <template v-if="auth.isAdmin">
              <div class="toolbar">
                <strong>用户咨询摘要</strong>
                <el-button @click="loadConversations(false)">刷新</el-button>
              </div>
              <el-table
                class="desktop-only"
                :data="conversations"
                :loading="conversationsLoading"
                empty-text="暂无用户咨询"
                height="clamp(250px, calc(100dvh - 210px), 520px)"
              >
                <el-table-column prop="public_uid" label="用户账户ID" width="130" />
                <el-table-column label="最近消息" min-width="240">
                  <template #default="{ row }">
                    <MessageContent :text="row.last_message" :lines="3" empty-text="暂无消息" />
                  </template>
                </el-table-column>
                <el-table-column label="发送方" width="100">
                  <template #default="{ row }">{{ senderText(row.last_sender) }}</template>
                </el-table-column>
                <el-table-column label="最近时间" min-width="180">
                  <template #default="{ row }">{{ shortTime(row.last_message_at) }}</template>
                </el-table-column>
                <el-table-column prop="message_count" label="消息数" width="90" />
                <el-table-column label="操作" width="120">
                  <template #default="{ row }">
                    <el-button link type="primary" @click="$router.push('/admin/support')">
                      去回复
                    </el-button>
                  </template>
                </el-table-column>
              </el-table>
              <div v-loading="conversationsLoading" class="mobile-only mobile-card-list">
                <article v-for="conversation in conversations" :key="conversation.user_id" class="mobile-data-card">
                  <div class="mobile-data-card__header">
                    <strong>{{ conversation.nickname || conversation.public_uid }}</strong>
                    <span>{{ shortTime(conversation.last_message_at) }}</span>
                  </div>
                  <div class="mobile-data-card__body">
                    <div class="mobile-data-row"><span>账户ID</span><span>{{ conversation.public_uid }}</span></div>
                    <div class="mobile-data-row"><span>发送方</span><span>{{ senderText(conversation.last_sender) }}</span></div>
                    <div class="mobile-data-row"><span>消息数</span><span>{{ conversation.message_count }}</span></div>
                    <MessageContent :text="conversation.last_message" :lines="4" empty-text="暂无消息" />
                  </div>
                  <div class="mobile-data-card__footer">
                    <el-button type="primary" @click="$router.push('/admin/support')">去回复</el-button>
                  </div>
                </article>
                <div v-if="!conversationsLoading && conversations.length === 0" class="mobile-empty">暂无用户咨询</div>
              </div>
            </template>

            <template v-else>
              <div class="chat-panel">
                <div class="chat-toolbar">
                  <strong>联系管理员</strong>
                  <el-button @click="loadMessages(false)">刷新</el-button>
                </div>
                <div class="message-list" v-loading="messagesLoading">
                  <el-empty v-if="messages.length === 0 && !messagesLoading" description="暂无消息" />
                  <div
                    v-for="message in messages"
                    :key="message.id"
                    class="message-row"
                    :class="{ mine: message.sender === 'user' }"
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
                    v-model="messageText"
                    type="textarea"
                    :autosize="chatInputAutosize"
                    maxlength="3000"
                    show-word-limit
                    placeholder="输入要发送给管理员的消息"
                    @keyup.ctrl.enter="submitMessage"
                  />
                  <el-button type="primary" :loading="sending" @click="submitMessage">发送</el-button>
                </div>
              </div>
            </template>
          </el-tab-pane>

          <el-tab-pane label="世界聊天窗口" name="world">
            <div class="chat-panel">
              <div class="chat-toolbar">
                <strong>世界聊天窗口</strong>
                <div class="toolbar-actions">
                  <el-button v-if="auth.isAdmin" @click="openMuteList">禁言列表</el-button>
                  <el-button @click="loadWorldMessages(false)">刷新</el-button>
                </div>
              </div>
              <div class="message-list" v-loading="worldLoading">
                <el-empty
                  v-if="worldMessages.length === 0 && !worldLoading"
                  description="暂无世界聊天消息"
                />
                <div
                  v-for="message in worldMessages"
                  :key="message.id"
                  class="message-row"
                  :class="{
                    mine: isOwnWorldMessage(message),
                    recalled: isRecalledWorldMessage(message),
                  }"
                >
                  <div
                    class="message-bubble world-bubble"
                    :class="{ 'recalled-bubble': isRecalledWorldMessage(message) }"
                  >
                    <div class="message-meta world-meta">
                      <strong class="world-nickname">{{ worldSenderText(message) }}</strong>
                      <span v-if="showWorldUid(message)" class="world-subline">
                        <strong>{{ message.public_uid }}</strong>
                        <span>{{ worldTimeText(message) }}</span>
                      </span>
                      <span v-else class="world-subline">{{ worldTimeText(message) }}</span>
                    </div>
                    <div class="world-status-row">
                      <span v-if="isRecalledWorldMessage(message) && auth.isAdmin" class="status-pill">
                        已撤回
                      </span>
                      <span v-if="isWorldUserMuted(message)" class="status-pill muted-pill">
                        已禁言
                      </span>
                    </div>
                    <MessageContent :text="worldMessageContent(message)" :lines="10" expandable />
                    <div v-if="auth.isAdmin" class="message-actions">
                      <el-button
                        v-if="canRecallWorldMessage(message)"
                        link
                        type="danger"
                        @click="confirmRecallWorldMessage(message)"
                      >
                        撤回
                      </el-button>
                      <el-button
                        v-if="canMuteWorldMessage(message)"
                        link
                        type="warning"
                        @click="openMuteDialog(message)"
                      >
                        禁言
                      </el-button>
                    </div>
                  </div>
                </div>
              </div>
              <div class="chat-input">
                <el-input
                  v-model="worldText"
                  type="textarea"
                  :autosize="chatInputAutosize"
                  maxlength="3000"
                  show-word-limit
                  placeholder="输入世界聊天消息"
                  @keyup.ctrl.enter="submitWorldMessage"
                />
                <el-button type="primary" :loading="worldSending" @click="submitWorldMessage">
                  发送
                </el-button>
              </div>
            </div>
          </el-tab-pane>
        </el-tabs>
      </div>
    </div>

    <el-dialog v-model="muteDialogVisible" title="禁言用户" width="420px">
      <el-form label-width="72px">
        <el-form-item label="账户ID">
          <el-input :model-value="muteForm.publicUid" disabled />
        </el-form-item>
        <el-form-item label="昵称">
          <el-input :model-value="muteForm.nickname || '-'" disabled />
        </el-form-item>
        <el-form-item label="原因">
          <el-input
            v-model="muteForm.reason"
            type="textarea"
            :rows="3"
            maxlength="200"
            show-word-limit
            placeholder="请输入禁言原因"
          />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="muteDialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="muting" @click="submitMuteWorldUser">确定禁言</el-button>
      </template>
    </el-dialog>

    <el-dialog v-model="muteListVisible" title="世界聊天禁言列表" width="720px">
      <el-table
        class="desktop-only"
        :data="worldMutes"
        :loading="mutesLoading"
        empty-text="暂无禁言用户"
        max-height="430"
      >
        <el-table-column prop="public_uid" label="账户ID" width="110" />
        <el-table-column prop="nickname" label="昵称" min-width="120" />
        <el-table-column prop="reason" label="原因" min-width="220" show-overflow-tooltip />
        <el-table-column label="时间" width="150">
          <template #default="{ row }">{{ shortTime(row.updated_at || row.created_at) }}</template>
        </el-table-column>
        <el-table-column label="操作" width="100">
          <template #default="{ row }">
            <el-button
              link
              type="primary"
              :loading="unmutingUid === row.public_uid"
              @click="submitUnmuteWorldUser(row.public_uid)"
            >
              解除禁言
            </el-button>
          </template>
        </el-table-column>
      </el-table>
      <div v-loading="mutesLoading" class="mobile-only mobile-card-list">
        <article v-for="mute in worldMutes" :key="mute.user_id" class="mobile-data-card">
          <div class="mobile-data-card__header">
            <strong>{{ mute.nickname || mute.public_uid }}</strong>
            <span>{{ shortTime(mute.updated_at || mute.created_at) }}</span>
          </div>
          <div class="mobile-data-card__body">
            <div class="mobile-data-row"><span>账户ID</span><span>{{ mute.public_uid }}</span></div>
            <div class="mobile-data-row"><span>原因</span><span>{{ mute.reason || '-' }}</span></div>
          </div>
          <div class="mobile-data-card__footer">
            <el-button
              type="primary"
              :loading="unmutingUid === mute.public_uid"
              @click="submitUnmuteWorldUser(mute.public_uid)"
            >
              解除禁言
            </el-button>
          </div>
        </article>
        <div v-if="!mutesLoading && worldMutes.length === 0" class="mobile-empty">暂无禁言用户</div>
      </div>
      <template #footer>
        <el-button @click="muteListVisible = false">关闭</el-button>
        <el-button @click="loadWorldMutes(false)">刷新</el-button>
      </template>
    </el-dialog>
  </section>
</template>

<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import MessageContent from '@/components/MessageContent.vue'
import { listNotices } from '@/api/notices'
import {
  listAdminSupportConversations,
  listSupportMessages,
  sendSupportMessage,
} from '@/api/support'
import {
  listWorldMessages,
  listWorldMutes,
  muteWorldUser,
  recallWorldMessage,
  sendWorldMessage,
  unmuteWorldUser,
} from '@/api/world'
import { errorText } from '@/api/http'
import type {
  Notice,
  SupportConversation,
  SupportMessage,
  WorldMessage,
  WorldMute,
} from '@/api/types'
import { useAuthStore } from '@/stores/auth'
import { createCacheKey, readCache, writeCache } from '@/utils/cache'
import {
  latestNoticeTimestamp,
  latestSupportConversationTimestamp,
  latestSupportMessageTimestamp,
  writeSeenTimestamp,
} from '@/utils/unread'
import { formatBeijingTime } from '@/utils/time'

const activeTab = ref('notices')
const auth = useAuthStore()
const notices = ref<Notice[]>([])
const selectedNotice = ref<Notice | null>(null)
const messages = ref<SupportMessage[]>([])
const conversations = ref<SupportConversation[]>([])
const worldMessages = ref<WorldMessage[]>([])
const worldMutes = ref<WorldMute[]>([])
const noticesLoading = ref(false)
const messagesLoading = ref(false)
const conversationsLoading = ref(false)
const worldLoading = ref(false)
const worldSending = ref(false)
const mutesLoading = ref(false)
const sending = ref(false)
const muting = ref(false)
const unmutingUid = ref('')
const autoRefreshTimer = ref<number | null>(null)
const autoRefreshBusy = ref(false)
const messageText = ref('')
const worldText = ref('')
const chatInputAutosize = { minRows: 2, maxRows: 10 }
const muteDialogVisible = ref(false)
const muteListVisible = ref(false)
const muteForm = ref({
  publicUid: '',
  nickname: '',
  reason: '',
})
const NOTICES_CACHE_TTL = 1000 * 60 * 10

function noticesCacheKey() {
  return createCacheKey('messages:notices:v1', {
    role: auth.isAdmin ? 'admin' : 'normal',
  })
}

function stopAutoRefresh() {
  if (autoRefreshTimer.value !== null) {
    window.clearInterval(autoRefreshTimer.value)
    autoRefreshTimer.value = null
  }
}

function syncAutoRefresh() {
  stopAutoRefresh()
  if (document.hidden) return
  if (activeTab.value !== 'support' && activeTab.value !== 'world') return
  autoRefreshTimer.value = window.setInterval(() => {
    void refreshActiveChat(true)
  }, 3000)
}

async function refreshActiveChat(silent = true) {
  if (autoRefreshBusy.value || document.hidden) return
  autoRefreshBusy.value = true
  try {
    if (activeTab.value === 'support') {
      if (auth.isAdmin) {
        await loadConversations(silent)
      } else {
        await loadMessages(silent)
      }
      return
    }
    if (activeTab.value === 'world') {
      await loadWorldMessages(silent)
    }
  } finally {
    autoRefreshBusy.value = false
  }
}

function senderText(sender?: string) {
  if (sender === 'admin') return '管理员'
  if (sender === 'user') return '用户'
  return sender || '-'
}

function shortTime(value?: string) {
  return formatBeijingTime(value)
}

function isOwnWorldMessage(message: WorldMessage) {
  if (!auth.isAdmin && isRecalledWorldMessage(message)) return false
  return message.public_uid === auth.user?.public_uid
}

function isRecalledWorldMessage(message: WorldMessage) {
  return message.status === 'recalled'
}

function worldSenderText(message: WorldMessage) {
  if (!auth.isAdmin && isRecalledWorldMessage(message)) return '系统提示'
  return message.nickname || `UID ${message.public_uid}`
}

function worldTimeText(message: WorldMessage) {
  if (isRecalledWorldMessage(message)) {
    if (auth.isAdmin) {
      return `发送 ${formatBeijingTime(message.created_at)} · 撤回 ${formatBeijingTime(message.recalled_at)}`
    }
    return `撤回 ${formatBeijingTime(message.recalled_at || message.created_at)}`
  }
  return formatBeijingTime(message.created_at)
}

function worldMessageContent(message: WorldMessage) {
  if (!auth.isAdmin && isRecalledWorldMessage(message)) return '管理员撤回了一条消息'
  return message.content
}

function showWorldUid(message: WorldMessage) {
  return auth.isAdmin || !isRecalledWorldMessage(message)
}

function canRecallWorldMessage(message: WorldMessage) {
  return auth.isAdmin && !isRecalledWorldMessage(message)
}

function canMuteWorldMessage(message: WorldMessage) {
  return auth.isAdmin && message.public_uid !== auth.user?.public_uid
}

function isWorldUserMuted(message: WorldMessage) {
  return auth.isAdmin && worldMutes.value.some((item) => item.public_uid === message.public_uid)
}

async function loadNotices(force = false) {
  if (!force) {
    const cached = readCache<Notice[]>(noticesCacheKey(), NOTICES_CACHE_TTL)
    if (cached) {
      notices.value = cached
      if (!selectedNotice.value || !notices.value.some((item) => item.id === selectedNotice.value?.id)) {
        selectedNotice.value = notices.value[0] || null
      }
      writeSeenTimestamp(
        'notices',
        auth.user?.public_uid || auth.user?.id || '',
        latestNoticeTimestamp(notices.value),
      )
    }
    noticesLoading.value = !cached
  } else {
    noticesLoading.value = true
  }
  try {
    notices.value = await listNotices()
    if (!selectedNotice.value || !notices.value.some((item) => item.id === selectedNotice.value?.id)) {
      selectedNotice.value = notices.value[0] || null
    }
    writeCache(noticesCacheKey(), notices.value)
    writeSeenTimestamp('notices', auth.user?.public_uid || auth.user?.id || '', latestNoticeTimestamp(notices.value))
  } catch (error) {
    ElMessage.error(errorText(error))
  } finally {
    noticesLoading.value = false
  }
}

async function loadMessages(silent = false) {
  if (auth.isAdmin) return
  if (!silent) {
    messagesLoading.value = true
  }
  try {
    messages.value = await listSupportMessages()
    writeSeenTimestamp(
      'support',
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

async function loadConversations(silent = false) {
  if (!auth.isAdmin) return
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
  } catch (error) {
    ElMessage.error(errorText(error))
  } finally {
    if (!silent) {
      conversationsLoading.value = false
    }
  }
}

async function loadWorldMessages(silent = false) {
  if (!silent) {
    worldLoading.value = true
  }
  try {
    worldMessages.value = await listWorldMessages()
    if (auth.isAdmin) {
      worldMutes.value = await listWorldMutes()
    }
  } catch (error) {
    ElMessage.error(errorText(error))
  } finally {
    if (!silent) {
      worldLoading.value = false
    }
  }
}

async function loadWorldMutes(silent = false) {
  if (!auth.isAdmin) return
  if (!silent) {
    mutesLoading.value = true
  }
  try {
    worldMutes.value = await listWorldMutes()
  } catch (error) {
    ElMessage.error(errorText(error))
  } finally {
    if (!silent) {
      mutesLoading.value = false
    }
  }
}

async function submitMessage() {
  const content = messageText.value.trim()
  if (!content) {
    ElMessage.warning('请输入消息内容。')
    return
  }
  sending.value = true
  try {
    await sendSupportMessage(content)
    messageText.value = ''
    await loadMessages()
  } catch (error) {
    ElMessage.error(errorText(error))
  } finally {
    sending.value = false
  }
}

async function submitWorldMessage() {
  const content = worldText.value.trim()
  if (!content) {
    ElMessage.warning('请输入世界聊天消息。')
    return
  }
  worldSending.value = true
  try {
    await sendWorldMessage(content)
    worldText.value = ''
    await loadWorldMessages()
  } catch (error) {
    ElMessage.error(errorText(error))
  } finally {
    worldSending.value = false
  }
}

async function confirmRecallWorldMessage(message: WorldMessage) {
  try {
    await ElMessageBox.confirm('确定撤回这条世界聊天消息吗？', '撤回消息', {
      confirmButtonText: '撤回',
      cancelButtonText: '取消',
      type: 'warning',
    })
    await recallWorldMessage(message.id)
    ElMessage.success('消息已撤回。')
    await loadWorldMessages()
  } catch (error) {
    if (error !== 'cancel' && error !== 'close') {
      ElMessage.error(errorText(error))
    }
  }
}

function openMuteDialog(message: WorldMessage) {
  muteForm.value = {
    publicUid: message.public_uid,
    nickname: message.nickname || '',
    reason: '',
  }
  muteDialogVisible.value = true
}

async function submitMuteWorldUser() {
  const reason = muteForm.value.reason.trim()
  if (!reason) {
    ElMessage.warning('请输入禁言原因。')
    return
  }
  muting.value = true
  try {
    await muteWorldUser(muteForm.value.publicUid, reason)
    muteDialogVisible.value = false
    ElMessage.success('已禁言该用户。')
    await loadWorldMutes()
  } catch (error) {
    ElMessage.error(errorText(error))
  } finally {
    muting.value = false
  }
}

async function openMuteList() {
  muteListVisible.value = true
  await loadWorldMutes()
}

async function submitUnmuteWorldUser(publicUid: string) {
  unmutingUid.value = publicUid
  try {
    await unmuteWorldUser(publicUid)
    ElMessage.success('已解除禁言。')
    await loadWorldMutes()
  } catch (error) {
    ElMessage.error(errorText(error))
  } finally {
    unmutingUid.value = ''
  }
}

function handleVisibilityChange() {
  syncAutoRefresh()
  if (!document.hidden) {
    void refreshActiveChat(true)
  }
}

watch(activeTab, (tab) => {
  stopAutoRefresh()
  if (tab === 'notices') {
    void loadNotices()
    return
  }
  if (tab === 'support') {
    if (auth.isAdmin) void loadConversations()
    else void loadMessages()
    syncAutoRefresh()
    return
  }
  if (tab === 'world') {
    void loadWorldMessages()
    syncAutoRefresh()
  }
})

onMounted(() => {
  void loadNotices()
  document.addEventListener('visibilitychange', handleVisibilityChange)
  syncAutoRefresh()
})

onBeforeUnmount(() => {
  stopAutoRefresh()
  document.removeEventListener('visibilitychange', handleVisibilityChange)
})
</script>

<style scoped>
.message-tabs :deep(.el-tabs__item) {
  font-weight: 700;
}

.notice-reader {
  display: grid;
  grid-template-columns: minmax(220px, 280px) minmax(0, 1fr);
  height: calc(100vh - 260px);
  min-height: 460px;
  overflow: hidden;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
}

.notice-list {
  min-height: 0;
  overflow: auto;
  overscroll-behavior: contain;
  border-right: 1px solid #e5e7eb;
  background: #f9fafb;
  padding: 8px;
}

.notice-item {
  display: grid;
  width: 100%;
  gap: 5px;
  padding: 10px;
  border: 0;
  border-radius: 8px;
  background: transparent;
  color: inherit;
  text-align: left;
  cursor: pointer;
}

.notice-item:hover {
  background: #eef2f7;
}

.notice-item.active {
  background: #e8f1ff;
}

.notice-item strong,
.notice-item p {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.notice-item span,
.notice-item p {
  margin: 0;
  color: #6b7280;
  font-size: 12px;
}

.notice-detail {
  min-height: 0;
  overflow: auto;
  overscroll-behavior: contain;
  padding: 18px;
}

.notice-detail-header {
  padding-bottom: 14px;
  border-bottom: 1px solid #e5e7eb;
}

.notice-detail-header h2 {
  margin: 0 0 8px;
  color: #111827;
  font-size: 18px;
}

.notice-detail-header span {
  color: #6b7280;
  font-size: 13px;
}

.notice-content {
  margin-top: 16px;
  white-space: pre-wrap;
  line-height: 1.8;
}

.chat-panel {
  display: grid;
  grid-template-rows: auto minmax(0, 1fr) auto;
  height: calc(100vh - 260px);
  min-height: 520px;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  overflow: hidden;
}

.chat-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 14px;
  border-bottom: 1px solid #e5e7eb;
  background: #f9fafb;
}

.message-list {
  min-height: 0;
  padding: 16px;
  overflow: auto;
  overscroll-behavior: contain;
  background: #ffffff;
}

.message-row {
  display: flex;
  margin-bottom: 12px;
}

.message-row.mine {
  justify-content: flex-end;
}

.message-row.recalled:not(.mine) {
  justify-content: center;
}

.message-bubble {
  max-width: min(560px, 78%);
  padding: 10px 12px;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  background: #f9fafb;
  line-height: 1.6;
}

.message-row.mine .message-bubble {
  border-color: #bfdbfe;
  background: #eff6ff;
}

.message-row.recalled:not(.mine) .message-bubble {
  max-width: min(520px, 86%);
}

.recalled-bubble {
  border-style: dashed;
  color: #6b7280;
  background: #f9fafb;
}

.world-status-row {
  display: flex;
  gap: 6px;
  margin-bottom: 6px;
}

.status-pill {
  display: inline-flex;
  padding: 1px 7px;
  border: 1px solid #d1d5db;
  border-radius: 999px;
  color: #6b7280;
  font-size: 12px;
}

.muted-pill {
  border-color: #fed7aa;
  color: #c2410c;
  background: #fff7ed;
}

.message-meta {
  margin-bottom: 4px;
  color: #6b7280;
  font-size: 12px;
}

.world-meta {
  display: grid;
  gap: 2px;
}

.world-nickname {
  color: #374151;
}

.world-subline {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  align-items: center;
}

.message-actions {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  margin-top: 6px;
}

.toolbar-actions {
  display: flex;
  gap: 8px;
}

.chat-input {
  display: grid;
  grid-template-columns: 1fr auto;
  gap: 10px;
  align-items: end;
  padding: 14px;
  border-top: 1px solid #e5e7eb;
}

.chat-input :deep(.el-textarea__inner) {
  overflow-y: auto;
  resize: none;
}

:global(:root.dark) .notice-reader,
:global(:root.dark) .chat-panel {
  border-color: var(--app-border);
  background: var(--app-surface);
}

:global(:root.dark) .notice-list,
:global(:root.dark) .chat-toolbar {
  border-color: var(--app-border);
  background: var(--app-surface-soft);
}

:global(:root.dark) .notice-item:hover {
  background: var(--app-surface-hover);
}

:global(:root.dark) .notice-item.active {
  background: #172554;
}

:global(:root.dark) .notice-item span,
:global(:root.dark) .notice-item p,
:global(:root.dark) .notice-detail-header span,
:global(:root.dark) .message-meta {
  color: var(--app-text-muted);
}

:global(:root.dark) .notice-detail,
:global(:root.dark) .message-list {
  background: var(--app-surface);
}

:global(:root.dark) .notice-detail-header {
  border-color: var(--app-border);
}

:global(:root.dark) .notice-detail-header h2,
:global(:root.dark) .world-nickname {
  color: var(--app-text);
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

:global(:root.dark) .recalled-bubble {
  color: var(--app-text-muted);
  background: var(--app-surface-soft);
}

:global(:root.dark) .status-pill {
  border-color: var(--app-border);
  color: var(--app-text-muted);
}

:global(:root.dark) .muted-pill {
  border-color: #9a3412;
  color: #fdba74;
  background: #431407;
}

:global(:root.dark) .chat-input {
  border-color: var(--app-border);
  background: var(--app-surface);
}

@media (max-width: 760px) {
  .notice-reader {
    grid-template-columns: 1fr;
    height: auto;
  }

  .notice-list {
    max-height: 280px;
    border-right: 0;
    border-bottom: 1px solid #e5e7eb;
  }

  .chat-panel {
    height: auto;
  }

  .chat-input {
    grid-template-columns: 1fr;
  }
}
</style>
