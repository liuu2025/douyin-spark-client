<template>
  <el-drawer
    :model-value="modelValue"
    :title="task ? '编辑发送任务' : '新增发送任务'"
    size="min(1120px, 96vw)"
    direction="rtl"
    class="send-task-drawer"
    @close="emit('update:modelValue', false)"
  >
    <div class="drawer-content">
      <el-form :model="form" label-position="top" class="drawer-form">
        <div class="dialog-toolbar">
          <span class="muted">配置这个抖音号要使用的发送话术、发送对象和参与轮次。</span>
          <el-button link type="primary" @click="resetDefaults">恢复默认设置</el-button>
        </div>

        <div class="task-switch-row">
          <span>启用任务</span>
          <el-switch v-model="form.enabled" />
        </div>

        <el-segmented
          v-model="activePanel"
          :options="panelOptions"
          class="task-panel-tabs"
        />

        <div class="task-panel-body">
          <div v-show="activePanel === 'speech'" class="panel-scroll speech-panel">
            <aside class="speech-help">
              <p>一行一句话术，发送时系统会随机选择其中一句。只填写一行时，每次都会发送这一句。</p>
              <p>txt 文件导入话术时，每一行会作为一句话术；空行会自动过滤，超过 200 字的话术不会导入。</p>
              <p><strong>支持变量：</strong>发送前会自动替换成实际时间。</p>
              <p><strong v-pre>{{datetime}}：</strong>{{ variableExamples.datetime }}，完整日期时间。</p>
              <p><strong v-pre>{{date}}：</strong>{{ variableExamples.date }}，日期。</p>
              <p><strong v-pre>{{time}}：</strong>{{ variableExamples.time }}，时间。</p>
              <p><strong v-pre>{{hour}}：</strong>{{ variableExamples.hour }}，小时。</p>
              <p><strong v-pre>{{minute}}：</strong>{{ variableExamples.minute }}，分钟。</p>
              <p>不建议填写链接、二维码、验证码、随机码、兑换码、福利、中奖、返现、扫码、点击等内容。</p>
            </aside>
            <div class="speech-editor">
              <el-form-item label="发送话术" class="strong-form-label">
                <el-input
                  v-model="form.message_template"
                  type="textarea"
                  :rows="14"
                />
                <div class="speech-actions">
                  <el-button type="primary" plain @click="openSpeechFilePicker">导入 txt 话术</el-button>
                  <input
                    ref="speechFileInput"
                    class="speech-file-input"
                    type="file"
                    accept=".txt,text/plain"
                    @change="handleSpeechFileChange"
                  />
                </div>
              </el-form-item>
            </div>
          </div>

          <div v-show="activePanel === 'preview'" class="panel-scroll preview-panel">
            <div class="preview-box">
              <strong>随机发送预览</strong>
              <p class="preview-note">
                系统会从以下 {{ messagePreviewLines.length }} 句中随机选择 1 句发送：
              </p>
              <div>
                <p v-for="(line, index) in messagePreviewLines" :key="index + '-' + line">
                  <span>{{ previewIndex(index) }}.</span>
                  {{ line }}
                </p>
              </div>
            </div>
          </div>

          <div v-show="activePanel === 'target'" class="panel-scroll">
            <el-form-item label="发送目标" class="strong-form-label">
              <div class="target-panel">
                <div class="target-section">
                  <el-checkbox v-model="targetForm.friendEnabled">发送给好友</el-checkbox>
                  <div class="target-help">
                    按选择的方式匹配好友备注。不建议填入特殊符号。
                  </div>
                  <el-segmented
                    v-model="targetForm.friendMode"
                    :options="friendModeOptions"
                    :disabled="!targetForm.friendEnabled"
                  />
                  <div class="target-help">
                    <p><strong>前缀匹配：</strong>备注以填写内容开头时匹配。</p>
                    <p><strong>包含匹配：</strong>备注任意位置包含填写内容时匹配。</p>
                    <p><strong>精确匹配：</strong>备注与填写内容一致时匹配。</p>
                  </div>
                  <el-input
                    v-model.trim="targetForm.friendPrefix"
                    :disabled="!targetForm.friendEnabled"
                  />
                </div>
                <div class="target-section">
                  <el-checkbox v-model="targetForm.groupEnabled">发送到群聊</el-checkbox>
                  <div class="target-help">
                    <p><strong>匹配群聊名称关键词：</strong>多个关键词用空格隔开。不建议填入特殊符号。</p>
                  </div>
                  <el-segmented
                    v-model="targetForm.groupMode"
                    :options="groupModeOptions"
                    :disabled="!targetForm.groupEnabled"
                  />
                  <div class="target-help">
                    <p><strong>包含任意一个关键词：</strong>群名只要包含其中任意一个关键词就会匹配。</p>
                  </div>
                  <el-input
                    v-model.trim="targetForm.groupKeywordsText"
                    :disabled="!targetForm.groupEnabled"
                  />
                </div>
              </div>
            </el-form-item>
          </div>

          <div v-show="activePanel === 'slots'" class="panel-scroll">
            <el-form-item label="参与轮次" class="strong-form-label">
              <div class="slot-picker" v-loading="slotsLoading">
                <div class="slot-help">
                  <p><strong>固定时间轮次：</strong>每天到指定时间触发，例如 10:00、20:00。</p>
                  <p><strong>间隔轮次：</strong>按固定间隔触发，例如每 1 小时。</p>
                  <p>勾选某个轮次后，当前任务会在该轮次触发时参与自动发送。</p>
                </div>
                <div v-if="slots.length > 0" class="slot-header">
                  <span>选择</span>
                  <span>轮次触发</span>
                  <span>轮次类型</span>
                  <span>轮次名称</span>
                </div>
                <el-checkbox-group v-model="form.slot_ids">
                  <el-checkbox
                    v-for="slot in slots"
                    :key="slot.id"
                    :label="slot.id"
                    class="slot-option"
                  >
                    <span class="slot-row-content">
                      <span class="slot-time">{{ slotTimeText(slot) }}</span>
                      <span class="slot-type">{{ slotModeText(slot) }}</span>
                      <span class="slot-name">{{ slot.name }}</span>
                    </span>
                  </el-checkbox>
                </el-checkbox-group>
                <el-empty v-if="slots.length === 0 && !slotsLoading" description="暂无可选轮次" />
              </div>
            </el-form-item>
          </div>
        </div>
      </el-form>
      <div class="drawer-footer">
        <el-button @click="emit('update:modelValue', false)">取消</el-button>
        <el-button type="primary" :loading="saving" @click="save">保存</el-button>
      </div>
    </div>
  </el-drawer>
