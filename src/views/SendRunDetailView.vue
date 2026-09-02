<template>
  <section>
    <div class="page-header">
      <div class="run-detail-heading">
        <div class="run-detail-title-line">
          <h1 class="page-title">运行记录详情</h1>
          <span class="run-detail-title-separator" aria-hidden="true">·</span>
          <span class="run-detail-account">
            抖音号 <strong>{{ run?.douyin_id || douyinId || '-' }}</strong>
          </span>
        </div>
        <p class="page-subtitle">周期开始：{{ cycleStartText }}</p>
        <p class="run-detail-id">
          <span class="run-detail-meta-label">运行ID：</span>
          <span class="run-detail-id-value">{{ run?.id || runId || '-' }}</span>
        </p>
      </div>
      <el-button @click="goBack">返回运行记录</el-button>
    </div>

    <div class="content-panel">
      <div class="panel-body record-detail-body">
        <div class="detail-toolbar">
          <div class="detail-tabs-control">
            <el-segmented v-model="activeTab" :options="detailTabs" />
          </div>
          <el-button
            class="detail-refresh-button"
            :icon="RefreshCw"
            :loading="refreshing"
            @click="refreshData"
          >
            刷新
          </el-button>
        </div>

        <el-skeleton v-if="loadingRun && !run" :rows="5" animated />
        <el-empty v-else-if="!run" description="未找到这条运行记录" />
        <template v-else>
          <el-descriptions v-if="activeTab === 'run'" :column="1" border class="run-descriptions">
            <el-descriptions-item label="周期开始">{{ formatBeijingTime(run.cycle_start_at) }}</el-descriptions-item>
            <el-descriptions-item label="轮次ID">{{ run.slot_id || '-' }}</el-descriptions-item>
            <el-descriptions-item label="运行ID">{{ run.id || '-' }}</el-descriptions-item>
            <el-descriptions-item label="任务ID">{{ run.task_id || '-' }}</el-descriptions-item>
            <el-descriptions-item label="周期ID">{{ run.cycle_id || '-' }}</el-descriptions-item>
            <el-descriptions-item label="开始时间">{{ formatBeijingTime(run.started_at) }}</el-descriptions-item>
            <el-descriptions-item label="结束时间">{{ formatBeijingTime(run.finished_at) }}</el-descriptions-item>
            <el-descriptions-item label="错误码">{{ run.last_error_code || '-' }}</el-descriptions-item>
            <el-descriptions-item label="最近错误">{{ run.last_error_message || '-' }}</el-descriptions-item>
          </el-descriptions>

          <div v-if="activeTab === 'friends' && scanSummaryVisible" class="following-scan-summary" aria-live="polite">
            <div class="following-scan-summary__line">
              {{ scanStatusLabel }}（已扫条数/关注总数）：{{ scannedCountText }}/{{ followingTotalText }}
            </div>
            <div class="following-scan-summary__line">
              扫描覆盖率：{{ coverageText }}
            </div>
            <div class="following-scan-summary__line">
              当前已匹配好友：{{ friends.length }}
            </div>
          </div>
          <div
            v-else-if="activeTab === 'friends' && scanSummaryUnavailable"
            class="following-scan-summary following-scan-summary--unavailable"
            aria-live="polite"
          >
            <div class="following-scan-summary__line">本次运行没有可用的好友扫描统计</div>
            <div class="following-scan-summary__line">当前已匹配好友：{{ friends.length }}</div>
          </div>

          <el-table
            v-if="activeTab === 'friends'"
            class="target-table desktop-only"
            :data="friends"
            :loading="loadingCandidates"
            :height="targetTableHeight"
            empty-text="暂无本次发送好友"
          >
            <el-table-column type="index" label="序号" width="82" />
            <el-table-column prop="display_name" label="好友备注/昵称" min-width="180" show-overflow-tooltip />
            <el-table-column label="好友抖音号" min-width="180" show-overflow-tooltip>
              <template #default="{ row }">{{ friendDouyinText(row) }}</template>
            </el-table-column>
            <el-table-column label="发送状态" min-width="130">
              <template #default="{ row }">
                <el-tag :type="statusTag(row.send_status)">{{ statusText(row.send_status) }}</el-tag>
              </template>
            </el-table-column>
            <el-table-column label="失败原因" min-width="260" show-overflow-tooltip>
              <template #default="{ row }">{{ failureReason(row) }}</template>
            </el-table-column>
          </el-table>

          <el-table
            v-if="activeTab === 'groups'"
            class="target-table desktop-only"
            :data="groups"
            :loading="loadingCandidates"
            :height="targetTableHeight"
            empty-text="暂无本次发送群聊"
          >
            <el-table-column type="index" label="序号" width="82" />
            <el-table-column prop="group_name" label="群名" min-width="220" show-overflow-tooltip />
            <el-table-column label="群人数" min-width="130">
              <template #default="{ row }">{{ groupMemberCountText(row) }}</template>
            </el-table-column>
            <el-table-column label="发送状态" min-width="130">
              <template #default="{ row }">
                <el-tag :type="statusTag(row.send_status)">{{ statusText(row.send_status) }}</el-tag>
              </template>
            </el-table-column>
            <el-table-column label="失败原因" min-width="300" show-overflow-tooltip>
              <template #default="{ row }">{{ failureReason(row) }}</template>
            </el-table-column>
          </el-table>

          <div
            v-if="activeTab === 'friends' || activeTab === 'groups'"
            v-loading="loadingCandidates"
            class="mobile-only mobile-card-list target-mobile-list"
          >
            <article
              v-for="candidate in activeCandidates"
              :key="candidate.id || candidateKey(candidate)"
              class="mobile-data-card"
            >
              <div class="mobile-data-card__header">
                <strong>{{ candidateTitle(candidate) }}</strong>
                <el-tag :type="statusTag(candidate.send_status)">
                  {{ statusText(candidate.send_status) }}
                </el-tag>
              </div>
              <div class="mobile-data-card__body">
                <div v-if="activeTab === 'friends'" class="mobile-data-row">
                  <span>好友抖音号</span>
                  <span>{{ friendDouyinText(candidate) }}</span>
                </div>
                <div v-else class="mobile-data-row">
                  <span>群人数</span>
                  <span>{{ groupMemberCountText(candidate) }}</span>
                </div>
                <div class="mobile-data-row">
                  <span>失败原因</span>
                  <span>{{ failureReason(candidate) }}</span>
                </div>
              </div>
            </article>
            <div v-if="!loadingCandidates && activeCandidates.length === 0" class="mobile-empty">
              {{ activeTab === 'friends' ? '暂无本次发送好友' : '暂无本次发送群聊' }}
            </div>
          </div>
        </template>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { RefreshCw } from 'lucide-vue-next'
