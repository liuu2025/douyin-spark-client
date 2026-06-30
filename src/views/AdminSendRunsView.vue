<template>
  <section>
    <div class="page-header">
      <div>
        <h1 class="page-title">全局发送记录</h1>
        <p class="page-subtitle">查看全站发送运行记录，按用户、抖音号、任务、轮次、状态和错误码定位问题。</p>
      </div>
      <el-button :loading="refreshing" @click="refreshRuns">刷新</el-button>
    </div>

    <div class="status-grid send-run-metrics">
      <div class="metric">
        <div class="metric-label">运行记录总数</div>
        <div class="metric-value">{{ totalText }}</div>
      </div>
      <div class="metric">
        <div class="metric-label">本页失败</div>
        <div class="metric-value">{{ currentFailedCount }}</div>
      </div>
      <div class="metric">
        <div class="metric-label">本页部分成功</div>
        <div class="metric-value">{{ currentPartialCount }}</div>
      </div>
    </div>

    <div class="content-panel">
      <div class="panel-body">
        <SendRunRecordsPanel
          ref="runsPanel"
          :loader="loadRuns"
          :filter-options="filterOptions"
          show-scope-filters
          show-global-columns
          height="calc(100vh - 390px)"
        />
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import {
  listAdminAccountSendTasks,
  listAdminDouyinAccounts,
  listAdminSendRuns,
} from '@/api/adminDouyin'
import { listAdminScheduleSlots } from '@/api/schedule'
import { listAdminUsers } from '@/api/adminUsers'
import type { SendRunList, SendRunQuery } from '@/api/sendTasks'
import SendRunRecordsPanel from '@/components/SendRunRecordsPanel.vue'
import type { SendRun } from '@/api/types'

interface RunFilterOption {
  label: string
  value: string
  owner_public_uid?: string
  douyin_id?: string
}

const runsPanel = ref<InstanceType<typeof SendRunRecordsPanel> | null>(null)
const latestList = ref<SendRunList | null>(null)
const refreshing = ref(false)
const filterOptions = reactive({
  owner_public_uid: [] as RunFilterOption[],
  douyin_id: [] as RunFilterOption[],
  task_id: [] as RunFilterOption[],
  slot_id: [] as RunFilterOption[],
  error_code: [] as RunFilterOption[],
})

const totalText = computed(() => {
  const total = latestList.value?.total
  return typeof total === 'number' ? total : '-'
})
const currentFailedCount = computed(
  () => latestList.value?.items.filter((run) => run.status === 'failed').length || 0,
)
const currentPartialCount = computed(
  () => latestList.value?.items.filter((run) => run.status === 'partial_success').length || 0,
)

async function loadRuns(query: SendRunQuery) {
  const data = await listAdminSendRuns(query)
  latestList.value = data
  addRunOptions(data.items)
  return data
}

async function refreshRuns() {
  refreshing.value = true
  try {
    await runsPanel.value?.loadRuns()
  } finally {
    refreshing.value = false
  }
}

async function loadFilterOptions() {
  const [users, accounts, slots, sampleRuns] = await Promise.all([
    listAdminUsers({ page: 1, page_size: 200 }),
    listAdminDouyinAccounts({ page: 1, page_size: 200 }),
    listAdminScheduleSlots(),
    listAdminSendRuns({ page: 1, page_size: 200 }),
  ])

  filterOptions.owner_public_uid = users.items.map((user) => ({
    value: user.public_uid,
    label: user.nickname ? `${user.public_uid} / ${user.nickname}` : user.public_uid,
  }))
  filterOptions.douyin_id = accounts.items.map((account) => ({
    value: account.douyin_id,
    owner_public_uid: account.owner_public_uid,
    label: account.profile_nickname
      ? `${account.douyin_id} / ${account.profile_nickname}`
      : account.douyin_id,
  }))
  filterOptions.slot_id = slots.map((slot) => ({
    value: slot.id,
    label: slot.name ? `${slot.name} / ${slot.id}` : slot.id,
  }))
  const taskLists = await Promise.all(
    accounts.items.map(async (account) => {
      try {
        const tasks = await listAdminAccountSendTasks(account.douyin_id)
        return tasks.map((task) => {
          const taskID = task.id || task.task_id || ''
          return {
            value: taskID,
            label: taskOptionLabel(taskID, account.douyin_id, account.profile_nickname),
            douyin_id: account.douyin_id,
          }
        })
      } catch {
        return [] as RunFilterOption[]
      }
    }),
  )
  filterOptions.task_id = mergeOptions(taskLists.flat())
  latestList.value = sampleRuns
  addRunOptions(sampleRuns.items)
}

function addRunOptions(runs: SendRun[]) {
  filterOptions.task_id = mergeOptions([
    ...filterOptions.task_id,
    ...runs.map((run) => optionFromRunTask(run)),
  ])
  filterOptions.slot_id = mergeOptions([
    ...filterOptions.slot_id,
    ...runs.map((run) => optionFromValue(run.slot_id)),
  ])
  filterOptions.error_code = mergeOptions([
    ...filterOptions.error_code,
    ...runs.map((run) => optionFromValue(run.last_error_code)),
  ])
}

function optionFromValue(value?: string): RunFilterOption {
  const normalized = String(value || '').trim()
  return normalized ? { value: normalized, label: normalized } : { value: '', label: '' }
}

function optionFromRunTask(run: SendRun): RunFilterOption {
  const taskID = String(run.task_id || '').trim()
  if (!taskID) return { value: '', label: '' }
  const douyinID = String(run.douyin_id || '').trim()
  return {
    value: taskID,
    label: taskOptionLabel(taskID, douyinID, run.profile_nickname),
    douyin_id: douyinID || undefined,
  }
}

function taskOptionLabel(taskID: string, douyinID?: string, profileNickname?: string) {
  return [taskID, douyinID, profileNickname]
    .map((part) => String(part || '').trim())
    .filter(Boolean)
    .join(' / ')
}

function mergeOptions(options: RunFilterOption[]) {
  const seen = new Set<string>()
  const merged: RunFilterOption[] = []
  for (const option of options) {
    const value = String(option.value || '').trim()
    if (!value || seen.has(value)) continue
    const ownerPublicUID = String(option.owner_public_uid || '').trim()
    const douyinID = String(option.douyin_id || '').trim()
    seen.add(value)
    merged.push({
      ...option,
      value,
      label: option.label || value,
      owner_public_uid: ownerPublicUID || undefined,
      douyin_id: douyinID || undefined,
    })
  }
  return merged
}

onMounted(() => {
  void loadFilterOptions()
})
</script>

<style scoped>
.send-run-metrics {
  grid-template-columns: repeat(3, minmax(0, 1fr));
}

@media (max-width: 900px) {
  .send-run-metrics {
    grid-template-columns: 1fr;
  }
}
</style>