</template>

<script setup lang="ts">
import { computed, reactive, ref, watch } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { listScheduleSlots } from '@/api/schedule'
import {
  createSendTask,
  listTaskSlots,
  pauseSendTask,
  resumeSendTask,
  updateSendTask,
  updateTaskSlots,
} from '@/api/sendTasks'
import {
  createAdminSendTask,
  listAdminTaskSlots,
  pauseAdminSendTask,
  resumeAdminSendTask,
  updateAdminSendTask,
  updateAdminTaskSlots,
} from '@/api/adminDouyin'
import { errorText } from '@/api/http'
import type { SendScheduleSlot, SendTask } from '@/api/types'

interface TargetRule {
  id: string
  type: 'friend' | 'group'
  mode: 'prefix' | 'contains' | 'contains_all' | 'exact'
  value?: string
  values?: string[]
}

interface SpeechParseResult {
  rawLineCount: number
  validLines: string[]
  emptyLineCount: number
  overlongLines: Array<{ lineNumber: number; length: number; text: string }>
  duplicateCount: number
}

const MAX_SPEECH_CHARS = 200

const DEFAULT_MESSAGE = `现在是 {{datetime}}
现在时间 {{time}}
今天是 {{date}}
{{hour}} 点 {{minute}} 分
{{time}}
{{date}} {{time}}
到 {{hour}} 点了
{{datetime}}`
const DEFAULT_FRIEND_PREFIX = '000'
const DEFAULT_GROUP_KEYWORDS = ''
const friendModeOptions = [
  { label: '前缀匹配', value: 'prefix' },
  { label: '包含匹配', value: 'contains' },
  { label: '精确匹配', value: 'exact' },
]
const groupModeOptions = [
  { label: '包含任意一个关键词', value: 'contains' },
]
const props = defineProps<{
  modelValue: boolean
  douyinId: string
  task?: SendTask | null
  adminMode?: boolean
}>()