import { getAdminSendRunCandidates, listAdminAccountRuns, listAdminSendRuns } from '@/api/adminDouyin'
import { errorText } from '@/api/http'
import {
  getSendRunCandidates,
  listAccountRuns,
  type SendRunCandidates,
  type SendRunCandidate,
  type SendRunQuery,
} from '@/api/sendTasks'
import type { SendRun } from '@/api/types'
import { useAuthStore } from '@/stores/auth'
import { runStatusText } from '@/utils/status'
import { formatBeijingTime } from '@/utils/time'

type DetailTab = 'run' | 'friends' | 'groups'

const route = useRoute()
const router = useRouter()
const auth = useAuthStore()
const run = ref<SendRun | null>(null)
const friends = ref<SendRunCandidate[]>([])
const groups = ref<SendRunCandidate[]>([])
const scanSummary = ref<Pick<SendRunCandidates, 'following_total' | 'scanned_count' | 'coverage_percent' | 'scan_status' | 'scan_stop_reason'>>({})
const loadingRun = ref(false)
const loadingCandidates = ref(false)
const refreshing = ref(false)
const detailTabs = [
  { label: '运行详情', value: 'run' },
  { label: '本次发送好友列表', value: 'friends' },
  { label: '本次发送群聊列表', value: 'groups' },
]

const runId = computed(() => String(route.params.runId || ''))
const douyinId = computed(() => String(route.params.douyinId || route.query.douyinId || ''))
const cycleStartText = computed(() => formatBeijingTime(run.value?.cycle_start_at || String(route.query.cycleStart || '')))
const isAdminGlobal = computed(
  () => route.name === 'adminGlobalRunDetail' || route.name === 'adminGlobalRunTargets',
)
const isAdminAccount = computed(
  () => route.name === 'adminAccountRunDetail' || route.name === 'adminAccountRunTargets',
)
const useAdminApi = computed(
  () => auth.isAdmin || isAdminGlobal.value || isAdminAccount.value,
)
const activeTab = ref<DetailTab>(initialTab())
const compactTableLayout = ref(false)
const activeCandidates = computed(() => activeTab.value === 'friends' ? friends.value : groups.value)
const targetTableHeight = computed(() =>
  compactTableLayout.value
    ? 'clamp(250px, calc(100dvh - 170px), 460px)'
    : 'calc(100dvh - 280px)',
)
let compactTableMedia: MediaQueryList | null = null
let scanPollTimer: number | null = null

