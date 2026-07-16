import { ApiError, getStoredToken, http } from './http'

export interface AssistantChatPayload {
  message: string
  conversation_id?: string
  current_page?: string
  douyin_id?: string
  top_k?: number
}

export interface AssistantToolSummary {
  name: string
  ok: boolean
  summary: string
  error_code?: string
}

export interface AssistantKnowledgeSource {
  source?: string
  document_title?: string
  section_title?: string
  question_title?: string
}

export interface AssistantMemoryUsage {
  current_tokens: number
  max_tokens: number
  current_fraction: number
  trigger_fraction: number
  keep_fraction: number
  trigger_tokens: number
  keep_tokens: number
}

export interface AssistantActionSuggestion {
  type: 'set_auto_send' | string
  target_state: boolean
  title: string
  message: string
  button_label: string
  reason?: string
  requires_account_selection?: boolean
  requires_confirmation?: boolean
}

export interface AssistantChatResponse {
  answer: string
  conversation_id: string
  selected_douyin_id?: string
  tools?: AssistantToolSummary[]
  sources?: AssistantKnowledgeSource[]
  memory?: AssistantMemoryUsage
  action_suggestion?: AssistantActionSuggestion | null
}

export interface AssistantConversationSummary {
  conversation_id: string
  title: string
}

export interface AssistantConversationMessage {
  role: 'user' | 'assistant'
  content: string
}

export type AssistantStreamEvent =
  | { type: 'start'; conversation_id: string; memory?: AssistantMemoryUsage }
  | { type: 'status'; message: string }
  | { type: 'delta'; text: string }
  | AssistantToolSummary & { type: 'tool' }
  | {
      type: 'done'
      answer: string
      conversation_id: string
      selected_douyin_id?: string
      tools?: AssistantToolSummary[]
      sources?: AssistantKnowledgeSource[]
      memory?: AssistantMemoryUsage
      action_suggestion?: AssistantActionSuggestion | null
    }
  | { type: 'error'; message: string }

export async function chatWithAssistant(payload: AssistantChatPayload) {
  // http.post 会把对象转成 JSON，并通过拦截器自动带上当前登录 token。
  const { data } = await http.post<AssistantChatResponse>('/assistant/chat', payload, {
    // 智能客服可能要等大模型和内部检查结果，所以单独给更长超时时间。
    timeout: 120000,
  })
  return data
}

export async function streamAssistantChat(
  payload: AssistantChatPayload,
  onEvent: (event: AssistantStreamEvent) => void | Promise<void>,
) {
  const token = getStoredToken()
  const response = await fetch('/api/v1/assistant/chat/stream', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'text/event-stream',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(payload),
  })

  if (!response.ok) {
    throw new ApiError(await response.text(), 'assistant_unavailable', response.status)
  }
  if (!response.body) {
    throw new ApiError('浏览器没有收到智能客服响应流。', 'assistant_unavailable', response.status)
  }

  const reader = response.body.getReader()
  const decoder = new TextDecoder('utf-8')
  let buffer = ''

  while (true) {
    const { value, done } = await reader.read()
    if (done) break

    buffer += decoder.decode(value, { stream: true })
    const parts = buffer.split('\n\n')
    buffer = parts.pop() || ''

    for (const part of parts) {
      const event = parseSseEvent(part)
      if (event) {
        await onEvent(event)
      }
    }
  }

  if (buffer.trim()) {
    const event = parseSseEvent(buffer)
    if (event) {
      await onEvent(event)
    }
  }
}

function parseSseEvent(raw: string): AssistantStreamEvent | null {
  const lines = raw.split(/\r?\n/)
  let eventName = 'message'
  const dataLines: string[] = []

  for (const line of lines) {
    if (line.startsWith('event:')) {
      eventName = line.slice('event:'.length).trim()
    } else if (line.startsWith('data:')) {
      dataLines.push(line.slice('data:'.length).trimStart())
    }
  }

  if (!dataLines.length) return null

  try {
    const data = JSON.parse(dataLines.join('\n')) as Record<string, unknown>
    return { type: eventName, ...data } as AssistantStreamEvent
  } catch {
    return null
  }
}

export async function createAssistantConversation() {
  const { data } = await http.post<{ conversation_id: string }>('/assistant/conversations')
  return data.conversation_id
}

export async function listAssistantConversations() {
  const { data } = await http.get<{ items: AssistantConversationSummary[] }>(
    '/assistant/conversations',
  )
  return data.items || []
}

export async function getAssistantConversation(conversationId: string) {
  const { data } = await http.get<{
    conversation_id: string
    messages: AssistantConversationMessage[]
    memory: AssistantMemoryUsage
  }>(`/assistant/conversations/${conversationId}`)
  return data
}

export async function deleteAssistantConversation(conversationId: string) {
  const { data } = await http.delete<{ status: string }>(
    `/assistant/conversations/${conversationId}`,
  )
  return data
}