const emit = defineEmits<{
  'update:modelValue': [value: boolean]
  saved: []
}>()

const saving = defineModel<boolean>('saving', { default: false })
const slots = ref<SendScheduleSlot[]>([])
const slotsLoading = ref(false)
const speechFileInput = ref<HTMLInputElement | null>(null)
const activePanel = ref<'speech' | 'preview' | 'target' | 'slots'>('speech')
const panelOptions = [
  { label: '发送话术', value: 'speech' },
  { label: '预览效果', value: 'preview' },
  { label: '发送目标', value: 'target' },
  { label: '参与轮次', value: 'slots' },
]
const form = reactive({
  message_template: DEFAULT_MESSAGE,
  datetime_format: '2006-01-02 15:04',
  target_rules_json: '[]',
  enabled: true,
  slot_ids: [] as string[],
})
const targetForm = reactive({
  friendEnabled: true,
  friendMode: 'prefix' as 'prefix' | 'contains' | 'exact',
  friendPrefix: DEFAULT_FRIEND_PREFIX,
  groupEnabled: false,
  groupMode: 'contains' as 'contains_all' | 'contains',
  groupKeywordsText: DEFAULT_GROUP_KEYWORDS,
})

const messagePreviewLines = computed(() => {
  const lines = speechLines(form.message_template || DEFAULT_MESSAGE)
  return lines.map((line) => renderSpeechPreview(line, new Date()))
})

const variableExamples = computed(() => {
  const now = new Date()
  return {
    datetime: formatDateTime(now),
    date: formatDate(now),
    time: formatTime(now),
    hour: String(now.getHours()).padStart(2, '0'),
    minute: String(now.getMinutes()).padStart(2, '0'),
  }
})

watch(
  () => [props.modelValue, props.task] as const,
  () => {
    if (!props.modelValue) return
    form.message_template = props.task?.message_template || DEFAULT_MESSAGE
    form.datetime_format = props.task?.datetime_format || '2006-01-02 15:04'
    form.target_rules_json = props.task?.target_rules_json || '[]'
    form.enabled = props.task?.enabled ?? props.task?.status !== 'paused'
    form.slot_ids = props.task?.slot_ids ? [...props.task.slot_ids] : []
    activePanel.value = 'speech'
    hydrateTargetForm(form.target_rules_json)
    void loadSlots()
  },
  { immediate: true },
)

function slotTimeText(slot: SendScheduleSlot) {
  if (slot.mode === 'interval') {
    const hours = Math.floor((slot.interval_seconds || 0) / 3600)
    return hours > 0 ? `每 ${hours} 小时` : `间隔 ${slot.interval_seconds || '-'} 秒`
  }
  return slot.time_of_day || '-'
}

function slotModeText(slot: SendScheduleSlot) {
  return slot.mode === 'interval' ? '间隔轮次' : '固定时间轮次'
}

function formatDateTime(date: Date) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  const hour = String(date.getHours()).padStart(2, '0')
  const minute = String(date.getMinutes()).padStart(2, '0')
  return `${year}-${month}-${day} ${hour}:${minute}`
}

function formatDate(date: Date) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function formatTime(date: Date) {
  const hour = String(date.getHours()).padStart(2, '0')
  const minute = String(date.getMinutes()).padStart(2, '0')
  return `${hour}:${minute}`
}

function renderSpeechPreview(template: string, date: Date) {
  const hour = String(date.getHours()).padStart(2, '0')
  const minute = String(date.getMinutes()).padStart(2, '0')
  return template
    .split('{{datetime}}')
    .join(formatDateTime(date))
    .split('{{date}}')
    .join(formatDate(date))
    .split('{{time}}')
    .join(formatTime(date))
    .split('{{hour}}')
    .join(hour)
    .split('{{minute}}')
    .join(minute)
}

function previewIndex(index: number) {
  return String(index + 1).padStart(4, ' ')
}

function speechLines(value: string) {
  return value
    .replace(/\r\n?/g, '\n')
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
}

function speechLength(value: string) {
  return Array.from(value).length
}

