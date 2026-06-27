<template>
  <section>
    <div class="page-header">
      <div>
        <h1 class="page-title">抖音号管理</h1>
        <p class="page-subtitle">查看全站抖音号资产，管理发送相关配置，不修改账号归属和个人信息。</p>
      </div>
      <el-button :loading="loading" @click="loadAccounts">刷新</el-button>
    </div>

    <div class="status-grid admin-metrics">
      <div class="metric">
        <div class="metric-label">抖音号总数</div>
        <div class="metric-value">{{ pager.total }}</div>
      </div>
      <div class="metric">
        <div class="metric-label">本页登录正常</div>
        <div class="metric-value">{{ currentPageOkCount }}</div>
      </div>
      <div class="metric">
        <div class="metric-label">本页资格过期</div>
        <div class="metric-value">{{ currentPageExpiredCount }}</div>
      </div>
    </div>

    <div class="content-panel">
      <div class="panel-body">
        <div class="filter-bar">
          <el-input
            v-model.trim="filters.owner_public_uid"
            clearable
            placeholder="归属账户ID"
            @keyup.enter="search"
          />
          <el-input
            v-model.trim="filters.douyin_id"
            clearable
            placeholder="抖音号"
            @keyup.enter="search"
          />
          <el-select v-model="filters.login_state" clearable placeholder="登录态">
            <el-option label="登录正常" value="ok" />
            <el-option label="登录失效" value="not_logged_in" />
            <el-option label="登录态文件缺失" value="missing_storage_state" />
            <el-option label="账号不匹配" value="identity_mismatch" />
            <el-option label="检查失败" value="check_failed" />
          </el-select>
          <el-select v-model="filters.status" clearable placeholder="自动发送状态">
            <el-option label="自动发送开启" value="active" />
            <el-option label="已暂停" value="paused" />
            <el-option label="已禁用" value="disabled" />
            <el-option label="已转移" value="transferred" />
          </el-select>
          <el-select v-model="filters.polling_entitlement_status" clearable placeholder="轮询资格">
            <el-option label="资格有效" value="active" />
            <el-option label="资格过期" value="expired" />
            <el-option label="未开通资格" value="none" />
          </el-select>
          <el-button type="primary" @click="search">筛选</el-button>
          <el-button @click="resetFilters">重置</el-button>
        </div>

        <div class="quick-filters">
          <el-button size="small" @click="setQuickFilter('all')">全部</el-button>
          <el-button size="small" @click="setQuickFilter('ok')">登录正常</el-button>
          <el-button size="small" @click="setQuickFilter('badLogin')">登录异常</el-button>
          <el-button size="small" @click="setQuickFilter('active')">自动发送中</el-button>
          <el-button size="small" @click="setQuickFilter('paused')">已暂停</el-button>
          <el-button size="small" @click="setQuickFilter('entitled')">资格有效</el-button>
          <el-button size="small" @click="setQuickFilter('expired')">资格过期</el-button>
        </div>

        <el-table
          :data="accounts"
          :loading="loading"
          empty-text="暂无抖音号"
          height="calc(100vh - 390px)"
        >
          <el-table-column prop="douyin_id" label="抖音号" min-width="140" fixed="left" />
          <el-table-column label="抖音昵称" min-width="150">
            <template #default="{ row }">{{ row.profile_nickname || '-' }}</template>
          </el-table-column>
          <el-table-column label="归属账户" min-width="170">
            <template #default="{ row }">
              <div class="owner-cell">
                <strong>{{ row.owner_public_uid || '-' }}</strong>
                <span>{{ row.owner_nickname || '-' }}</span>
              </div>
            </template>
          </el-table-column>
          <el-table-column label="登录态" width="130">
            <template #default="{ row }">
              <el-tag :type="loginStateTag(row.login_state)">
                {{ adminLoginStateText(row.login_state) }}
              </el-tag>
            </template>
          </el-table-column>
          <el-table-column label="自动发送" width="130">
            <template #default="{ row }">
              <el-tag :type="enabledStatusTag(row.status)">
                {{ adminStatusText(row.status) }}
              </el-tag>
            </template>
          </el-table-column>
          <el-table-column label="轮询资格" min-width="180">
            <template #default="{ row }">{{ entitlementText(row) }}</template>
          </el-table-column>
          <el-table-column label="任务数" width="130">
            <template #default="{ row }">
              {{ row.send_task_count || 0 }} / 启用 {{ row.active_send_task_count || 0 }}
            </template>
          </el-table-column>
          <el-table-column label="最近运行" min-width="180">
            <template #default="{ row }">{{ formatBeijingTime(row.latest_task_last_run_at) }}</template>
          </el-table-column>
          <el-table-column label="最近错误" min-width="220">
            <template #default="{ row }">
              {{ row.latest_task_error_message || row.latest_task_error_code || row.last_error_message || '-' }}
            </template>
          </el-table-column>
          <el-table-column label="操作" width="250" fixed="right">
            <template #default="{ row }">
              <el-button link type="primary" @click="openDetail(row)">详情</el-button>
              <el-button link type="primary" @click="openRedeemDialog(row)">兑换</el-button>
              <el-button
                link
                type="primary"
                :loading="verifyingDouyinId === row.douyin_id"
                @click="verifyAccountLogin(row)"
              >
                验证登录态
              </el-button>
              <el-button
                v-if="row.status === 'active'"
                link
                type="warning"
                @click="changeAccountPolling(row, false)"
              >
                暂停
              </el-button>
              <el-button v-else link type="success" @click="changeAccountPolling(row, true)">
                恢复
              </el-button>
            </template>
          </el-table-column>
        </el-table>

        <div class="pagination-row">
          <el-pagination
            v-model:current-page="pager.page"
            v-model:page-size="pager.pageSize"
            :total="pager.total"
            :page-sizes="[20, 50, 100]"
            layout="total, sizes, prev, pager, next"
            @size-change="loadAccounts"
            @current-change="loadAccounts"
          />
        </div>
      </div>
    </div>

    <el-drawer v-model="detailOpen" size="90vw" title="抖音号详情" class="admin-detail-drawer">
      <div v-if="selectedAccount" class="detail-drawer-body">
        <div class="detail-identity">
          <div class="detail-identity-main">抖音号：{{ selectedAccount.douyin_id }}</div>
          <div class="detail-identity-meta">
            <span>昵称：{{ selectedAccount.profile_nickname || '-' }}</span>
            <span>归属账号：{{ selectedAccount.owner_public_uid || '-' }}</span>
          </div>
        </div>
        <el-tabs v-model="detailTab" class="drawer-tabs">
          <el-tab-pane label="抖音号详情" name="details">
            <el-descriptions :column="2" border>
              <el-descriptions-item label="抖音号">{{ selectedAccount.douyin_id }}</el-descriptions-item>
              <el-descriptions-item label="抖音昵称">
                {{ selectedAccount.profile_nickname || '-' }}
              </el-descriptions-item>
              <el-descriptions-item label="归属账户ID">
                {{ selectedAccount.owner_public_uid || '-' }}
              </el-descriptions-item>
              <el-descriptions-item label="归属昵称">
                {{ selectedAccount.owner_nickname || '-' }}
              </el-descriptions-item>
              <el-descriptions-item label="运行状态">
                {{ runnerStateText(selectedAccount.runner_state) }}
              </el-descriptions-item>
              <el-descriptions-item label="登录态">
                <div class="login-status-cell">
                  <el-tag :type="loginStateTag(selectedAccount.login_state)">
                    {{ adminLoginStateText(selectedAccount.login_state) }}
                  </el-tag>
                  <el-button
                    size="small"
                    :loading="verifyingDouyinId === selectedAccount.douyin_id"
                    @click="verifyAccountLogin(selectedAccount)"
                  >
                    验证登录态
                  </el-button>
                </div>
              </el-descriptions-item>
              <el-descriptions-item label="自动加入新增轮次">
                {{ selectedAccount.auto_apply_new_slots ? '已开启' : '未开启' }}
              </el-descriptions-item>
              <el-descriptions-item label="轮询资格">
                {{ entitlementText(selectedAccount) }}
              </el-descriptions-item>
              <el-descriptions-item label="创建时间">
                {{ formatBeijingTime(selectedAccount.created_at) }}
              </el-descriptions-item>
              <el-descriptions-item label="更新时间">
                {{ formatBeijingTime(selectedAccount.updated_at) }}
              </el-descriptions-item>
            </el-descriptions>
          </el-tab-pane>
          <el-tab-pane label="发送任务" name="tasks">
            <div class="toolbar">
              <strong>发送任务</strong>
              <div>
                <el-button @click="loadDetailTasks">刷新</el-button>
                <el-button type="primary" @click="openTaskDialog()">新增发送任务</el-button>
              </div>
            </div>
            <el-table :data="tasks" :loading="tasksLoading" empty-text="暂无发送任务" height="310">
              <el-table-column prop="id" label="任务ID" min-width="180" />
              <el-table-column label="状态" width="100">
                <template #default="{ row }">{{ runStatusText(row.status) }}</template>
              </el-table-column>
              <el-table-column label="发送目标" min-width="220">
                <template #default="{ row }">{{ targetRulesText(row.target_rules_json) }}</template>
              </el-table-column>
              <el-table-column label="最近运行" min-width="160">
                <template #default="{ row }">{{ formatBeijingTime(row.last_run_at) }}</template>
              </el-table-column>
              <el-table-column label="操作" width="180" fixed="right">
                <template #default="{ row }">
                  <el-button link type="primary" @click="openTaskDialog(row)">编辑</el-button>
                  <el-button
                    v-if="row.status === 'active'"
                    link
                    type="warning"
                    @click="pauseTask(row)"
                  >
                    暂停
                  </el-button>
                  <el-button v-else link type="success" @click="resumeTask(row)">恢复</el-button>
                </template>
              </el-table-column>
            </el-table>
          </el-tab-pane>
          <el-tab-pane label="运行记录" name="runs">
            <div class="toolbar">
              <strong>运行记录</strong>
            </div>
            <SendRunRecordsPanel
              ref="adminRunsPanel"
              :loader="loadAdminRunRecords"
              :scope-key="selectedAccount?.douyin_id || ''"
              :filter-fields="detailRunFilterFields"
              :filter-options="detailRunFilterOptions"
              show-scope-filters
              show-slot-column
              height="calc(100vh - 360px)"
            />
          </el-tab-pane>
        </el-tabs>
      </div>
    </el-drawer>

    <el-dialog v-model="redeemDialogOpen" title="为抖音号兑换兑换码" width="440px">
      <el-form label-position="top" @submit.prevent>
        <el-form-item label="目标抖音号">
          <el-input :model-value="redeemTarget?.douyin_id || '-'" disabled />
        </el-form-item>
        <el-form-item label="归属账户">
          <el-input :model-value="redeemOwnerText" disabled />
        </el-form-item>
        <el-form-item label="兑换码">
          <el-input
            v-model.trim="redeemCode"
            clearable
            placeholder="请输入兑换码"
            @keyup.enter="submitAdminRedeemCode"
          />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="redeemDialogOpen = false">取消</el-button>
        <el-button type="primary" :loading="redeeming" @click="submitAdminRedeemCode">兑换</el-button>
      </template>
    </el-dialog>
    <SendTaskDialog
      v-if="selectedAccount"
      v-model="taskDialogOpen"
      :douyin-id="selectedAccount.douyin_id"
      :task="editingTask"
      admin-mode
      @saved="afterTaskSaved"
    />
  </section>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import {
  getAdminDouyinAccount,
  getAdminLoginStatus,
  listAdminAccountRuns,
  listAdminAccountSendTasks,
  listAdminDouyinAccounts,
  redeemAdminDouyinAccountCode,
  pauseAdminSendTask,
  resumeAdminSendTask,
  setAdminDouyinPolling,
  verifyAdminLoginStatus,
  type AdminDouyinAccountParams,
} from '@/api/adminDouyin'
import { ApiError, errorText } from '@/api/http'
import { listAdminScheduleSlots } from '@/api/schedule'
import type { SendRunQuery } from '@/api/sendTasks'
import type { DouyinAccount, LoginState, SendScheduleSlot, SendTask } from '@/api/types'
import SendRunRecordsPanel from '@/components/SendRunRecordsPanel.vue'
import SendTaskDialog from '@/components/SendTaskDialog.vue'
import {
  enabledStatusTag,
  loginStateTag,
  loginStateText,
  runnerStateText,
  runStatusText,
} from '@/utils/status'
import { formatBeijingTime } from '@/utils/time'

