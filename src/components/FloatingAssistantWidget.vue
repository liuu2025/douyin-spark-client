<template>
  <div class="floating-assistant" :style="widgetStyle">
    <section v-if="open" class="floating-panel" :class="panelClass">
      <header class="floating-header">
        <div>
          <strong>智能客服</strong>
          <span>当前会话</span>
        </div>
        <div class="floating-actions">
          <el-tooltip content="打开完整客服">
            <el-button :icon="Maximize2" circle text @click="openFullAssistant" />
          </el-tooltip>
          <el-tooltip content="收起">
            <el-button :icon="X" circle text @click="open = false" />
          </el-tooltip>
        </div>
      </header>

      <div ref="messageListRef" class="floating-messages">
        <div v-if="assistant.messages.length === 0" class="floating-empty">
          <Bot :size="26" />
          <strong>随时问我</strong>
          <span>我可以帮你查抖音号、任务、登录状态和运行记录。</span>
        </div>

        <div
          v-for="message in assistant.messages"
          :key="message.id"
          class="floating-message"
          :class="{ mine: message.role === 'user' }"
        >
          <div class="floating-bubble">
            <span class="floating-meta">{{ message.role === 'user' ? '我' : '智能客服' }}</span>
            <span
              v-if="message.role === 'assistant' && message.statusText"
              class="floating-status"
            >
              {{ message.statusText }}
            </span>
            <p v-if="message.content">{{ message.content }}</p>

            <div
              v-if="message.role === 'assistant' && message.actionSuggestion"
              class="floating-suggestion"
            >
              <strong>{{ message.actionSuggestion.title }}</strong>
              <span>{{ message.actionSuggestion.message }}</span>
              <el-button size="small" type="primary" @click="assistant.openAutoSendDialog(message)">
                {{ message.actionSuggestion.button_label }}
              </el-button>
            </div>

            <div v-if="message.role === 'assistant' && assistant.hasDetails(message)" class="floating-detail">
              <span v-if="message.tools?.length">本次检查 {{ message.tools.length }} 项</span>
              <span v-if="message.sources?.length">参考资料 {{ message.sources.length }} 条</span>
              <el-button link size="small" @click="openFullAssistant">查看</el-button>
            </div>
          </div>
        </div>
      </div>

      <form class="floating-input" @submit.prevent="submit">
        <el-input
          v-model="input"
          :disabled="assistant.sending"
          maxlength="500"
          placeholder="输入问题..."
          @keydown.enter.prevent="submit"
        />
        <el-button circle type="primary" :disabled="!canSend" :loading="assistant.sending" native-type="submit">
          <Send :size="16" />
        </el-button>
      </form>
    </section>

    <button
      ref="bubbleRef"
      class="assistant-bubble"
      type="button"
      :aria-label="open ? '收起智能客服' : '打开智能客服'"
      @pointerdown="startDrag"
      @click="toggleOpen"
    >
      <Bot :size="24" />
      <span v-if="assistant.sending" class="bubble-pulse" />
    </button>
  </div>
</template>