function parseSpeechText(value: string): SpeechParseResult {
  const lines = value.replace(/^\uFEFF/, '').replace(/\r\n?/g, '\n').split('\n')
  const validLines: string[] = []
  const overlongLines: SpeechParseResult['overlongLines'] = []
  let emptyLineCount = 0
  const seen = new Set<string>()
  let duplicateCount = 0

  lines.forEach((rawLine, index) => {
    const line = rawLine.trim()
    if (!line) {
      emptyLineCount += 1
      return
    }
    const length = speechLength(line)
    if (length > MAX_SPEECH_CHARS) {
      overlongLines.push({ lineNumber: index + 1, length, text: line })
      return
    }
    if (seen.has(line)) {
      duplicateCount += 1
    } else {
      seen.add(line)
    }
    validLines.push(line)
  })

  return {
    rawLineCount: lines.length,
    validLines,
    emptyLineCount,
    overlongLines,
    duplicateCount,
  }
}

function openSpeechFilePicker() {
  speechFileInput.value?.click()
}

async function handleSpeechFileChange(event: Event) {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  input.value = ''
  if (!file) return
  if (!file.name.toLowerCase().endsWith('.txt')) {
    ElMessage.warning('只支持导入 txt 文件')
    return
  }
  try {
    const text = await file.text()
    const result = parseSpeechText(text)
    if (result.validLines.length === 0) {
      await ElMessageBox.alert(speechImportSummary(file.name, result), 'txt 导入结果', {
        confirmButtonText: '知道了',
        dangerouslyUseHTMLString: true,
      })
      return
    }
    await ElMessageBox.confirm(speechImportSummary(file.name, result), '确认导入 txt 话术', {
      confirmButtonText: '替换当前话术',
      cancelButtonText: '取消',
      distinguishCancelAndClose: true,
      dangerouslyUseHTMLString: true,
      type: result.overlongLines.length > 0 ? 'warning' : 'info',
    })
    form.message_template = result.validLines.join('\n')
    ElMessage.success(`已导入 ${result.validLines.length} 条有效话术`)
  } catch (error) {
    if (error === 'cancel' || error === 'close') return
    ElMessage.error(errorText(error))
  }
}

function speechImportSummary(fileName: string, result: SpeechParseResult) {
  const escapedName = escapeHTML(fileName)
  const overlongPreview = result.overlongLines
    .slice(0, 5)
    .map((item) => `第 ${item.lineNumber} 行（${item.length} 字）：${escapeHTML(item.text.slice(0, 40))}`)
    .join('<br>')
  return `
    <div class="speech-confirm">
      <p><strong>文件：</strong>${escapedName}</p>
      <p><strong>原始行数：</strong>${result.rawLineCount}</p>
      <p><strong>有效话术：</strong>${result.validLines.length}</p>
      <p><strong>空行已过滤：</strong>${result.emptyLineCount}</p>
      <p><strong>超过 ${MAX_SPEECH_CHARS} 字已过滤：</strong>${result.overlongLines.length}</p>
      <p><strong>重复话术：</strong>${result.duplicateCount}</p>
      ${overlongPreview ? `<p class="speech-confirm-warning">${overlongPreview}</p>` : ''}
      <p>确认后会用有效话术替换当前文本框内容。</p>
    </div>
  `
}

function escapeHTML(value: string) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

async function confirmSaveSpeech() {
  const result = parseSpeechText(form.message_template)
  if (result.validLines.length === 0) {
    ElMessage.warning('请至少填写 1 条发送话术。')
    return null
  }
  await ElMessageBox.confirm(speechSaveSummary(result), '确认保存话术', {
    confirmButtonText: '确认保存',
    cancelButtonText: '取消',
    dangerouslyUseHTMLString: true,
    type: result.overlongLines.length > 0 ? 'warning' : 'info',
  })
  return result.validLines.join('\n')
}

function speechSaveSummary(result: SpeechParseResult) {
  return `
    <div class="speech-confirm">
      <p><strong>最终保存：</strong>${result.validLines.length} 条话术</p>
      <p><strong>空行已过滤：</strong>${result.emptyLineCount}</p>
      <p><strong>超过 ${MAX_SPEECH_CHARS} 字已过滤：</strong>${result.overlongLines.length}</p>
      <p><strong>重复话术：</strong>${result.duplicateCount}</p>
      <p>保存后，系统会从这些有效话术里随机选择发送。</p>
    </div>
  `
}

