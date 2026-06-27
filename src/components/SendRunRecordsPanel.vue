<template>
  <div class="run-panel">
    <div class="run-toolbar">
      <el-segmented v-model="mode" :options="modeOptions" size="small" @change="changeMode" />
      <div class="run-actions">
        <el-select
          v-if="filterEnabled('owner_public_uid')"
          v-model="filters.owner_public_uid"
          class="run-filter-select"
          clearable
          filterable
          size="small"
          placeholder="归属账号ID"
          @change="handleOwnerChange"
        >
          <el-option
            v-for="option in mergedOptions.owner_public_uid"
            :key="option.value"
            :label="option.label"
            :value="option.value"
          />
        </el-select>
        <el-select
          v-if="filterEnabled('douyin_id')"
          v-model="filters.douyin_id"
          class="run-filter-select"
          clearable
          filterable
          size="small"
          placeholder="抖音号"
          @change="reloadFirstPage"
        >
          <el-option
            v-for="option in mergedOptions.douyin_id"
            :key="option.value"
            :label="option.label"
            :value="option.value"
          />
        </el-select>
        <el-select
          v-if="filterEnabled('task_id')"
          v-model="filters.task_id"
          class="run-filter-select wide-filter"
          clearable
          filterable
          size="small"
          placeholder="任务ID"
          @change="reloadFirstPage"
        >
          <el-option
            v-for="option in mergedOptions.task_id"
            :key="option.value"
            :label="option.label"
            :value="option.value"
          />
        </el-select>
        <el-select
          v-if="filterEnabled('slot_id')"
          v-model="filters.slot_id"
          class="run-filter-select wide-filter"
          clearable
          filterable
          size="small"
          placeholder="轮次ID"
          @change="reloadFirstPage"
        >
          <el-option
            v-for="option in mergedOptions.slot_id"
            :key="option.value"
            :label="option.label"
            :value="option.value"
          />
        </el-select>
        <el-select
          v-if="filterEnabled('error_code')"
          v-model="filters.error_code"
          class="run-filter-select"
          clearable
          filterable
          size="small"
          placeholder="错误码"
          @change="reloadFirstPage"
        >
          <el-option
            v-for="option in mergedOptions.error_code"
            :key="option.value"
            :label="option.label"
            :value="option.value"
          />
        </el-select>
        <el-select
          v-model="status"
          class="status-filter"
          placeholder="全部状态"
          clearable
          filterable
          size="small"
          @change="reloadFirstPage"
        >
          <el-option
            v-for="option in statusOptions"
            :key="option.value"
            :label="option.label"
            :value="option.value"
          />
        </el-select>
        <el-date-picker
          v-if="mode === 'month'"
          v-model="monthValue"
          type="month"
          value-format="YYYY-MM"
          placeholder="选择月份"
          size="small"
          @change="reloadFirstPage"
        />
        <el-date-picker
          v-if="mode === 'date'"
          v-model="dateValue"
          type="date"
          value-format="YYYY-MM-DD"
          placeholder="选择日期"
          size="small"
          @change="reloadFirstPage"
        />
        <el-button size="small" @click="loadRuns">刷新</el-button>
        <el-button v-if="visibleFilterFields.length > 0" size="small" @click="resetFilters">
          重置
        </el-button>
      </div>
    </div>

    <el-table
      class="run-table"
      :data="runs"
      :loading="loading"
      empty-text="暂无运行记录"
      :height="height"
    >
      <el-table-column
        v-if="showGlobalColumns"
        prop="douyin_id"
        label="抖音号"
        min-width="140"
        fixed="left"
        show-overflow-tooltip
      />
      <el-table-column
        v-if="showGlobalColumns"
        prop="profile_nickname"
        label="抖音昵称"
        min-width="140"
        show-overflow-tooltip
      >
        <template #default="{ row }">{{ row.profile_nickname || '-' }}</template>
      </el-table-column>
      <el-table-column
        v-if="showGlobalColumns"
        label="归属账号"
        min-width="180"
      >
        <template #default="{ row }">
          <div class="run-owner-cell">
            <strong>{{ ownerPublicUID(row) || '-' }}</strong>
            <span v-if="ownerNickname(row)">{{ ownerNickname(row) }}</span>
          </div>
        </template>
      </el-table-column>
      <el-table-column
        v-if="showSlotColumn"
        prop="slot_id"
        label="轮次ID"
        width="150"
        show-overflow-tooltip
      />
      <el-table-column label="状态" width="112">
        <template #default="{ row }">
          <el-tag :type="runStatusTag(row.status)">{{ runStatusText(row.status) }}</el-tag>
        </template>
      </el-table-column>
      <el-table-column label="错误码" width="150" show-overflow-tooltip>
        <template #default="{ row }">
          <el-tooltip
            v-if="row.last_error_code"
            :content="row.last_error_code"
            placement="top"
          >
            <span>{{ errorCodeText(row.last_error_code) }}</span>
          </el-tooltip>
          <span v-else>-</span>
        </template>
      </el-table-column>
      <el-table-column prop="last_error_message" label="最近错误" min-width="300" show-overflow-tooltip />
      <el-table-column label="周期开始" min-width="170">
        <template #default="{ row }">{{ formatBeijingTime(row.cycle_start_at) }}</template>
      </el-table-column>
      <el-table-column prop="id" label="运行ID" width="150" show-overflow-tooltip />
      <el-table-column prop="task_id" label="任务ID" width="150" show-overflow-tooltip />
      <el-table-column prop="cycle_id" label="周期ID" width="160" show-overflow-tooltip />
      <el-table-column label="开始时间" width="150">
        <template #default="{ row }">{{ formatBeijingTime(row.started_at) }}</template>
      </el-table-column>
      <el-table-column label="结束时间" width="150">
        <template #default="{ row }">{{ formatBeijingTime(row.finished_at) }}</template>
      </el-table-column>
    </el-table>

    <div v-if="mode !== 'latest'" class="run-pagination">
      <el-pagination
        v-model:current-page="pager.page"
        v-model:page-size="pager.pageSize"
        :total="pager.total"
        :page-sizes="[10, 20, 50, 100]"
        small
        layout="total, sizes, prev, pager, next"
        @size-change="reloadFirstPage"
        @current-change="loadRuns"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref, watch } from 'vue'
