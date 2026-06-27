<template>
  <section>
    <div class="page-header">
      <div>
        <h1 class="page-title">抖音号 {{ douyinId }}</h1>
        <p class="page-subtitle">当前页面只管理这一个抖音号。</p>
      </div>
      <div class="detail-actions">
        <el-button @click="$router.push('/douyin-accounts')">返回列表</el-button>
        <el-button type="primary" @click="loginDrawerOpen = true">重新登录</el-button>
      </div>
    </div>

    <div class="content-panel lower-panel">
      <div class="panel-body">
        <el-tabs v-model="activeTab" class="detail-tabs">
          <el-tab-pane label="自动发送设置" name="settings">
            <el-skeleton v-if="loading" :rows="4" animated />
            <template v-else>
              <div class="settings-list">
                <div class="setting-row">
                  <div class="setting-main">
                    <div class="summary-label">抖音登录状态</div>
                    <p>用于判断当前登录态是否还能正常进入抖音；失效后需要重新登录。</p>
                  </div>
                  <div class="setting-value">
                    <el-tag :type="loginStateTag(loginStatus?.login_state || account?.login_state)" size="large">
                      {{ loginStatus?.display_text || loginStateText(loginStatus?.login_state || account?.login_state) }}
                    </el-tag>
                  </div>
                </div>
                <div class="setting-row">
                  <div class="setting-main">
                    <div class="summary-label">最近登录状态验证</div>
                    <p>记录最近一次点击“验证登录状态”并完成检测的时间。</p>
                  </div>
                  <div class="setting-value setting-time setting-action-value">
                    <el-tag
                      :type="latestLoginCheckText === '未验证' ? 'info' : 'success'"
                      size="large"
                      class="last-check-tag"
                    >
                      {{ latestLoginCheckText }}
                    </el-tag>
                    <el-button :loading="verifying" @click="verifyStatus">验证登录状态</el-button>
                  </div>
                </div>
                <div class="setting-row">
                  <div class="setting-main">
                    <div class="summary-label">自动发送</div>
                    <p>开启后，这个抖音号下已启用且绑定轮次的发送任务，才有机会进入自动发送号池。</p>
                  </div>
                  <div class="setting-value">
                    <el-switch
                      :model-value="account?.status === 'active'"
                      :loading="pollingSaving"
                      active-text="开启"
                      inactive-text="暂停"
                      @change="changePolling"
                    />
                  </div>
                </div>
                <div class="setting-row">
                  <div class="setting-main">
                    <div class="summary-label">自动加入新增轮次</div>
                    <p>开启后，管理员以后新增的启用轮次会自动应用到当前抖音号下已启用的发送任务；不会自动选择当前已有轮次，禁用后重新启用的旧轮次也不会自动加入。</p>
                  </div>
                  <div class="setting-value">
                    <el-switch
                      :model-value="schedulePreferences?.auto_apply_new_slots"
                      :loading="preferencesSaving"
                      active-text="开启"
                      inactive-text="关闭"
                      @change="changeAutoApplyNewSlots"
                    />
                  </div>
                </div>
                <div class="setting-row">
                  <div class="setting-main">
                    <div class="summary-label">轮询资格</div>
                    <p>只有资格有效时，这个抖音号才可以参与自动发送轮询；过期不会删除任务或清空轮次绑定。</p>
                  </div>
                  <div class="setting-value entitlement-value">
                    <el-tag :type="entitlementTag(account?.polling_entitlement_status)" size="large">
                      {{ entitlementText(account) }}
                    </el-tag>
                  </div>
                </div>
              </div>
              <div class="redeem-box">
                <div>
                  <strong>抖音号资格兑换</strong>
                  <p>兑换码可转赠；兑换后不可撤回，有效天数由后端按当前资格状态自动累加。</p>
                </div>
                <div class="redeem-form">
                  <el-input
                    v-model.trim="redeemCode"
                    clearable
                    placeholder="请输入兑换码"
                    @keyup.enter="submitRedeemCode"
                  />
                  <el-button type="primary" :loading="redeeming" @click="submitRedeemCode">
                    兑换
                  </el-button>
                </div>
              </div>
              <el-alert
                v-if="loginStatus?.need_relogin"
                type="warning"
                show-icon
                :closable="false"
                title="抖音登录状态已失效，请重新登录后再开启自动发送。"
                class="summary-alert"
              />
            </template>
          </el-tab-pane>
          <el-tab-pane label="发送任务" name="tasks">
            <div class="toolbar">
              <strong>发送任务</strong>
              <el-button type="primary" @click="openTaskDialog()">新增发送任务</el-button>
            </div>
            <el-table :data="tasks" :loading="tasksLoading" empty-text="暂无发送任务" height="420">
              <el-table-column prop="id" label="任务ID" min-width="190" />
              <el-table-column label="状态" width="100">
                <template #default="{ row }">{{ runStatusText(row.status) }}</template>
              </el-table-column>
              <el-table-column label="发送目标" min-width="220">
                <template #default="{ row }">{{ targetRulesText(row.target_rules_json) }}</template>
              </el-table-column>
              <el-table-column label="最近运行" min-width="180">
                <template #default="{ row }">{{ formatBeijingTime(row.last_run_at) }}</template>
              </el-table-column>
              <el-table-column label="操作" width="210" fixed="right">
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
              ref="runsPanel"
              :loader="loadRunRecords"
              :scope-key="douyinId"
              :filter-fields="runFilterFields"
              :filter-options="runFilterOptions"
              show-scope-filters
              show-slot-column
              height="420"
            />
          </el-tab-pane>
        </el-tabs>
      </div>
    </div>

    <LoginSessionDrawer v-model="loginDrawerOpen" auto-start @completed="reloadAll" />
    <SendTaskDialog
      v-model="taskDialogOpen"
      :douyin-id="douyinId"
      :task="editingTask"
      @saved="afterTaskSaved"
    />
  </section>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { ElMessage } from 'element-plus'