function resetDefaults() {
	form.message_template = DEFAULT_MESSAGE
	form.datetime_format = '2006-01-02 15:04'
	form.enabled = true
	form.slot_ids = []
	targetForm.friendEnabled = true
  targetForm.friendMode = 'prefix'
  targetForm.friendPrefix = DEFAULT_FRIEND_PREFIX
  targetForm.groupEnabled = false
  targetForm.groupMode = 'contains'
  targetForm.groupKeywordsText = DEFAULT_GROUP_KEYWORDS
}

function hydrateTargetForm(value: string) {
  targetForm.friendEnabled = false
  targetForm.friendMode = 'prefix'
  targetForm.friendPrefix = DEFAULT_FRIEND_PREFIX
  targetForm.groupEnabled = false
  targetForm.groupMode = 'contains'
  targetForm.groupKeywordsText = DEFAULT_GROUP_KEYWORDS

  try {
    const rules = JSON.parse(value) as TargetRule[]
    if (!Array.isArray(rules) || rules.length === 0) {
      targetForm.friendEnabled = true
      targetForm.groupEnabled = false
      return
    }
    for (const rule of rules) {
      if (rule.type === 'friend') {
        targetForm.friendEnabled = true
        if (rule.mode === 'prefix' || rule.mode === 'contains' || rule.mode === 'exact') {
          targetForm.friendMode = rule.mode
        }
        targetForm.friendPrefix = rule.value || DEFAULT_FRIEND_PREFIX
      }
      if (rule.type === 'group') {
        targetForm.groupEnabled = true
        if (rule.mode === 'contains_all' || rule.mode === 'contains') {
          targetForm.groupMode = rule.mode
        }
        targetForm.groupKeywordsText =
          rule.value || (rule.values || []).join(' ') || DEFAULT_GROUP_KEYWORDS
      }
    }
  } catch {
    targetForm.friendEnabled = true
    targetForm.groupEnabled = false
  }
}

function targetRulesJSON() {
  const rules: TargetRule[] = []
  if (targetForm.friendEnabled && targetForm.friendPrefix.trim()) {
    rules.push({
      id: 'friend_prefix',
      type: 'friend',
      mode: targetForm.friendMode,
      value: targetForm.friendPrefix.trim(),
    })
  }
  const groupKeywords = targetForm.groupKeywordsText
    .split(/\s+/)
    .map((item) => item.trim())
    .filter(Boolean)
  if (targetForm.groupEnabled && groupKeywords.length > 0) {
    rules.push({
      id: 'group_keywords',
      type: 'group',
      mode: targetForm.groupMode,
      values: groupKeywords,
    })
  }
  return JSON.stringify(rules)
}

async function loadSlots() {
  slotsLoading.value = true
  try {
    slots.value = await listScheduleSlots()
    const taskId = props.task?.id || props.task?.task_id
    if (taskId) {
      const boundSlots = props.adminMode
        ? await listAdminTaskSlots(taskId)
        : await listTaskSlots(taskId)
      form.slot_ids = boundSlots.map((item) => item.id)
    }
  } catch (error) {
    ElMessage.error(errorText(error))
  } finally {
    slotsLoading.value = false
  }
}

async function save() {
  let normalizedMessageTemplate: string | null = null
  try {
    normalizedMessageTemplate = await confirmSaveSpeech()
  } catch (error) {
    if (error === 'cancel' || error === 'close') return
    ElMessage.error(errorText(error))
    return
  }
  if (!normalizedMessageTemplate) return
  if (!targetForm.friendEnabled && !targetForm.groupEnabled) {
    ElMessage.warning('请至少选择一种发送目标。')
    return
  }
  if (targetForm.friendEnabled && !targetForm.friendPrefix.trim()) {
    ElMessage.warning('请输入好友备注。')
    return
  }
  if (targetForm.groupEnabled && !targetForm.groupKeywordsText.trim()) {
    ElMessage.warning('请输入群聊名称关键词。')
    return
  }

  saving.value = true
  try {
    const payload = {
      ...form,
      message_template: normalizedMessageTemplate,
      target_rules_json: targetRulesJSON(),
    }
    const taskId = props.task?.id || props.task?.task_id
    if (taskId) {
      if (props.adminMode) {
        await updateAdminSendTask(taskId, payload)
        await updateAdminTaskSlots(taskId, form.slot_ids)
      } else {
        await updateSendTask(taskId, payload)
        await updateTaskSlots(taskId, form.slot_ids)
      }
      await syncTaskEnabled(taskId)
    } else {
      if (props.adminMode) {
        await createAdminSendTask(props.douyinId, payload)
      } else {
        await createSendTask(props.douyinId, payload)
      }
    }
    ElMessage.success('发送任务已保存。')
    emit('saved')
    emit('update:modelValue', false)
  } catch (error) {
    ElMessage.error(errorText(error))
  } finally {
    saving.value = false
  }
}