import { ElMessage } from 'element-plus'
import type { SendRun } from '@/api/types'
import type { SendRunList, SendRunQuery } from '@/api/sendTasks'
import { errorText } from '@/api/http'
import { runStatusText } from '@/utils/status'
import { formatBeijingTime } from '@/utils/time'

type RunMode = 'latest' | 'all' | 'month' | 'date'
type RunFilterField = 'owner_public_uid' | 'douyin_id' | 'task_id' | 'slot_id' | 'error_code'

interface RunFilterOption {
  label: string
  value: string
  owner_public_uid?: string
}

const props = withDefaults(
  defineProps<{
    loader: (query: SendRunQuery) => Promise<SendRunList>
    height?: string | number
    scopeKey?: string | number
    showScopeFilters?: boolean
    showGlobalColumns?: boolean
    showSlotColumn?: boolean
    filterFields?: RunFilterField[]
    filterOptions?: Partial<Record<RunFilterField, RunFilterOption[]>>
  }>(),
  {
    height: 420,
    showScopeFilters: false,
    showGlobalColumns: false,
    showSlotColumn: false,
  },
)

const modeOptions = [
  { label: '最新记录', value: 'latest' },
  { label: '全部记录', value: 'all' },
  { label: '按月份', value: 'month' },
  { label: '按日期', value: 'date' },
]
const defaultFilterFields: RunFilterField[] = [
  'owner_public_uid',
  'douyin_id',
  'task_id',
  'slot_id',
  'error_code',
]
const statusOptions = [
  { label: '运行中', value: 'running' },
  { label: '发送中', value: 'sending' },
  { label: '已发送', value: 'sent' },
  { label: '部分成功', value: 'partial_success' },
  { label: '已跳过', value: 'skipped' },
  { label: '失败', value: 'failed' },
]