import { getDouyinAccount, getLoginStatus, setPolling, verifyLoginStatus } from '@/api/douyin'
import { ApiError, errorText } from '@/api/http'
import { getSchedulePreferences, listScheduleSlots, updateSchedulePreferences } from '@/api/schedule'
import { redeemCodeToDouyinAccount } from '@/api/redeemCodes'
import {
  listAccountRuns,
  listSendTasks,
  pauseSendTask,
  resumeSendTask,
  type SendRunQuery,
} from '@/api/sendTasks'
import type {
  DouyinAccount,
  LoginStatusResponse,
  SchedulePreferences,
  SendScheduleSlot,
  SendTask,
} from '@/api/types'
import LoginSessionDrawer from '@/components/LoginSessionDrawer.vue'
import SendRunRecordsPanel from '@/components/SendRunRecordsPanel.vue'
import SendTaskDialog from '@/components/SendTaskDialog.vue'
import { loginStateTag, loginStateText, runStatusText } from '@/utils/status'
import { formatBeijingTime } from '@/utils/time'

const props = defineProps<{ douyinId: string }>()

const account = ref<DouyinAccount | null>(null)
const loginStatus = ref<LoginStatusResponse | null>(null)
const schedulePreferences = ref<SchedulePreferences | null>(null)
const tasks = ref<SendTask[]>([])
const scheduleSlots = ref<SendScheduleSlot[]>([])
const loading = ref(false)
const tasksLoading = ref(false)
const verifying = ref(false)
const pollingSaving = ref(false)
const preferencesSaving = ref(false)
const redeeming = ref(false)
const loginDrawerOpen = ref(false)
const taskDialogOpen = ref(false)
const editingTask = ref<SendTask | null>(null)
const runsPanel = ref<InstanceType<typeof SendRunRecordsPanel> | null>(null)
const activeTab = ref('settings')
const redeemCode = ref('')
const runFilterFields: Array<'task_id' | 'slot_id' | 'error_code'> = [
  'task_id',
  'slot_id',
  'error_code',
]