const accounts = ref<DouyinAccount[]>([])
const selectedAccount = ref<DouyinAccount | null>(null)
const tasks = ref<SendTask[]>([])
const scheduleSlots = ref<SendScheduleSlot[]>([])
const loading = ref(false)
const tasksLoading = ref(false)
const detailOpen = ref(false)
const detailTab = ref('details')
const taskDialogOpen = ref(false)
const editingTask = ref<SendTask | null>(null)
const adminRunsPanel = ref<InstanceType<typeof SendRunRecordsPanel> | null>(null)
const verifyingDouyinId = ref('')
const redeemDialogOpen = ref(false)
const redeemTarget = ref<DouyinAccount | null>(null)
const redeemCode = ref('')
const redeeming = ref(false)
const detailRunFilterFields: Array<'task_id' | 'slot_id' | 'error_code'> = [
  'task_id',
  'slot_id',
  'error_code',
]

const filters = reactive({
  owner_public_uid: '',
  douyin_id: '',
  status: '',
  login_state: '',
  polling_entitlement_status: '',
})

const pager = reactive({
  page: 1,
  pageSize: 20,
  total: 0,
})

const currentPageOkCount = computed(
  () => accounts.value.filter((account) => account.login_state === 'ok').length,
)

const currentPageExpiredCount = computed(
  () => accounts.value.filter((account) => account.polling_entitlement_status === 'expired').length,
)