const runs = ref<SendRun[]>([])
const loading = ref(false)
const mode = ref<RunMode>('latest')
const status = ref('')
const monthValue = ref(currentMonth())
const dateValue = ref(currentDate())
const filters = reactive({
  owner_public_uid: '',
  douyin_id: '',
  task_id: '',
  slot_id: '',
  error_code: '',
})
const pager = reactive({
  page: 1,
  pageSize: 20,
  total: 0,
})
let requestSeq = 0

const visibleFilterFields = computed<RunFilterField[]>(() => {
  if (!props.showScopeFilters) return []
  return props.filterFields?.length ? props.filterFields : defaultFilterFields
})

const showSlotColumn = computed(() => props.showGlobalColumns || props.showSlotColumn)

const mergedOptions = computed<Record<RunFilterField, RunFilterOption[]>>(() => ({
  owner_public_uid: mergeOptions(props.filterOptions?.owner_public_uid || []),
  douyin_id: filterDouyinOptions(mergeOptions([
    ...(props.filterOptions?.douyin_id || []),
    ...runs.value.map((run) => optionFromValue(run.douyin_id)),
  ])),
  task_id: mergeOptions([
    ...(props.filterOptions?.task_id || []),
    ...runs.value.map((run) => optionFromValue(run.task_id)),
  ]),
  slot_id: mergeOptions([
    ...(props.filterOptions?.slot_id || []),
    ...runs.value.map((run) => optionFromValue(run.slot_id)),
  ]),
  error_code: mergeOptions([
    ...(props.filterOptions?.error_code || []).map((option) => errorOption(option.value)),
    ...runs.value.map((run) => errorOption(run.last_error_code)),
  ]),
}))

watch(
  () => props.loader,
  () => reloadFirstPage(),
)

watch(
  () => props.scopeKey,
  () => {
    resetPanel()
    void loadRuns()
  },
)

function changeMode() {
  reloadFirstPage()
}

function resetPanel() {
  requestSeq += 1
  runs.value = []
  loading.value = false
  mode.value = 'latest'
  status.value = ''
  resetFilterValues()
  monthValue.value = currentMonth()
  dateValue.value = currentDate()
  pager.page = 1
  pager.pageSize = 20
  pager.total = 0
}

function resetFilterValues() {
  filters.owner_public_uid = ''
  filters.douyin_id = ''
  filters.task_id = ''
  filters.slot_id = ''
  filters.error_code = ''
}

function filterEnabled(field: RunFilterField) {
  return visibleFilterFields.value.includes(field)
}

async function handleOwnerChange() {
  if (
    filters.douyin_id &&
    !mergedOptions.value.douyin_id.some((option) => option.value === filters.douyin_id)
  ) {
    filters.douyin_id = ''
  }
  await reloadFirstPage()
}

async function resetFilters() {
  resetFilterValues()
  status.value = ''
  await reloadFirstPage()
}

function filterDouyinOptions(options: RunFilterOption[]) {
  if (!filters.owner_public_uid) return options
  return options.filter((option) => {
    if (!option.owner_public_uid) return false
    return option.owner_public_uid === filters.owner_public_uid
  })
}

function ownerPublicUID(run: SendRun) {
  const directUID = String(run.owner_public_uid || '').trim()
  if (directUID) return directUID
  const douyinID = String(run.douyin_id || '').trim()
  if (!douyinID) return ''
  return (
    mergeOptions(props.filterOptions?.douyin_id || []).find((option) => option.value === douyinID)
      ?.owner_public_uid || ''
  )
}