async function syncTaskEnabled(taskId: string) {
  const currentEnabled = props.task?.enabled ?? props.task?.status !== 'paused'
  if (form.enabled === currentEnabled) return
  if (props.adminMode) {
    if (form.enabled) {
      await resumeAdminSendTask(taskId)
    } else {
      await pauseAdminSendTask(taskId)
    }
    return
  }
  if (form.enabled) {
    await resumeSendTask(taskId)
  } else {
    await pauseSendTask(taskId)
  }
}
</script>

<style scoped>
.dialog-toolbar {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  align-items: center;
  margin-bottom: 14px;
}

:deep(.send-task-drawer .el-drawer__body) {
  padding: 0;
}

.drawer-content {
  display: grid;
  grid-template-rows: minmax(0, 1fr) auto;
  height: 100%;
}

.drawer-form {
  display: grid;
  grid-template-rows: auto auto auto minmax(0, 1fr);
  min-height: 0;
  overflow: hidden;
  padding: 20px 22px;
}

.drawer-footer {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  padding: 12px 22px;
  border-top: 1px solid #e5e7eb;
  background: #ffffff;
}

.strong-form-label :deep(.el-form-item__label) {
  color: #111827;
  font-weight: 700;
}

.muted {
  color: #6b7280;
  font-size: 13px;
}

.task-switch-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
  padding: 9px 12px;
  border: 1px solid #e5e7eb;
  border-radius: 6px;
  color: #111827;
  font-weight: 700;
}

.task-panel-tabs {
  width: 100%;
  margin-bottom: 12px;
}

.task-panel-tabs :deep(.el-segmented-item__label) {
  font-weight: 700;
}

.task-panel-body {
  min-height: 0;
  border: 1px solid #e5e7eb;
  border-radius: 6px;
  background: #fff;
}

.panel-scroll {
  height: 100%;
  min-height: 0;
  overflow-y: auto;
  padding: 18px;
}

.speech-panel {
  display: grid;
  grid-template-columns: minmax(220px, 280px) minmax(0, 1fr);
  gap: 18px;
  align-items: start;
}

.speech-editor {
  min-width: 0;
}

.speech-editor :deep(.el-form-item) {
  margin-bottom: 0;
}

.speech-editor :deep(.el-textarea__inner) {
  min-height: 360px !important;
}

.preview-panel {
  display: flex;
}

.speech-help {
  margin: 0;
  color: #6b7280;
  font-size: 12px;
  line-height: 1.7;
}

.speech-help p {
  margin: 2px 0;
}

.speech-actions {
  display: flex;
  gap: 8px;
  margin-top: 10px;
}

.speech-file-input {
  display: none;
}

:global(.speech-confirm) {
  color: #374151;
  line-height: 1.7;
}

:global(.speech-confirm p) {
  margin: 3px 0;
}

:global(.speech-confirm-warning) {
  margin-top: 8px !important;
  padding: 8px 10px;
  border-radius: 6px;
  background: #fef3c7;
  color: #92400e;
}

:global(:root.dark) .speech-confirm,
:global(:root.dark) .speech-confirm strong {
  color: var(--app-text);
}

:global(:root.dark) .speech-confirm-warning {
  background: rgba(180, 83, 9, 0.22);
  color: #fcd34d;
}
.target-panel {
  display: grid;
  width: 100%;
  gap: 18px;
}

.target-section {
  display: grid;
  gap: 10px;
}

.target-section + .target-section {
  padding-top: 16px;
  border-top: 1px solid #e5e7eb;
}

.preview-box {
  display: grid;
  grid-template-rows: auto auto minmax(0, 1fr);
  gap: 8px;
  width: 100%;
}

.preview-box strong {
  color: #111827;
}

.preview-note {
  margin: 0;
  color: #6b7280;
  font-size: 12px;
}

