<template>
  <section class="assistant-page">
    <div class="page-header">
      <div>
        <h1 class="page-title">智能客服</h1>
        <p class="page-subtitle">可以咨询登录状态、发送任务、轮次、兑换码和运行记录等问题。</p>
      </div>
      <el-button :icon="RefreshCw" :loading="accountsLoading" @click="loadAccounts">刷新抖音号</el-button>
    </div>

    <div class="assistant-layout">
      <aside class="assistant-side">
        <div class="side-section">
          <div class="side-header">
            <div class="side-title">会话</div>
            <el-button :icon="Plus" size="small" @click="startNewConversation">新建</el-button>
          </div>
          <div class="conversation-list" v-loading="conversationsLoading">
            <button
              v-for="conversation in conversations"
              :key="conversation.conversation_id"
              class="conversation-item"
              :class="{ active: conversation.conversation_id === activeConversationId }"
              type="button"
              @click="selectConversation(conversation)"
            >
              <span>{{ conversation.title || '新会话' }}</span>
              <el-button
                :icon="Trash2"
                text
                size="small"
                class="conversation-delete"
                @click.stop="removeConversation(conversation.conversation_id)"
              />
            </button>
            <p v-if="conversations.length === 0 && !conversationsLoading" class="side-hint">
              暂无历史会话。
            </p>
          </div>

          <div v-if="memory" class="memory-panel">
            <div class="memory-top">
              <span>上下文</span>
              <el-tooltip content="达到约 75% 时会自动整理旧对话。" placement="top">
                <strong>{{ memoryPercentText }}</strong>
              </el-tooltip>
            </div>
            <el-progress
              :percentage="memoryProgress"
              :show-text="false"
              :stroke-width="8"
              :color="memoryProgressColor"
            />
          </div>
        </div>

        <div class="side-section">
          <label class="field-label">关联抖音号</label>
          <el-select
            v-model="selectedDouyinId"
            class="account-select"
            clearable
            filterable
            placeholder="不指定抖音号"
            :loading="accountsLoading"
          >
            <el-option
              v-for="account in accounts"
              :key="account.douyin_id"
              :label="accountLabel(account)"
              :value="account.douyin_id"
            />
          </el-select>
          <p class="side-hint">如果问题和某个抖音号有关，先选中它，客服会一起检查对应状态。</p>
        </div>

        <div class="side-section">
          <div class="side-title">常见问题</div>
          <button
            v-for="question in quickQuestions"
            :key="question"
            class="quick-question"
            type="button"
            @click="askQuickQuestion(question)"
          >
            {{ question }}
          </button>
        </div>
      </aside>

      <div class="content-panel assistant-chat">
        <div class="panel-body chat-body">
          <div
            ref="messageListRef"
            class="message-list"
            v-loading="messagesLoading || (sending && messages.length === 0)"
          >
            <div v-if="messages.length === 0" class="empty-state">
              <Bot :size="34" />
              <strong>请直接输入你的问题</strong>
              <span>例如：为什么任务显示正常但没有发送？</span>
            </div>

            <div
              v-for="message in messages"
              :key="message.id"
              class="message-row"
              :class="{ mine: message.role === 'user' }"
            >
                <div class="message-bubble">
                  <div class="message-meta">{{ message.role === 'user' ? '我' : '智能客服' }}</div>
                <div v-if="message.role === 'assistant' && message.statusText" class="message-status">
                  {{ message.statusText }}
                </div>
                <div v-if="message.content" class="message-content">{{ message.content }}</div>
                <div
                  v-if="message.role === 'assistant' && message.actionSuggestion"
                  class="action-suggestion"
                >
                  <div>
                    <strong>{{ message.actionSuggestion.title }}</strong>
                    <p>{{ message.actionSuggestion.message }}</p>
                  </div>
                  <el-button type="primary" size="small" @click="openAutoSendDialog(message)">
                    {{ message.actionSuggestion.button_label }}
                  </el-button>
                </div>

                <el-collapse
                  v-if="message.role === 'assistant' && hasDetails(message)"
                  class="answer-details"
                >
                  <el-collapse-item v-if="message.tools?.length" title="本次检查" name="checks">
                    <div
                      v-for="tool in message.tools"
                      :key="`${message.id}-${tool.name}`"
                      class="detail-line"
                    >
                      <el-tag :type="tool.ok ? 'success' : 'warning'" size="small">
                        {{ tool.ok ? '已完成' : '未完成' }}
                      </el-tag>
                      <span>{{ toolLabel(tool.name) }}</span>
                      <p>{{ tool.summary }}</p>
                    </div>
                  </el-collapse-item>

                  <el-collapse-item v-if="message.sources?.length" title="参考资料" name="sources">
                    <div
                      v-for="(source, index) in message.sources"
                      :key="`${message.id}-source-${index}`"
                      class="source-line"
                    >
                      {{ sourceLabel(source) }}
                    </div>
                  </el-collapse-item>
                </el-collapse>
              </div>
            </div>
          </div>

          <div class="chat-input">
            <el-input
              v-model="messageText"
              type="textarea"
              :autosize="{ minRows: 2, maxRows: 5 }"
              maxlength="1000"
              show-word-limit
              placeholder="输入你遇到的问题"
              @keyup.ctrl.enter="submitQuestion"
            />
            <el-button type="primary" :loading="sending" :disabled="!canSend" @click="submitQuestion">
              <Send :size="16" />
              <span>发送</span>
            </el-button>
          </div>
        </div>
      </div>
    </div>

  </section>