const redeemOwnerText = computed(() => {
  if (!redeemTarget.value) return '-'
  const publicUid = redeemTarget.value.owner_public_uid || '-'
  const nickname = redeemTarget.value.owner_nickname
  return nickname ? `${publicUid} / ${nickname}` : publicUid
})

const detailRunFilterOptions = computed(() => ({
  task_id: tasks.value.map((task) => ({
    value: task.id || task.task_id || '',
    label: task.id || task.task_id || '',
  })),
  slot_id: scheduleSlots.value.map((slot) => ({
    value: slot.id,
    label: slot.name ? `${slot.name} / ${slot.id}` : slot.id,
  })),
}))

function requestParams(): AdminDouyinAccountParams {
  return {
    page: pager.page,
    page_size: pager.pageSize,
    owner_public_uid: filters.owner_public_uid || undefined,
    douyin_id: filters.douyin_id || undefined,
    status: filters.status || undefined,
    login_state: filters.login_state || undefined,
    polling_entitlement_status: filters.polling_entitlement_status || undefined,
  }
}

async function loadAccounts() {
  loading.value = true
  try {
    const data = await listAdminDouyinAccounts(requestParams())
    accounts.value = data.items
    pager.total = data.total
    pager.page = data.page
    pager.pageSize = data.page_size
  } catch (error) {
    ElMessage.error(errorText(error))
  } finally {
    loading.value = false
  }
}