function initialTab(): DetailTab {
  const tab = String(route.query.tab || '')
  if (tab === 'friends' || tab === 'groups') return tab
  if (route.name === 'sendRunTargets' || route.name === 'adminGlobalRunTargets' || route.name === 'adminAccountRunTargets') {
    return 'friends'
  }
  return 'run'
}

async function loadRun() {
  const cachedRun = sessionStorage.getItem(`douyin-spark-run:${runId.value}`)
  if (cachedRun) {
    try {
      const parsed = JSON.parse(cachedRun) as SendRun
      if (String(parsed.id) === runId.value) run.value = parsed
    } catch {
      sessionStorage.removeItem(`douyin-spark-run:${runId.value}`)
    }
  }

  loadingRun.value = true
  try {
    const query: SendRunQuery = { page: 1, page_size: 100, limit: 100 }
    if (route.query.douyinId) query.douyin_id = String(route.query.douyinId)
    if (route.query.taskId) query.task_id = String(route.query.taskId)
    const data = isAdminGlobal.value
      ? await listAdminSendRuns(query)
      : useAdminApi.value
        ? await listAdminAccountRuns(douyinId.value, query)
        : await listAccountRuns(douyinId.value, query)
    const refreshedRun = data.items.find((item) => String(item.id) === runId.value)
    if (refreshedRun) run.value = refreshedRun
  } catch (error) {
    ElMessage.error(errorText(error))
  } finally {
    loadingRun.value = false
  }
}

async function loadCandidates() {
	if (loadingCandidates.value) return
  loadingCandidates.value = true
  try {
    const data = useAdminApi.value
      ? await getAdminSendRunCandidates(runId.value)
      : await getSendRunCandidates(runId.value)
    friends.value = data.friends
    groups.value = data.groups
    scanSummary.value = {
      following_total: data.following_total,
      scanned_count: data.scanned_count,
      coverage_percent: data.coverage_percent,
      scan_status: data.scan_status,
      scan_stop_reason: data.scan_stop_reason,
    }
    if (data.scan_status === 'running') startScanPolling()
    else stopScanPolling()
  } catch (error) {
    ElMessage.error(errorText(error))
  } finally {
    loadingCandidates.value = false
  }
}

const scanSummaryVisible = computed(() =>
  activeTab.value === 'friends' &&
  scanSummary.value.scan_status !== undefined,
)

const scanSummaryUnavailable = computed(() =>
  activeTab.value === 'friends' &&
  !loadingCandidates.value &&
  scanSummary.value.scan_status === undefined,
)

const scannedCountText = computed(() =>
  typeof scanSummary.value.scanned_count === 'number' ? String(scanSummary.value.scanned_count) : '0',
)

const followingTotalText = computed(() =>
  typeof scanSummary.value.following_total === 'number' ? String(scanSummary.value.following_total) : '-',
)

const coverageText = computed(() => {
  if (typeof scanSummary.value.coverage_percent !== 'number') return '-'
  return `${scanSummary.value.coverage_percent.toFixed(2).replace(/\.00$/, '')}%`
})

const scanStatusLabel = computed(() => {
  switch (scanSummary.value.scan_status) {
    case 'running': return '正在扫描'
    case 'complete': return '扫描完成'
    case 'incomplete': return '扫描未完整结束'
    case 'timeout': return '扫描超时，已提前结束（已匹配目标继续发送）'
    case 'recovery_failed': return '扫描失败（好友列表未能恢复）'
    default: return '扫描状态'
  }
})

function startScanPolling() {
  if (scanPollTimer !== null) return
  scanPollTimer = window.setInterval(() => {
    void loadCandidates()
  }, 3000)
}

function stopScanPolling() {
  if (scanPollTimer === null) return
  window.clearInterval(scanPollTimer)
  scanPollTimer = null
}

async function refreshData() {
  if (refreshing.value) return
  refreshing.value = true
  try {
    await Promise.all([loadRun(), loadCandidates()])
  } finally {
    refreshing.value = false
  }
}

function statusText(status?: string) {
  return runStatusText(status)
}

function statusTag(status?: string) {
  if (status === 'sent') return 'success'
  if (status === 'partial_success') return 'warning'
  if (status === 'failed') return 'danger'
  if (status === 'uncertain') return 'warning'
  if (status === 'skipped') return 'info'
  return 'primary'
}

function failureReason(row: SendRunCandidate) {
  return row.error_message || row.error_code || '-'
}