const douyinId = props.douyinId

const runFilterOptions = computed(() => ({
  task_id: tasks.value.map((task) => ({
    value: task.id || task.task_id || '',
    label: task.id || task.task_id || '',
  })),
  slot_id: scheduleSlots.value.map((slot) => ({
    value: slot.id,
    label: slot.name ? `${slot.name} / ${slot.id}` : slot.id,
  })),
}))

const latestLoginCheckText = computed(() => {
  if (loginStatus.value?.last_checked_text) return loginStatus.value.last_checked_text
  const value = loginStatus.value?.last_checked_at || account.value?.last_check_at
  return value ? formatBeijingTime(value) : '未验证'
})

async function loadAccount() {
  loading.value = true
  try {
    account.value = await getDouyinAccount(douyinId)
    loginStatus.value = await getLoginStatus(douyinId)
    schedulePreferences.value = await getSchedulePreferences(douyinId)
  } catch (error) {
    ElMessage.error(errorText(error))
  } finally {
    loading.value = false
  }
}

async function changeAutoApplyNewSlots(value: string | number | boolean) {
  preferencesSaving.value = true
  try {
    schedulePreferences.value = await updateSchedulePreferences(douyinId, {
      auto_apply_new_slots: Boolean(value),
    })
    ElMessage.success(Boolean(value) ? '已开启自动加入新增轮次。' : '已关闭自动加入新增轮次。')
  } catch (error) {
    ElMessage.error(errorText(error))
    await loadAccount()
  } finally {
    preferencesSaving.value = false
  }
}

function entitlementText(currentAccount?: DouyinAccount | null) {
  const status = currentAccount?.polling_entitlement_status
  if (status === 'active' || status === 'valid') {
    return entitlementActiveText(currentAccount?.polling_eligible_until)
  }
  if (status === 'expired') return '已过期'
  return '未开通'
}

function entitlementActiveText(value?: string) {
  if (!value) return '已开通'
  const expiresAt = new Date(value)
  if (Number.isNaN(expiresAt.getTime())) return `有效至 ${value}`
  const diffMs = expiresAt.getTime() - Date.now()
  if (diffMs <= 0) return '已过期'
  const days = Math.ceil(diffMs / (24 * 60 * 60 * 1000))
  return `剩余 ${days} 天，有效至 ${formatBeijingTime(value)}`
}