async function search() {
  pager.page = 1
  await loadAccounts()
}

async function resetFilters() {
  filters.owner_public_uid = ''
  filters.douyin_id = ''
  filters.status = ''
  filters.login_state = ''
  filters.polling_entitlement_status = ''
  await search()
}

async function setQuickFilter(type: string) {
  filters.owner_public_uid = ''
  filters.douyin_id = ''
  filters.status = ''
  filters.login_state = ''
  filters.polling_entitlement_status = ''
  if (type === 'ok') filters.login_state = 'ok'
  if (type === 'badLogin') filters.login_state = 'not_logged_in'
  if (type === 'active') filters.status = 'active'
  if (type === 'paused') filters.status = 'paused'
  if (type === 'entitled') filters.polling_entitlement_status = 'active'
  if (type === 'expired') filters.polling_entitlement_status = 'expired'
  await search()
}

async function openDetail(account: DouyinAccount) {
  detailOpen.value = true
  detailTab.value = 'details'
  selectedAccount.value = account
  tasks.value = []
  try {
    selectedAccount.value = await getAdminDouyinAccount(account.douyin_id)
  } catch (error) {
    ElMessage.error(errorText(error))
  }
  await loadDetailTasks()
  await loadSelectedLoginStatus()
}

async function loadSelectedLoginStatus() {
  if (!selectedAccount.value) return
  try {
    const status = await getAdminLoginStatus(selectedAccount.value.douyin_id)
    selectedAccount.value = {
      ...selectedAccount.value,
      login_state: status.login_state,
      last_check_at: status.last_checked_at,
    }
  } catch (error) {
    ElMessage.error(errorText(error))
  }
}