function friendDouyinText(row: SendRunCandidate) {
  if (row.douyin_id) return row.douyin_id
  if (row.douyin_id_status === 'not_required') return '本次发送无需读取'
  if (row.douyin_id_status === 'read_failed' || row.douyin_id_status === 'failed') return '读取失败'
  return '未读取'
}

function groupMemberCountText(row: SendRunCandidate) {
  if (typeof row.member_count === 'number' && row.member_count > 0) return row.member_count
  if (row.member_count_status === 'failed') return '读取失败'
  return '-'
}

function candidateTitle(row: SendRunCandidate) {
  if (activeTab.value === 'friends') return row.display_name || friendDouyinText(row)
  return row.group_name || '未命名群聊'
}

function candidateKey(row: SendRunCandidate) {
  if (activeTab.value === 'friends') return `${row.display_name || ''}:${friendDouyinText(row)}`
  return `${row.group_name || ''}:${groupMemberCountText(row)}`
}

function goBack() {
  if (isAdminGlobal.value) {
    void router.push('/admin/send-runs')
  } else if (isAdminAccount.value) {
    void router.push({
      path: '/admin/douyin-accounts',
      query: { douyinId: douyinId.value, tab: 'runs' },
    })
  } else {
    void router.push({
      path: `/douyin-accounts/${encodeURIComponent(douyinId.value)}`,
      query: { tab: 'runs' },
    })
  }
}

onMounted(() => {
  compactTableMedia = window.matchMedia('(max-width: 1100px), (max-height: 520px)')
  compactTableLayout.value = compactTableMedia.matches
  compactTableMedia.addEventListener('change', syncCompactTableLayout)
  void Promise.all([loadRun(), loadCandidates()])
})

function syncCompactTableLayout(event: MediaQueryListEvent) {
  compactTableLayout.value = event.matches
}

onBeforeUnmount(() => {
  stopScanPolling()
  compactTableMedia?.removeEventListener('change', syncCompactTableLayout)
})
</script>

<style scoped>
.run-detail-heading {
  flex: 1;
  min-width: 0;
}

.run-detail-title-line {
  display: flex;
  align-items: baseline;
  flex-wrap: wrap;
  gap: 6px 10px;
}

.run-detail-title-separator {
  color: var(--app-text-muted);
  font-size: 18px;
}

.run-detail-account {
  color: var(--app-text-muted);
  font-size: 14px;
  font-weight: 500;
  white-space: nowrap;
}

.run-detail-account strong {
  color: var(--el-color-primary);
  font-weight: 650;
}

.run-detail-id {
  display: flex;
  align-items: baseline;
  margin: 2px 0 0;
  color: var(--app-text-muted);
  font-size: 13px;
  line-height: 1.6;
}

.run-detail-meta-label {
  flex: none;
}

.run-detail-id-value {
  min-width: 0;
  color: var(--app-text-secondary, var(--app-text-muted));
  word-break: break-all;
}

.record-detail-body {
  display: grid;
  gap: 16px;
  min-width: 0;
}

.detail-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  min-height: 32px;
  min-width: 0;
}

.detail-tabs-control {
  min-width: 0;
}

.detail-refresh-button {
  flex: none;
}

.following-scan-summary {
  display: grid;
  gap: 4px;
  padding: 10px 12px;
  border: 1px solid var(--app-border, #dcdfe6);
  border-radius: 6px;
  background: var(--app-surface-muted, #f7f8fa);
  color: var(--app-text-secondary, #606266);
  font-size: 13px;
  line-height: 1.5;
}

.following-scan-summary__line {
  min-width: 0;
  overflow-wrap: anywhere;
}

.run-descriptions :deep(.el-descriptions__label) {
  width: 120px;
}

.run-descriptions :deep(.el-descriptions__content) {
  word-break: break-all;
}

.target-table :deep(.cell) {
  white-space: nowrap;
}

.target-mobile-list {
  min-height: 120px;
}

@media (max-width: 640px) {
  .target-mobile-list {
    max-height: calc(100dvh - 260px);
    overflow-y: auto;
    padding-right: 4px;
  }

  .detail-toolbar {
    align-items: flex-start;
    flex-direction: column;
    gap: 10px;
  }

  .detail-refresh-button {
    align-self: flex-end;
  }

  .detail-tabs-control,
  .detail-tabs-control :deep(.el-segmented) {
    width: 100%;
  }

  .detail-tabs-control :deep(.el-segmented__item) {
    min-width: 0;
  }

  .detail-tabs-control :deep(.el-segmented__item-label) {
    line-height: 1.25;
    text-align: center;
    white-space: normal;
  }
}
</style>