</template>

<script setup lang="ts">
import { computed, nextTick, onMounted, ref } from 'vue'
import { storeToRefs } from 'pinia'
import { Bot, Plus, RefreshCw, Send, Trash2 } from 'lucide-vue-next'
import { useAssistantStore } from '@/stores/assistant'
import type { AssistantChatResponse } from '@/api/assistant'

const assistant = useAssistantStore()
const {
  accounts,
  conversations,
  accountsLoading,
  conversationsLoading,
  messagesLoading,
  selectedDouyinId,
  activeConversationId,
  sending,
  memory,
  messages,
  memoryPercentText,
  memoryProgress,
  memoryProgressColor,
} = storeToRefs(assistant)

const messageText = ref('')
const messageListRef = ref<HTMLElement>()

const quickQuestions = [
  '为什么任务显示正常但没有发送？',
  '登录状态无效怎么办？',
  '兑换码兑换后为什么还是不能自动发送？',
  '为什么没有运行记录？',
]

const canSend = computed(() => messageText.value.trim().length > 0 && !sending.value)

async function startNewConversation() {
  messageText.value = ''
  await assistant.startNewConversation(scrollToBottom)
}

async function selectConversation(conversation: { conversation_id: string; title: string }) {
  await assistant.selectConversation(conversation, scrollToBottom)
}

async function removeConversation(conversationId: string) {
  await assistant.removeConversation(conversationId, scrollToBottom)
}

function askQuickQuestion(question: string) {
  messageText.value = question
  void submitQuestion()
}

async function submitQuestion() {
  const question = messageText.value.trim()
  if (!question || sending.value) return
  messageText.value = ''
  await assistant.submitQuestion(question, {
    currentPage: '智能客服',
    afterUpdate: scrollToBottom,
  })
}

async function scrollToBottom() {
  await nextTick()
  const el = messageListRef.value
  if (el) {
    el.scrollTop = el.scrollHeight
  }
}

onMounted(() => {
  void assistant.loadAccounts()
  void assistant.loadConversations()
})

const loadAccounts = assistant.loadAccounts
const accountLabel = assistant.accountLabel
const hasDetails = assistant.hasDetails
const openAutoSendDialog = assistant.openAutoSendDialog
const toolLabel = assistant.toolLabel
const sourceLabel = assistant.sourceLabel
</script>

<style scoped>
.assistant-page {
  min-width: 0;
}

.assistant-layout {
  display: grid;
  grid-template-columns: minmax(220px, 300px) minmax(0, 1fr);
  gap: 16px;
  min-height: calc(100vh - 130px);
}

.assistant-side {
  border: 1px solid var(--app-border);
  border-radius: 8px;
  background: var(--app-surface);
  padding: 16px;
  align-self: start;
}

.side-section + .side-section {
  margin-top: 20px;
}

.side-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  margin-bottom: 8px;
}

.field-label,
.side-title {
  display: block;
  margin-bottom: 8px;
  color: var(--app-text);
  font-size: 14px;
  font-weight: 700;
}

.side-header .side-title {
  margin-bottom: 0;
}

.conversation-list {
  min-height: 38px;
  max-height: 220px;
  overflow: auto;
}

.conversation-item {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  align-items: center;
  width: 100%;
  min-height: 36px;
  margin-top: 8px;
  padding: 6px 6px 6px 10px;
  border: 1px solid var(--app-border);
  border-radius: 6px;
  background: var(--app-surface-soft);
  color: var(--app-text-body);
  text-align: left;
  cursor: pointer;
}