function ownerNickname(run: SendRun) {
  const publicUID = ownerPublicUID(run)
  if (!publicUID) return ''
  const option = mergeOptions(props.filterOptions?.owner_public_uid || []).find(
    (item) => item.value === publicUID,
  )
  if (!option) return ''
  const parts = option.label
    .split('/')
    .map((part) => part.trim())
    .filter(Boolean)
  return parts.length > 1 ? parts.slice(1).join(' / ') : ''
}

async function reloadFirstPage() {
  pager.page = 1
  await loadRuns()
}

async function loadRuns() {
  const seq = ++requestSeq
  loading.value = true
  try {
    const data = await props.loader(buildQuery())
    if (seq !== requestSeq) return
    runs.value = data.items
    pager.total = data.total
    pager.page = data.page
    pager.pageSize = data.page_size
  } catch (error) {
    if (seq !== requestSeq) return
    ElMessage.error(errorText(error))
  } finally {
    if (seq === requestSeq) {
      loading.value = false
    }
  }
}

function buildQuery(): SendRunQuery {
  const query: SendRunQuery = {
    page: pager.page,
    page_size: pager.pageSize,
  }
  if (mode.value === 'latest') {
    query.page = 1
    query.page_size = Math.min(pager.pageSize, 50)
  }
  if (status.value) query.status = status.value
  if (visibleFilterFields.value.length > 0) {
    if (filterEnabled('owner_public_uid') && filters.owner_public_uid) {
      query.owner_public_uid = filters.owner_public_uid
    }
    if (filterEnabled('douyin_id') && filters.douyin_id) query.douyin_id = filters.douyin_id
    if (filterEnabled('task_id') && filters.task_id) query.task_id = filters.task_id
    if (filterEnabled('slot_id') && filters.slot_id) query.slot_id = filters.slot_id
    if (filterEnabled('error_code') && filters.error_code) query.error_code = filters.error_code
  }
  const range = currentRange()
  if (range) {
    query.date_from = range.from
    query.date_to = range.to
  }
  return query
}

function currentRange() {
  if (mode.value === 'month' && monthValue.value) {
    const [year, month] = monthValue.value.split('-').map(Number)
    const from = new Date(year, month - 1, 1)
    const to = new Date(year, month, 1)
    return { from: toLocalRFC3339(from), to: toLocalRFC3339(to) }
  }
  if (mode.value === 'date' && dateValue.value) {
    const [year, month, day] = dateValue.value.split('-').map(Number)
    const from = new Date(year, month - 1, day)
    const to = new Date(year, month - 1, day + 1)
    return { from: toLocalRFC3339(from), to: toLocalRFC3339(to) }
  }
  return null
}