async function loadDetailTasks() {
  if (!selectedAccount.value) return
  tasksLoading.value = true
  try {
    tasks.value = await listAdminAccountSendTasks(selectedAccount.value.douyin_id)
  } catch (error) {
    ElMessage.error(errorText(error))
  } finally {
    tasksLoading.value = false
  }
}

async function loadRunFilterSlots() {
  try {
    scheduleSlots.value = await listAdminScheduleSlots()
  } catch (error) {
    ElMessage.error(errorText(error))
  }
}

async function loadAdminRunRecords(query: SendRunQuery) {
  if (!selectedAccount.value) {
    return { items: [], total: 0, page: query.page || 1, page_size: query.page_size || 20 }
  }
  return listAdminAccountRuns(selectedAccount.value.douyin_id, query)
}

async function changeAccountPolling(account: DouyinAccount, enabled: boolean) {
  try {
    await ElMessageBox.confirm(
      enabled
        ? '恢复后，该抖音号和它下面的发送任务会恢复为启用状态。确定继续吗？'
        : '暂停后，该抖音号和它下面的发送任务会一起暂停。确定继续吗？',
      enabled ? '恢复自动发送' : '暂停自动发送',
      {
        confirmButtonText: enabled ? '恢复' : '暂停',
        cancelButtonText: '取消',
        type: enabled ? 'warning' : 'info',
      },
    )
    await setAdminDouyinPolling(account.douyin_id, enabled)
    ElMessage.success(enabled ? '自动发送已恢复。' : '自动发送已暂停。')
    await loadAccounts()
    if (selectedAccount.value?.douyin_id === account.douyin_id) {
      selectedAccount.value = await getAdminDouyinAccount(account.douyin_id)
      await loadDetailTasks()
    }
  } catch (error) {
    if (error !== 'cancel' && error !== 'close') {
      ElMessage.error(errorText(error))
    }
  }
}