<script setup lang="ts">
import { computed, nextTick, onMounted, onUnmounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { Bot, Maximize2, Send, X } from 'lucide-vue-next'
import { useAssistantStore } from '@/stores/assistant'

const POSITION_KEY = 'douyin-spark-floating-assistant-position'
const BUBBLE_SIZE = 58
const GAP = 12
const PANEL_WIDTH = 380
const PANEL_HEIGHT = 540

const route = useRoute()
const router = useRouter()
const assistant = useAssistantStore()

const bubbleRef = ref<HTMLElement>()
const messageListRef = ref<HTMLElement>()
const open = ref(false)
const input = ref('')
const position = ref(loadPosition())
const dragging = ref(false)
const moved = ref(false)
const dragOffset = ref({ x: 0, y: 0 })

const canSend = computed(() => input.value.trim().length > 0 && !assistant.sending)

const widgetStyle = computed(() => ({
  left: `${position.value.x}px`,
  top: `${position.value.y}px`,
}))

const anchorSide = computed(() => {
  return position.value.x + BUBBLE_SIZE / 2 < window.innerWidth / 2 ? 'left' : 'right'
})

const anchorVertical = computed(() => {
  return position.value.y + BUBBLE_SIZE / 2 < window.innerHeight / 2 ? 'top' : 'bottom'
})

const panelClass = computed(() => [
  anchorSide.value === 'left' ? 'panel-right' : 'panel-left',
  anchorVertical.value === 'top' ? 'panel-down' : 'panel-up',
])

function loadPosition() {
  const fallback = {
    x: Math.max(18, window.innerWidth - BUBBLE_SIZE - 26),
    y: Math.max(82, window.innerHeight - BUBBLE_SIZE - 26),
  }

  try {
    const raw = localStorage.getItem(POSITION_KEY)
    if (!raw) return fallback
    const parsed = JSON.parse(raw) as { x?: number; y?: number }
    return clampPosition({
      x: Number(parsed.x ?? fallback.x),
      y: Number(parsed.y ?? fallback.y),
    })
  } catch {
    return fallback
  }
}

function savePosition() {
  localStorage.setItem(POSITION_KEY, JSON.stringify(position.value))
}

function clampPosition(next: { x: number; y: number }) {
  const margin = 10
  return {
    x: Math.min(Math.max(margin, next.x), Math.max(margin, window.innerWidth - BUBBLE_SIZE - margin)),
    y: Math.min(Math.max(76, next.y), Math.max(76, window.innerHeight - BUBBLE_SIZE - margin)),
  }
}

function startDrag(event: PointerEvent) {
  const target = event.currentTarget as HTMLElement
  dragging.value = true
  moved.value = false
  dragOffset.value = {
    x: event.clientX - position.value.x,
    y: event.clientY - position.value.y,
  }
  target.setPointerCapture(event.pointerId)
  window.addEventListener('pointermove', onDrag)
  window.addEventListener('pointerup', stopDrag, { once: true })
}

function onDrag(event: PointerEvent) {
  if (!dragging.value) return
  const next = clampPosition({
    x: event.clientX - dragOffset.value.x,
    y: event.clientY - dragOffset.value.y,
  })
  if (Math.abs(next.x - position.value.x) > 2 || Math.abs(next.y - position.value.y) > 2) {
    moved.value = true
  }
  position.value = next
}

function stopDrag() {
  dragging.value = false
  savePosition()
  window.removeEventListener('pointermove', onDrag)
}

function toggleOpen() {
  if (moved.value) {
    moved.value = false
    return
  }
  open.value = !open.value
  if (open.value) {
    void ensureLoaded()
    void scrollToBottom()
  }
}

async function ensureLoaded() {
  if (!assistant.accounts.length && !assistant.accountsLoading) {
    void assistant.loadAccounts()
  }
  if (!assistant.conversations.length && !assistant.conversationsLoading) {
    await assistant.loadConversations()
  }
}

async function submit() {
  const question = input.value.trim()
  if (!question || assistant.sending) return
  input.value = ''
  await assistant.submitQuestion(question, {
    currentPage: currentPageLabel(),
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

async function openFullAssistant() {
  open.value = false
  await router.push('/assistant')
}

function currentPageLabel() {
  if (route.path.startsWith('/douyin-accounts/') && route.params.douyinId) {
    const douyinId = String(route.params.douyinId)
    assistant.selectedDouyinId = douyinId
    return `抖音号详情页 ${douyinId}`
  }
  if (route.path.startsWith('/douyin-accounts')) return '抖音号列表页'
  if (route.path.startsWith('/redeem-codes')) return '我的兑换码'
  if (route.path.startsWith('/messages')) return '消息中心'
  if (route.path.startsWith('/account')) return '账号设置'
  if (route.path.startsWith('/tutorials')) return '教程中心'
  if (route.path.startsWith('/activities')) return '活动广场'
  if (route.path.startsWith('/assistant')) return '智能客服'
  return '控制台页面'
}

function handleResize() {
  position.value = clampPosition(position.value)
  savePosition()
}

onMounted(() => {
  window.addEventListener('resize', handleResize)
})

onUnmounted(() => {
  window.removeEventListener('resize', handleResize)
  window.removeEventListener('pointermove', onDrag)
})
</script>

<style scoped>
.floating-assistant {
  position: fixed;
  z-index: 2400;
  width: 58px;
  height: 58px;
  pointer-events: none;
}

.assistant-bubble,
.floating-panel {
  pointer-events: auto;
}

.assistant-bubble {
  position: absolute;
  left: 0;
  top: 0;
  width: 58px;
  height: 58px;
  border: 1px solid rgba(64, 158, 255, 0.3);
  border-radius: 18px;
  background: linear-gradient(135deg, #111827, #2563eb);
  color: #ffffff;
  box-shadow: 0 16px 36px rgba(15, 23, 42, 0.26);
  cursor: grab;
  display: inline-flex;
  align-items: center;
  justify-content: center;
}

.assistant-bubble:active {
  cursor: grabbing;
}

.bubble-pulse {
  position: absolute;
  right: 9px;
  top: 9px;
  width: 9px;
  height: 9px;
  border-radius: 999px;
  background: #67c23a;
  box-shadow: 0 0 0 5px rgba(103, 194, 58, 0.22);
}

.floating-panel {
  position: absolute;
  width: min(380px, calc(100vw - 28px));
  height: min(540px, calc(100vh - 96px));
  border: 1px solid var(--app-border);
  border-radius: 8px;
  background: var(--app-surface);
  box-shadow: 0 22px 60px rgba(15, 23, 42, 0.24);
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.panel-left {
  right: calc(100% + 12px);
}

.panel-right {
  left: calc(100% + 12px);
}

.panel-up {
  bottom: 0;
}

.panel-down {
  top: 0;
}

.floating-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  padding: 12px 14px;
  border-bottom: 1px solid var(--app-border);
  background: var(--app-surface-soft);
}

.floating-header strong {
  display: block;
  color: var(--app-text);
  font-size: 15px;
}

.floating-header span {
  color: var(--app-text-muted);
  font-size: 12px;
}

.floating-actions {
  display: flex;
  align-items: center;
  gap: 4px;
}

.floating-messages {
  flex: 1;
  min-height: 0;
  overflow: auto;
  padding: 14px;
}

.floating-empty {
  min-height: 260px;
  display: grid;
  place-items: center;
  align-content: center;
  gap: 8px;
  text-align: center;
  color: var(--app-text-muted);
}

.floating-empty strong {
  color: var(--app-text);
}

.floating-empty span {
  max-width: 240px;
  font-size: 13px;
  line-height: 1.5;
}

.floating-message {
  display: flex;
  margin-bottom: 12px;
}

.floating-message.mine {
  justify-content: flex-end;
}

.floating-bubble {
  max-width: 92%;
  padding: 10px 12px;
  border: 1px solid var(--app-border);
  border-radius: 8px;
  background: var(--app-surface-soft);
}

.floating-message.mine .floating-bubble {
  background: #ecf5ff;
  border-color: #bfdbfe;
}

.floating-meta {
  display: block;
  margin-bottom: 5px;
  color: var(--app-text-muted);
  font-size: 12px;
}

.floating-bubble p {
  margin: 0;
  color: var(--app-text-body);
  font-size: 13px;
  line-height: 1.65;
  white-space: pre-wrap;
  word-break: break-word;
}

.floating-status {
  display: block;
  margin-bottom: 6px;
  color: #2563eb;
  font-size: 12px;
  line-height: 1.5;
}

.floating-suggestion {
  display: grid;
  gap: 7px;
  margin-top: 10px;
  padding: 10px;
  border: 1px solid #bfdbfe;
  border-radius: 8px;
  background: #eff6ff;
}

.floating-suggestion strong {
  color: #1d4ed8;
  font-size: 13px;
}

.floating-suggestion span {
  color: #475569;
  font-size: 12px;
  line-height: 1.5;
}

.floating-detail {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 6px;
  margin-top: 8px;
  color: var(--app-text-muted);
  font-size: 12px;
}

.floating-input {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  gap: 8px;
  padding: 12px;
  border-top: 1px solid var(--app-border);
  background: var(--app-surface);
}

:root.dark .floating-message.mine .floating-bubble {
  background: #172554;
  border-color: #1d4ed8;
}

@media (max-width: 640px) {
  .floating-assistant {
    left: auto !important;
    right: 16px;
    top: auto !important;
    bottom: 16px;
  }

  .floating-panel {
    position: fixed;
    left: 12px;
    right: 12px;
    bottom: 84px;
    top: auto;
    width: auto;
    height: min(620px, calc(100vh - 116px));
  }
}
</style>