function currentDate() {
  const now = new Date()
  const year = now.getFullYear()
  const month = String(now.getMonth() + 1).padStart(2, '0')
  const day = String(now.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function currentMonth() {
  return currentDate().slice(0, 7)
}

function toLocalRFC3339(date: Date) {
  const offsetMinutes = -date.getTimezoneOffset()
  const sign = offsetMinutes >= 0 ? '+' : '-'
  const abs = Math.abs(offsetMinutes)
  const offsetHour = String(Math.floor(abs / 60)).padStart(2, '0')
  const offsetMinute = String(abs % 60).padStart(2, '0')
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  const hour = String(date.getHours()).padStart(2, '0')
  const minute = String(date.getMinutes()).padStart(2, '0')
  const second = String(date.getSeconds()).padStart(2, '0')
  return `${year}-${month}-${day}T${hour}:${minute}:${second}${sign}${offsetHour}:${offsetMinute}`
}

function runStatusTag(status?: string) {
  if (status === 'sent') return 'success'
  if (status === 'partial_success') return 'warning'
  if (status === 'failed') return 'danger'
  if (status === 'skipped') return 'info'
  return 'primary'
}

function optionFromValue(value?: string): RunFilterOption {
  const normalized = String(value || '').trim()
  return normalized ? { label: normalized, value: normalized } : { label: '', value: '' }
}

function errorOption(value?: string): RunFilterOption {
  const normalized = String(value || '').trim()
  if (!normalized) return { label: '', value: '' }
  return { label: `${errorCodeText(normalized)} / ${normalized}`, value: normalized }
}

function errorCodeText(code?: string) {
  const normalized = String(code || '').trim()
  const map: Record<string, string> = {
    account_status_check_failed: '账号状态检查失败',
    browser_startup_failure: '浏览器启动失败',
    captcha_required: '需要安全验证',
    check_failed: '登录态检查失败',
    create_task_run_failed: '创建运行记录失败',
    group_not_found: '群聊未找到',
    group_title_mismatch: '群聊标题不匹配',
    identity_mismatch: '登录账号不匹配',
    input_not_found: '输入框未找到',
    invalid_configuration: '发送配置无效',
    invalid_storage_state: '登录态文件无效',
    login_state_not_ok: '登录状态不可用',
    logger_error: '运行日志初始化失败',
    message_entry_not_found: '私信入口未找到',
    missing_storage_state: '登录文件缺失',
    navigation_failed: '打开抖音页面失败',
    not_logged_in: '登录态已失效',
    partial_success: '部分成功',
    run_browser_required: '需要确认真实运行',
    runner_error: '发送运行器执行失败',
    send_failed: '发送失败',
    sms_code_expired: '短信验证码已过期',
    sms_code_invalid: '短信验证码错误',
    sms_rate_limited: '短信请求过于频繁',
    sms_retry_later: '短信暂时无法发送',
    sms_verification_failed: '短信验证失败',
    storage_state_not_found: '登录文件缺失',
    storage_state_replace_failed: '保存登录态失败',
    target_ambiguous: '目标匹配不唯一',
    target_not_found: '发送目标未找到',
    target_user_disabled: '目标用户已禁用',
    task_not_found: '任务不存在',
    unknown_page_state: '页面状态无法识别',
  }
  return normalized ? map[normalized] || normalized : '-'
}

function mergeOptions(options: RunFilterOption[]) {
  const seen = new Set<string>()
  const merged: RunFilterOption[] = []
  for (const option of options) {
    const value = String(option.value || '').trim()
    if (!value || seen.has(value)) continue
    const ownerPublicUID = String(option.owner_public_uid || '').trim()
    seen.add(value)
    merged.push({
      ...option,
      label: option.label || value,
      value,
      owner_public_uid: ownerPublicUID || undefined,
    })
  }
  return merged
}

onMounted(loadRuns)

defineExpose({ loadRuns, reloadFirstPage })
</script>

<style scoped>
.run-panel {
  display: grid;
  gap: 10px;
}

.run-toolbar,
.run-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  align-items: center;
}

.run-toolbar {
  justify-content: space-between;
  min-height: 32px;
}

.run-actions {
  flex: 1 1 760px;
  justify-content: flex-end;
}

.run-filter-select,
.status-filter {
  width: 138px;
}

.wide-filter {
  width: 180px;
}

.run-pagination {
  display: flex;
  justify-content: flex-end;
  min-height: 28px;
  margin-top: -2px;
}

.run-table :deep(.cell) {
  white-space: nowrap;
}

.run-owner-cell {
  display: grid;
  gap: 2px;
  min-width: 0;
}

.run-owner-cell strong,
.run-owner-cell span {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.run-owner-cell span {
  color: var(--app-text-muted);
  font-size: 12px;
}

@media (max-width: 640px) {
  .run-toolbar,
  .run-actions {
    align-items: stretch;
    flex-direction: column;
  }

  .run-filter-select,
  .status-filter,
  .wide-filter {
    width: 100%;
  }
}
</style>