async function verifyAccountLogin(account: DouyinAccount) {
  verifyingDouyinId.value = account.douyin_id
  const previousCheckedAt = account.last_check_at || ''
  try {
    const status = await verifyAdminLoginStatus(account.douyin_id)
    applyLoginStatusToSelected(account.douyin_id, status)
    ElMessage.success(`登录态验证完成：${status.display_text || adminLoginStateText(status.login_state)}`)
  } catch (error) {
    const latestStatus = await tryGetLatestAdminLoginStatus(account.douyin_id)
    if (latestStatus) {
      applyLoginStatusToSelected(account.douyin_id, latestStatus)
      const latestCheckedAt = latestStatus.last_checked_at || ''
      if (latestCheckedAt && latestCheckedAt !== previousCheckedAt) {
        ElMessage.success(
          `登录态已同步最新结果：${latestStatus.display_text || adminLoginStateText(latestStatus.login_state)}`,
        )
      } else if (error instanceof ApiError && error.code === 'request_timeout') {
        ElMessage.warning('验证耗时较长，已刷新最近登录态。')
      } else {
        ElMessage.warning(`验证请求返回异常，已刷新最近登录态：${errorText(error)}`)
      }
    } else if (error instanceof ApiError && error.code === 'request_timeout') {
      ElMessage.warning('验证耗时较长，请稍后点击刷新查看最新登录态。')
    } else {
      ElMessage.error(errorText(error))
    }
  } finally {
    await refreshAccountAfterVerification(account.douyin_id)
    verifyingDouyinId.value = ''
  }
}

async function tryGetLatestAdminLoginStatus(douyinId: string) {
  try {
    return await getAdminLoginStatus(douyinId)
  } catch {
    return null
  }
}

function applyLoginStatusToSelected(
  douyinId: string,
  status: { login_state?: LoginState; last_checked_at?: string },
) {
  if (selectedAccount.value?.douyin_id !== douyinId) return
  selectedAccount.value = {
    ...selectedAccount.value,
    login_state: status.login_state || selectedAccount.value.login_state,
    last_check_at: status.last_checked_at || selectedAccount.value.last_check_at,
  }
}

async function refreshAccountAfterVerification(douyinId: string) {
  try {
    if (selectedAccount.value?.douyin_id === douyinId) {
      const [account, status] = await Promise.all([
        getAdminDouyinAccount(douyinId),
        getAdminLoginStatus(douyinId),
      ])
      selectedAccount.value = {
        ...account,
        login_state: status.login_state || account.login_state,
        last_check_at: status.last_checked_at || account.last_check_at,
      }
    }
    await loadAccounts()
  } catch (error) {
    ElMessage.error(errorText(error))
  }
}

function openRedeemDialog(account: DouyinAccount) {
  redeemTarget.value = account
  redeemCode.value = ''
  redeemDialogOpen.value = true
}

async function submitAdminRedeemCode() {
  const target = redeemTarget.value
  const code = redeemCode.value.trim()
  if (!target) return
  if (!code) {
    ElMessage.warning('请输入兑换码。')
    return
  }
  redeeming.value = true
  try {
    const redeemedAccount = await redeemAdminDouyinAccountCode(target.douyin_id, code)
    if (redeemedAccount) {
      accounts.value = accounts.value.map((account) =>
        account.douyin_id === target.douyin_id ? { ...account, ...redeemedAccount } : account,
      )
      if (selectedAccount.value?.douyin_id === target.douyin_id) {
        selectedAccount.value = { ...selectedAccount.value, ...redeemedAccount }
      }
    }
    redeemDialogOpen.value = false
    redeemCode.value = ''
    ElMessage.success('兑换成功。')
    await loadAccounts()
    if (selectedAccount.value?.douyin_id === target.douyin_id) {
      selectedAccount.value = await getAdminDouyinAccount(target.douyin_id)
    }
  } catch (error) {
    ElMessage.error(errorText(error))
  } finally {
    redeeming.value = false
  }
}
function openTaskDialog(task?: SendTask) {
  editingTask.value = task || null
  taskDialogOpen.value = true
}

async function afterTaskSaved() {
  await Promise.all([loadDetailTasks(), adminRunsPanel.value?.loadRuns(), loadAccounts()])
}

async function pauseTask(task: SendTask) {
  const taskId = task.id || task.task_id
  if (!taskId) return
  try {
    await pauseAdminSendTask(taskId)
    await loadDetailTasks()
    await loadAccounts()
  } catch (error) {
    ElMessage.error(errorText(error))
  }
}

