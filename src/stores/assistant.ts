import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import {
  createAssistantConversation,
  deleteAssistantConversation,
  getAssistantConversation,
  listAssistantConversations,
  streamAssistantChat,
  type AssistantActionSuggestion,
  type AssistantChatResponse,
  type AssistantConversationSummary,
  type AssistantMemoryUsage,
} from '@/api/assistant'
import { getDouyinAccount, listDouyinAccounts, setPolling } from '@/api/douyin'
import { errorText } from '@/api/http'
import type { DouyinAccount } from '@/api/types'

export type MessageRole = 'user' | 'assistant'

export interface ChatMessage {
  id: number
  role: MessageRole
  content: string
  statusText?: string
  tools?: AssistantChatResponse['tools']
  sources?: AssistantChatResponse['sources']
  actionSuggestion?: AssistantActionSuggestion
  pending?: boolean
}

const ACTIVE_CONVERSATION_KEY = 'douyin-spark-assistant-active-conversation'
const TYPEWRITER_INTERVAL_MS = 22
const TYPEWRITER_FAST_QUEUE_LENGTH = 120
const TYPEWRITER_FAST_CHARS = 2

export const useAssistantStore = defineStore('assistant', () => {
  const accounts = ref<DouyinAccount[]>([])
  const conversations = ref<AssistantConversationSummary[]>([])
  const accountsLoading = ref(false)
  const conversationsLoading = ref(false)
  const messagesLoading = ref(false)
  const selectedDouyinId = ref('')
  const activeConversationId = ref(localStorage.getItem(ACTIVE_CONVERSATION_KEY) || '')
  const sending = ref(false)
  const memory = ref<AssistantMemoryUsage | null>(null)
  const messages = ref<ChatMessage[]>([])
  const autoSendDialogOpen = ref(false)
  const pendingActionSuggestion = ref<AssistantActionSuggestion | null>(null)
  const actionDouyinId = ref('')
  const latestActionAccount = ref<DouyinAccount | null>(null)
  const actionAccountLoading = ref(false)
  const actionSaving = ref(false)
  const dismissedSuggestions = ref<Set<string>>(new Set())
  const shownSuggestions = ref<Set<string>>(new Set())
  const pendingLocalConversationId = ref('')
  let messageId = 0
  let typewriterTimer: ReturnType<typeof setTimeout> | null = null
  let typewriterQueue = ''
  let typewriterActiveMessage: ChatMessage | null = null
  let typewriterAfterUpdate: (() => void | Promise<void>) | undefined
  let typewriterIdleResolvers: Array<() => void> = []

  const canSend = computed(() => !sending.value)

  const memoryPercent = computed(() => {
    return Math.max(0, Math.round((memory.value?.current_fraction || 0) * 100))
  })

  const memoryPercentText = computed(() => `${memoryPercent.value}%`)
  const memoryProgress = computed(() => Math.min(100, memoryPercent.value))

  const memoryProgressColor = computed(() => {
    if (memoryPercent.value >= 90) return '#f56c6c'
    if (memoryPercent.value >= 75) return '#e6a23c'
    if (memoryPercent.value >= 50) return '#409eff'
    return '#67c23a'
  })

  const autoSendDialogTitle = computed(() => pendingActionSuggestion.value?.title || '自动发送设置')

  const isAlreadyTargetState = computed(() => {
    if (!pendingActionSuggestion.value || !latestActionAccount.value) return false
    const enabled = latestActionAccount.value.status === 'active'
    return enabled === pendingActionSuggestion.value.target_state
  })

  const alreadyTargetText = computed(() => {
    if (!pendingActionSuggestion.value || !latestActionAccount.value) return ''
    return pendingActionSuggestion.value.target_state
      ? `${accountLabel(latestActionAccount.value)} 的自动发送已经开启，无需重复开启。`
      : `${accountLabel(latestActionAccount.value)} 的自动发送已经关闭，无需重复关闭。`
  })

  function emptyMemory(): AssistantMemoryUsage {
    return {
      current_tokens: 0,
      max_tokens: 1,
      current_fraction: 0,
      trigger_fraction: 0.75,
      keep_fraction: 0.4,
      trigger_tokens: 0,
      keep_tokens: 0,
    }
  }

  function setActiveConversationId(conversationId: string) {
    activeConversationId.value = conversationId
    if (conversationId) {
      localStorage.setItem(ACTIVE_CONVERSATION_KEY, conversationId)
    } else {
      localStorage.removeItem(ACTIVE_CONVERSATION_KEY)
    }
  }

  function mergePendingConversation(items: AssistantConversationSummary[]) {
    if (!pendingLocalConversationId.value) return items
    if (items.some((item) => item.conversation_id === pendingLocalConversationId.value)) {
      pendingLocalConversationId.value = ''
      return items
    }
    return [
      {
        conversation_id: pendingLocalConversationId.value,
        title: '新会话',
      },
      ...items,
    ]
  }

  function accountLabel(account: DouyinAccount) {
    return account.display_name || account.profile_nickname || account.douyin_id
  }

  function entitlementLabel(status?: string) {
    if (status === 'active' || status === 'valid') return '有效'
    if (status === 'expired') return '已过期'
    return '未开通'
  }

  function entitlementTag(status?: string) {
    if (status === 'active' || status === 'valid') return 'success'
    if (status === 'expired') return 'warning'
    return 'info'
  }

  function hasDetails(message: ChatMessage) {
    return Boolean(message.tools?.length || message.sources?.length)
  }

  function resetTypewriter() {
    if (typewriterTimer) {
      clearTimeout(typewriterTimer)
    }
    typewriterTimer = null
    typewriterQueue = ''
    typewriterActiveMessage = null
    typewriterAfterUpdate = undefined
    resolveTypewriterIdle()
  }

  function enqueueTypewriterText(
    message: ChatMessage,
    text: string,
    afterUpdate?: () => void | Promise<void>,
  ) {
    if (!text) return

    if (typewriterActiveMessage && typewriterActiveMessage.id !== message.id) {
      resetTypewriter()
    }

    typewriterActiveMessage = message
    typewriterAfterUpdate = afterUpdate
    typewriterQueue += text

    if (!typewriterTimer) {
      scheduleTypewriterTick()
    }
  }

  function scheduleTypewriterTick() {
    typewriterTimer = setTimeout(() => {
      void runTypewriterTick()
    }, TYPEWRITER_INTERVAL_MS)
  }

  async function runTypewriterTick() {
    typewriterTimer = null

    if (!typewriterActiveMessage || !typewriterQueue) {
      typewriterActiveMessage = null
      typewriterAfterUpdate = undefined
      resolveTypewriterIdle()
      return
    }

    const takeCount =
      typewriterQueue.length > TYPEWRITER_FAST_QUEUE_LENGTH ? TYPEWRITER_FAST_CHARS : 1
    const nextText = typewriterQueue.slice(0, takeCount)
    typewriterQueue = typewriterQueue.slice(nextText.length)
    typewriterActiveMessage.content += nextText
    await typewriterAfterUpdate?.()

    if (typewriterQueue) {
      scheduleTypewriterTick()
    } else {
      typewriterActiveMessage = null
      typewriterAfterUpdate = undefined
      resolveTypewriterIdle()
    }
  }

  function waitForTypewriterIdle() {
    if (!typewriterTimer && !typewriterQueue) {
      return Promise.resolve()
    }
    return new Promise<void>((resolve) => {
      typewriterIdleResolvers.push(resolve)
    })
  }

  function resolveTypewriterIdle() {
    const resolvers = typewriterIdleResolvers
    typewriterIdleResolvers = []
    resolvers.forEach((resolve) => resolve())
  }

  function toolLabel(name: string) {
    const map: Record<string, string> = {
      get_current_user: '检查当前账号',
      list_douyin_accounts: '查看我的抖音号',
      get_douyin_account: '查看抖音号信息',
      get_login_status: '检查登录状态',
      list_send_tasks: '查看发送任务',
      list_account_runs: '查看运行记录',
      list_my_redeem_codes: '查看兑换码',
      list_schedule_slots: '查看轮次',
    }
    return map[name] || '内部检查'
  }

  function sourceLabel(source: NonNullable<AssistantChatResponse['sources']>[number]) {
    const parts = [
      source.document_title,
      source.section_title,
      source.question_title,
    ].filter(Boolean)
    return parts.length > 0 ? parts.join(' / ') : '知识库资料'
  }

  async function loadAccounts() {
    accountsLoading.value = true
    try {
      accounts.value = await listDouyinAccounts()
    } catch (error) {
      ElMessage.error(errorText(error))
    } finally {
      accountsLoading.value = false
    }
  }

  async function loadConversations() {
    conversationsLoading.value = true
    try {
      const remoteConversations = await listAssistantConversations()
      conversations.value = mergePendingConversation(remoteConversations)
      if (activeConversationId.value) {
        const exists = conversations.value.some((item) => item.conversation_id === activeConversationId.value)
        if (exists && messages.value.length === 0) {
          if (activeConversationId.value !== pendingLocalConversationId.value) {
            await selectConversation({ conversation_id: activeConversationId.value, title: '当前会话' })
          }
        } else if (!exists) {
          setActiveConversationId('')
        }
      }
      if (!activeConversationId.value && conversations.value[0]) {
        await selectConversation(conversations.value[0])
      }
    } catch (error) {
      ElMessage.error(errorText(error))
    } finally {
      conversationsLoading.value = false
    }
  }

  async function startNewConversation(afterUpdate?: () => void | Promise<void>) {
    try {
      const conversationId = await createAssistantConversation()
      pendingLocalConversationId.value = conversationId
      setActiveConversationId(conversationId)
      messages.value = []
      memory.value = emptyMemory()
      shownSuggestions.value = new Set()
      dismissedSuggestions.value = new Set()
      conversations.value = mergePendingConversation(conversations.value)
      await afterUpdate?.()
    } catch (error) {
      ElMessage.error(errorText(error))
    }
  }

  async function ensureConversation() {
    if (!activeConversationId.value) {
      setActiveConversationId(await createAssistantConversation())
    }
    return activeConversationId.value
  }

  async function selectConversation(
    conversation: AssistantConversationSummary,
    afterUpdate?: () => void | Promise<void>,
  ) {
    if (sending.value) return

    setActiveConversationId(conversation.conversation_id)
    messagesLoading.value = true
    try {
      const data = await getAssistantConversation(conversation.conversation_id)
      messages.value = data.messages.map((item) => ({
        id: ++messageId,
        role: item.role,
        content: item.content,
      }))
      memory.value = data.memory || emptyMemory()
      shownSuggestions.value = new Set()
      dismissedSuggestions.value = new Set()
      await afterUpdate?.()
    } catch (error) {
      ElMessage.error(errorText(error))
    } finally {
      messagesLoading.value = false
    }
  }

  async function removeConversation(conversationId: string, afterUpdate?: () => void | Promise<void>) {
    if (sending.value) return

    try {
      await ElMessageBox.confirm('确定删除这个智能客服会话吗？', '删除会话', {
        type: 'warning',
        confirmButtonText: '删除',
        cancelButtonText: '取消',
      })
      await deleteAssistantConversation(conversationId)
      conversations.value = conversations.value.filter((item) => item.conversation_id !== conversationId)

      if (activeConversationId.value === conversationId) {
        setActiveConversationId('')
        messages.value = []
        memory.value = null
        if (conversations.value[0]) {
          await selectConversation(conversations.value[0], afterUpdate)
        }
      }
    } catch (error) {
      if (error !== 'cancel') {
        ElMessage.error(errorText(error))
      }
    }
  }

  async function submitQuestion(
    question: string,
    options: {
      currentPage?: string
      afterUpdate?: () => void | Promise<void>
    } = {},
  ) {
    const trimmed = question.trim()
    if (!trimmed || sending.value) return

    messages.value.push({
      id: ++messageId,
      role: 'user',
      content: trimmed,
    })
    resetTypewriter()
    sending.value = true
    await options.afterUpdate?.()

    const pendingAssistantMessage: ChatMessage = {
      id: ++messageId,
      role: 'assistant',
      content: '',
      statusText: '正在连接智能客服...',
      tools: [],
      sources: [],
      pending: true,
    }
    messages.value.push(pendingAssistantMessage)
    const assistantMessage = messages.value[messages.value.length - 1]
    await options.afterUpdate?.()

    try {
      const conversationId = await ensureConversation()
      let hasDelta = false
      let streamError = ''

      await streamAssistantChat({
        message: trimmed,
        conversation_id: conversationId,
        current_page: options.currentPage || '智能客服',
        douyin_id: selectedDouyinId.value || undefined,
        top_k: 4,
      }, async (event) => {
        debugStreamEvent(event)

        if (event.type === 'start') {
          setActiveConversationId(event.conversation_id)
          memory.value = event.memory || memory.value
          return
        }

        if (event.type === 'status') {
          assistantMessage.statusText = event.message
          await options.afterUpdate?.()
          return
        }

        if (event.type === 'delta') {
          if (!hasDelta) {
            assistantMessage.content = ''
            assistantMessage.pending = false
            hasDelta = true
          }
          assistantMessage.statusText = '正在输出回复'
          enqueueTypewriterText(assistantMessage, event.text, options.afterUpdate)
          return
        }

        if (event.type === 'tool') {
          assistantMessage.statusText = '工具检查完成，大模型正在整理结果'
          assistantMessage.tools = [
            ...(assistantMessage.tools || []),
            {
              name: event.name,
              ok: event.ok,
              summary: event.summary,
              error_code: event.error_code,
            },
          ]
          await options.afterUpdate?.()
          return
        }

        if (event.type === 'done') {
          setActiveConversationId(event.conversation_id)
          if (pendingLocalConversationId.value === event.conversation_id) {
            pendingLocalConversationId.value = ''
          }
          assistantMessage.pending = false
          if (!hasDelta && event.answer) {
            assistantMessage.content = ''
            hasDelta = true
            enqueueTypewriterText(assistantMessage, event.answer, options.afterUpdate)
          }
          await waitForTypewriterIdle()
          assistantMessage.tools = event.tools || assistantMessage.tools || []
          assistantMessage.sources = event.sources || []
          assistantMessage.actionSuggestion = visibleActionSuggestion(event.action_suggestion || undefined)
          memory.value = event.memory || memory.value
          assistantMessage.statusText = ''
          await options.afterUpdate?.()
          return
        }

        if (event.type === 'error') {
          streamError = event.message
          assistantMessage.pending = false
          assistantMessage.statusText = ''
          if (!hasDelta) {
            assistantMessage.content = event.message
          }
          await options.afterUpdate?.()
        }
      })

      if (!assistantMessage.content.trim()) {
        assistantMessage.content = '暂时没有生成回答，请稍后再试。'
      }
      if (streamError) {
        ElMessage.error(streamError)
      }
      await loadConversations()
    } catch (error) {
      resetTypewriter()
      ElMessage.error(errorText(error))
      assistantMessage.pending = false
      assistantMessage.statusText = ''
      assistantMessage.content = '智能客服暂时没有回复成功。你可以稍后再试，或把当前页面状态发给人工客服。'
    } finally {
      sending.value = false
      await options.afterUpdate?.()
    }
  }

  function visibleActionSuggestion(suggestion?: AssistantActionSuggestion | null) {
    if (!suggestion || suggestion.type !== 'set_auto_send') return undefined

    const key = suggestionKey(suggestion)
    const userRequested = suggestion.reason?.startsWith('user_requested')
    if (!userRequested && (shownSuggestions.value.has(key) || dismissedSuggestions.value.has(key))) {
      return undefined
    }

    shownSuggestions.value = new Set(shownSuggestions.value).add(key)
    return suggestion
  }

  function suggestionKey(suggestion: AssistantActionSuggestion) {
    return `${activeConversationId.value || 'new'}:${suggestion.type}:${suggestion.target_state}`
  }

  async function openAutoSendDialog(message: ChatMessage) {
    if (!message.actionSuggestion) return

    pendingActionSuggestion.value = message.actionSuggestion
    actionDouyinId.value = selectedDouyinId.value || ''
    latestActionAccount.value = null
    autoSendDialogOpen.value = true

    if (!accounts.value.length) {
      await loadAccounts()
    }
  }

  async function loadActionAccount() {
    if (!actionDouyinId.value) {
      ElMessage.warning('请先选择要操作的抖音号。')
      return
    }

    actionAccountLoading.value = true
    try {
      latestActionAccount.value = await getDouyinAccount(actionDouyinId.value)
    } catch (error) {
      ElMessage.error(errorText(error))
    } finally {
      actionAccountLoading.value = false
    }
  }

  async function confirmAutoSendChange() {
    if (!pendingActionSuggestion.value || !latestActionAccount.value) return
    if (isAlreadyTargetState.value) {
      autoSendDialogOpen.value = false
      return
    }

    actionSaving.value = true
    try {
      const targetState = pendingActionSuggestion.value.target_state
      await setPolling(latestActionAccount.value.douyin_id, targetState)
      await Promise.all([loadAccounts(), loadActionAccount()])
      ElMessage.success(targetState ? '自动发送已开启。' : '自动发送已关闭。')
      autoSendDialogOpen.value = false
    } catch (error) {
      ElMessage.error(errorText(error))
      await loadActionAccount()
    } finally {
      actionSaving.value = false
    }
  }

  function dismissAutoSendSuggestion() {
    if (pendingActionSuggestion.value) {
      dismissedSuggestions.value = new Set(dismissedSuggestions.value).add(
        suggestionKey(pendingActionSuggestion.value),
      )
    }
    autoSendDialogOpen.value = false
  }

  function handleAutoSendDialogClosed() {
    pendingActionSuggestion.value = null
    latestActionAccount.value = null
    actionDouyinId.value = ''
    actionAccountLoading.value = false
    actionSaving.value = false
  }

  function debugStreamEvent(event: { type: string }) {
    if (localStorage.getItem('douyin_spark_assistant_debug') !== '1') return
    console.debug('[assistant-stream]', new Date().toISOString(), event)
  }

  return {
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
    autoSendDialogOpen,
    pendingActionSuggestion,
    actionDouyinId,
    latestActionAccount,
    actionAccountLoading,
    actionSaving,
    canSend,
    memoryPercent,
    memoryPercentText,
    memoryProgress,
    memoryProgressColor,
    autoSendDialogTitle,
    isAlreadyTargetState,
    alreadyTargetText,
    accountLabel,
    entitlementLabel,
    entitlementTag,
    hasDetails,
    toolLabel,
    sourceLabel,
    loadAccounts,
    loadConversations,
    startNewConversation,
    selectConversation,
    removeConversation,
    submitQuestion,
    openAutoSendDialog,
    loadActionAccount,
    confirmAutoSendChange,
    dismissAutoSendSuggestion,
    handleAutoSendDialogClosed,
  }
})