.preview-box div {
  min-height: 0;
  overflow-y: auto;  padding: 9px 11px;
  border: 1px solid #e5e7eb;
  border-radius: 6px;
  background: #f9fafb;
  color: #374151;
  line-height: 1.6;
  white-space: pre-wrap;
}

.preview-box div p {
  display: flex;
  gap: 8px;
  margin: 0;
}

.preview-box div p + p {
  margin-top: 6px;
}

.preview-box div span {
  flex: 0 0 auto;
  min-width: 50px;
  padding: 1px 6px;
  border-radius: 4px;
  background: #eef2ff;
  color: #374151;
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', monospace;
  font-weight: 700;
  text-align: right;
  white-space: pre;
}

.target-help {
  margin-top: -6px;
  color: #6b7280;
  font-size: 12px;
  line-height: 1.6;
}

.target-help p {
  margin: 2px 0;
}

.target-help strong {
  color: #111827;
}

.slot-picker {
  width: 100%;
  min-height: 80px;
}

.slot-help {
  margin-bottom: 10px;
  color: #6b7280;
  font-size: 12px;
  line-height: 1.6;
}

.slot-help strong {
  color: #111827;
}

.slot-help p {
  margin: 4px 0 0;
}

.slot-header {
  display: grid;
  grid-template-columns: 46px 100px 100px minmax(0, 1fr);
  gap: 10px;
  margin-bottom: 6px;
  padding: 0 0 0 2px;
  color: #374151;
  font-size: 12px;
  font-weight: 700;
}

.slot-option {
  display: grid;
  grid-template-columns: 46px minmax(0, 1fr);
  width: 100%;
  min-height: 34px;
  margin-right: 0;
  align-items: center;
}

.slot-option :deep(.el-checkbox__input) {
  justify-self: start;
}

.slot-option :deep(.el-checkbox__label) {
  flex: 1;
  width: 100%;
  min-width: 0;
}

.slot-row-content {
  display: grid;
  grid-template-columns: 100px 100px minmax(0, 1fr);
  gap: 10px;
  align-items: center;
  width: 100%;
}

.slot-time {
  display: inline-block;
  color: #374151;
  font-weight: 700;
}

.slot-type {
  color: #6b7280;
  font-size: 13px;
}

.slot-name {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

:global(:root.dark) .drawer-content,
:global(:root.dark) .drawer-form {
  background: var(--app-surface);
  color: var(--app-text-body);
}

:global(:root.dark) .drawer-footer {
  border-top-color: var(--app-border);
  background: var(--app-surface);
}

:global(:root.dark) .task-switch-row,
:global(:root.dark) .task-panel-body {
  border-color: var(--app-border);
  background: var(--app-surface);
  color: var(--app-text-body);
}

:global(:root.dark) .panel-scroll {
  background: var(--app-surface);
  color: var(--app-text-body);
}

:global(:root.dark) .speech-help,
:global(:root.dark) .target-help,
:global(:root.dark) .slot-help,
:global(:root.dark) .preview-note,
:global(:root.dark) .slot-type {
  color: var(--app-text-muted);
}

:global(:root.dark) .speech-help strong,
:global(:root.dark) .target-help strong,
:global(:root.dark) .slot-help strong,
:global(:root.dark) .preview-box strong,
:global(:root.dark) .slot-header,
:global(:root.dark) .slot-time,
:global(:root.dark) .slot-name {
  color: var(--app-text);
}

:global(:root.dark) .target-section + .target-section {
  border-top-color: var(--app-border);
}

:global(:root.dark) .preview-box div {
  border-color: var(--app-border);
  background: var(--app-bg);
  color: var(--app-text-body);
}

:global(:root.dark) .preview-box div span {
  background: var(--app-surface-soft);
  color: var(--app-text);
}

:global(:root.dark) .slot-picker {
  color: var(--app-text-body);
}

@media (max-width: 640px) {
  .drawer-form {
    overflow-y: auto;
    padding: 16px;
  }

  .panel-scroll {
    padding: 12px;
  }

  .speech-panel {
    grid-template-columns: 1fr;
  }

  .speech-editor :deep(.el-textarea__inner) {
    min-height: 300px !important;
  }

  .dialog-toolbar {
    align-items: flex-start;
    flex-direction: column;
  }
}
</style>