async function resumeTask(task: SendTask) {
  const taskId = task.id || task.task_id
  if (!taskId) return
  try {
    await resumeAdminSendTask(taskId)
    await loadDetailTasks()
    await loadAccounts()
  } catch (error) {
    ElMessage.error(errorText(error))
  }
}

function adminStatusText(status?: string) {
  const map: Record<string, string> = {
    active: '自动发送开启',
    paused: '已暂停',
    disabled: '已禁用',
    transferred: '已转移',
  }
  return status ? map[status] || status : '-'
}

function adminLoginStateText(state?: string) {
  if (state === 'ok') return '登录正常'
  return loginStateText(state)
}

function entitlementText(account?: DouyinAccount | null) {
  const status = account?.polling_entitlement_status
  if (status === 'active' || status === 'valid') {
    return account?.polling_eligible_until
      ? `有效至 ${formatBeijingTime(account.polling_eligible_until)}`
      : '资格有效'
  }
  if (status === 'expired') return '资格过期'
  return '未开通资格'
}

function targetRulesText(value?: string) {
  try {
    const rules = JSON.parse(value || '[]') as Array<{
      type?: string
      mode?: string
      value?: string
      values?: string[]
    }>
    if (!Array.isArray(rules) || rules.length === 0) return '未配置'
    return rules
      .map((rule) => {
        if (rule.type === 'friend') {
          return `好友备注${friendRuleModeText(rule.mode)}：${rule.value || '-'}`
        }
        if (rule.type === 'group') {
          const keywords = rule.value || (rule.values || []).join(' ')
          return `群聊名称${groupRuleModeText(rule.mode)}：${keywords || '-'}`
        }
        return ''
      })
      .filter(Boolean)
      .join('；')
  } catch {
    return '配置异常'
  }
}

function friendRuleModeText(mode?: string) {
  const map: Record<string, string> = {
    prefix: '前缀匹配',
    contains: '包含匹配',
    exact: '精确匹配',
  }
  return map[mode || ''] || '匹配'
}

function groupRuleModeText(mode?: string) {
  if (mode === 'contains_all') return '同时包含全部关键词'
  if (mode === 'contains') return '包含任意一个关键词'
  return '包含'
}

onMounted(() => {
  void loadAccounts()
  void loadRunFilterSlots()
})
</script>

<style scoped>
.admin-metrics {
  grid-template-columns: repeat(3, minmax(0, 1fr));
}

.filter-bar {
  display: grid;
  grid-template-columns: repeat(5, minmax(130px, 1fr)) auto auto;
  gap: 10px;
  margin-bottom: 10px;
}

.quick-filters {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-bottom: 14px;
}

.owner-cell {
  display: grid;
  gap: 2px;
}

.owner-cell span {
  color: #6b7280;
  font-size: 12px;
}

:global(:root.dark) .owner-cell span {
  color: #cbd5e1;
}

.pagination-row {
  display: flex;
  justify-content: flex-end;
  margin-top: 14px;
}

.detail-drawer-body {
  display: grid;
  gap: 16px;
}

.detail-identity {
  display: flex;
  flex-wrap: wrap;
  gap: 8px 18px;
  align-items: baseline;
  padding: 0 2px 2px;
}

.detail-identity-main {
  color: var(--app-text);
  font-size: 18px;
  font-weight: 800;
}

.detail-identity-meta {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  color: var(--app-text-muted);
  font-size: 13px;
}

:deep(.admin-detail-drawer.el-drawer) {
  width: 90vw !important;
  min-width: 860px;
}

.login-status-cell {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  align-items: center;
}

.drawer-tabs :deep(.el-tabs__item) {
  font-size: 15px;
  font-weight: 700;
}

@media (max-width: 1100px) {
  .filter-bar,
  .admin-metrics {
    grid-template-columns: 1fr;
  }

  :deep(.admin-detail-drawer.el-drawer) {
    width: calc(100vw - 24px) !important;
    min-width: 0;
  }
}
</style>