function entitlementTag(status?: string) {
  if (status === 'active' || status === 'valid') return 'success'
  if (status === 'expired') return 'warning'
  return 'info'
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
          return `好友备注${targetRuleModeText(rule.mode)}：${rule.value || '-'}`
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

function targetRuleModeText(mode?: string) {
  const map: Record<string, string> = {
    prefix: '前缀',
    contains: '包含',
    exact: '精确',
  }
  return map[mode || ''] || '匹配'
}

function groupRuleModeText(mode?: string) {
  if (mode === 'contains_all') return '同时包含'
  if (mode === 'contains') return '任意包含'
  return '包含'
}

async function submitRedeemCode() {
  const code = redeemCode.value.trim()
  if (!code) {
    ElMessage.warning('请输入兑换码。')
    return
  }
  redeeming.value = true
  try {
    const redeemedAccount = await redeemCodeToDouyinAccount(douyinId, code)
    if (redeemedAccount) {
      account.value = { ...(account.value || { douyin_id: douyinId }), ...redeemedAccount }
    }
    redeemCode.value = ''
    ElMessage.success('兑换成功。')
    await loadAccount()
  } catch (error) {
    ElMessage.error(errorText(error))
  } finally {
    redeeming.value = false
  }
}

async function verifyStatus() {
  verifying.value = true
  try {
    loginStatus.value = await verifyLoginStatus(douyinId)
    ElMessage.success('登录状态验证完成。')
  } catch (error) {
    if (error instanceof ApiError && error.code === 'request_timeout') {
      ElMessage.warning('验证耗时较长，已尝试刷新最近登录状态。')
    } else {
      ElMessage.error(errorText(error))
    }
  } finally {
    await loadAccount()
    verifying.value = false
  }
}

async function changePolling(value: string | number | boolean) {
  pollingSaving.value = true
  try {
    await setPolling(douyinId, Boolean(value))
    await loadAccount()
    ElMessage.success(Boolean(value) ? '自动发送已开启。' : '自动发送已暂停。')
  } catch (error) {
    ElMessage.error(errorText(error))
    await loadAccount()
  } finally {
    pollingSaving.value = false
  }
}

async function loadTasks() {
  tasksLoading.value = true
  try {
    tasks.value = await listSendTasks(douyinId)
  } catch (error) {
    ElMessage.error(errorText(error))
  } finally {
    tasksLoading.value = false
  }
}

async function loadRunFilterSlots() {
  try {
    scheduleSlots.value = await listScheduleSlots()
  } catch (error) {
    ElMessage.error(errorText(error))
  }
}

async function loadRunRecords(query: SendRunQuery) {
  return listAccountRuns(douyinId, query)
}

async function afterTaskSaved() {
  await Promise.all([loadTasks(), runsPanel.value?.loadRuns()])
}

function openTaskDialog(task?: SendTask) {
  editingTask.value = task || null
  taskDialogOpen.value = true
}

async function pauseTask(task: SendTask) {
  const taskId = task.id || task.task_id
  if (!taskId) return
  try {
    await pauseSendTask(taskId)
    await loadTasks()
  } catch (error) {
    ElMessage.error(errorText(error))
  }
}

async function resumeTask(task: SendTask) {
  const taskId = task.id || task.task_id
  if (!taskId) return
  try {
    await resumeSendTask(taskId)
    await loadTasks()
  } catch (error) {
    ElMessage.error(errorText(error))
  }
}

async function reloadAll() {
  await Promise.all([loadAccount(), loadTasks(), loadRunFilterSlots(), runsPanel.value?.loadRuns()])
}

onMounted(reloadAll)
</script>

<style scoped>
.detail-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  justify-content: flex-end;
}

.settings-list {
  display: grid;
  gap: 0;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  overflow: hidden;
}

.setting-row {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(220px, 360px);
  gap: 18px;
  align-items: center;
  padding: 16px 18px;
  border-bottom: 1px solid #e5e7eb;
}

.setting-row:last-child {
  border-bottom: 0;
}

.setting-main {
  min-width: 0;
}

.setting-main p {
  margin: 6px 0 0;
  color: #6b7280;
  font-size: 13px;
  line-height: 1.7;
}

.setting-value {
  display: flex;
  min-width: 0;
  justify-content: flex-start;
}

.setting-time {
  color: #111827;
  font-size: 16px;
}

.last-check-tag {
  min-width: 132px;
  justify-content: center;
}

.setting-action-value {
  align-items: center;
  flex-wrap: wrap;
  gap: 10px;
}

.entitlement-value :deep(.el-tag) {
  height: auto;
  min-height: 32px;
  white-space: normal;
  line-height: 1.5;
}

.summary-label {
  margin-bottom: 8px;
  color: #6b7280;
  font-size: 15px;
  font-weight: 700;
}

.summary-alert {
  margin-top: 16px;
}

.redeem-box {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(280px, 420px);
  gap: 18px;
  align-items: end;
  margin-top: 16px;
  padding-top: 16px;
  border-top: 1px solid #e5e7eb;
}

.redeem-box p {
  margin: 6px 0 0;
  color: #6b7280;
  font-size: 13px;
  line-height: 1.7;
}

.redeem-form {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  gap: 10px;
}

.lower-panel {
  margin-top: 16px;
}

.detail-tabs :deep(.el-tabs__item) {
  font-size: 16px;
  font-weight: 700;
}

@media (max-width: 900px) {
  .setting-row {
    grid-template-columns: 1fr;
    gap: 10px;
  }

  .redeem-box,
  .redeem-form {
    grid-template-columns: 1fr;
  }
}
</style>