.conversation-item span {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.conversation-item:hover,
.conversation-item.active {
  border-color: #409eff;
  color: #2563eb;
}

.conversation-delete {
  visibility: hidden;
}

.conversation-item:hover .conversation-delete,
.conversation-item.active .conversation-delete {
  visibility: visible;
}

.memory-panel {
  margin-top: 12px;
  padding-top: 12px;
  border-top: 1px solid var(--app-border);
}

.memory-top {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  margin-bottom: 8px;
  color: var(--app-text-muted);
  font-size: 13px;
}

.memory-top strong {
  color: var(--app-text);
  font-size: 13px;
}

.account-select {
  width: 100%;
}

.side-hint {
  margin: 8px 0 0;
  color: var(--app-text-muted);
  font-size: 13px;
  line-height: 1.6;
}

.quick-question {
  display: block;
  width: 100%;
  min-height: 38px;
  margin-top: 8px;
  padding: 8px 10px;
  border: 1px solid var(--app-border);
  border-radius: 6px;
  background: var(--app-surface-soft);
  color: var(--app-text-body);
  text-align: left;
  line-height: 1.45;
  cursor: pointer;
}

.quick-question:hover {
  border-color: #409eff;
  color: #2563eb;
}

.assistant-chat {
  min-width: 0;
}

.chat-body {
  display: flex;
  flex-direction: column;
  height: calc(100vh - 130px);
  min-height: 520px;
}

.message-list {
  flex: 1;
  min-height: 0;
  overflow: auto;
  padding-right: 4px;
}

.empty-state {
  min-height: 260px;
  display: grid;
  place-items: center;
  align-content: center;
  gap: 10px;
  color: var(--app-text-muted);
  text-align: center;
}

.empty-state strong {
  color: var(--app-text);
  font-size: 16px;
}

.message-row {
  display: flex;
  margin-bottom: 14px;
}

.message-row.mine {
  justify-content: flex-end;
}

.message-bubble {
  max-width: min(760px, 88%);
  border: 1px solid var(--app-border);
  border-radius: 8px;
  background: var(--app-surface-soft);
  padding: 12px 14px;
}

.message-row.mine .message-bubble {
  background: #ecf5ff;
  border-color: #bfdbfe;
}

.message-meta {
  margin-bottom: 6px;
  color: var(--app-text-muted);
  font-size: 12px;
}

.message-content {
  color: var(--app-text-body);
  font-size: 14px;
  line-height: 1.75;
  white-space: pre-wrap;
  word-break: break-word;
}

.message-status {
  margin-bottom: 8px;
  color: #2563eb;
  font-size: 13px;
  line-height: 1.5;
}

.action-suggestion {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-top: 12px;
  padding: 12px;
  border: 1px solid #bfdbfe;
  border-radius: 8px;
  background: #eff6ff;
}

.action-suggestion strong {
  display: block;
  color: #1d4ed8;
  font-size: 14px;
}

.action-suggestion p {
  margin: 4px 0 0;
  color: #475569;
  font-size: 13px;
  line-height: 1.5;
}

.answer-details {
  margin-top: 10px;
}

.detail-line {
  display: grid;
  grid-template-columns: auto minmax(80px, 140px) minmax(0, 1fr);
  align-items: start;
  gap: 8px;
  padding: 8px 0;
  border-bottom: 1px solid var(--app-border);
}

.detail-line:last-child {
  border-bottom: 0;
}

.detail-line p {
  margin: 0;
  color: var(--app-text-muted);
  line-height: 1.6;
  word-break: break-word;
}

.source-line {
  padding: 6px 0;
  color: var(--app-text-muted);
  font-size: 13px;
  line-height: 1.6;
  word-break: break-word;
}

.auto-send-dialog {
  display: grid;
  gap: 14px;
}

.dialog-account-select {
  width: 100%;
}

.option-status {
  float: right;
  color: var(--app-text-muted);
  font-size: 12px;
}

.confirm-account {
  display: grid;
  gap: 4px;
}

.confirm-account strong {
  color: var(--app-text);
  font-size: 16px;
}

.confirm-account span {
  color: var(--app-text-muted);
  font-size: 13px;
}

.state-grid {
  display: grid;
  grid-template-columns: 96px minmax(0, 1fr);
  gap: 10px 12px;
  align-items: center;
  padding: 12px;
  border: 1px solid var(--app-border);
  border-radius: 8px;
  background: var(--app-surface-soft);
}

.state-grid > span:nth-child(odd) {
  color: var(--app-text-muted);
  font-size: 13px;
}

.confirm-note {
  margin: 0;
  color: var(--app-text-body);
  line-height: 1.6;
}

.chat-input {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  align-items: end;
  gap: 10px;
  padding-top: 14px;
  border-top: 1px solid var(--app-border);
}

.chat-input .el-button {
  height: 40px;
  display: inline-flex;
  gap: 6px;
  align-items: center;
}

:root.dark .message-row.mine .message-bubble {
  background: #172554;
  border-color: #1d4ed8;
}

@media (max-width: 900px) {
  .assistant-layout {
    grid-template-columns: 1fr;
  }

  .chat-body {
    height: auto;
    min-height: 560px;
  }

  .message-list {
    max-height: 58vh;
  }
}

@media (max-width: 640px) {
  .page-header {
    align-items: flex-start;
    flex-direction: column;
  }

  .message-bubble {
    max-width: 100%;
  }

  .detail-line {
    grid-template-columns: 1fr;
  }

  .chat-input {
    grid-template-columns: 1fr;
  }
}
</style>
