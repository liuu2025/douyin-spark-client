<template>
  <section>
    <div class="page-header">
      <div>
        <h1 class="page-title">账户管理</h1>
        <p class="page-subtitle">查看控制台账户、账户名下抖音号和兑换码，并管理普通用户启用状态。</p>
      </div>
      <el-button @click="loadUsers">刷新</el-button>
    </div>

    <div class="content-panel">
      <div class="panel-body">
        <div class="toolbar user-toolbar">
          <div class="filter-row">
            <el-input v-model.trim="filters.public_uid" clearable placeholder="账户 ID" />
            <el-input v-model.trim="filters.nickname" clearable placeholder="昵称" />
            <el-input v-model.trim="filters.qq_email" clearable placeholder="QQ 邮箱" />
            <el-select v-model="filters.role" clearable placeholder="角色">
              <el-option label="普通用户" value="normal" />
              <el-option label="管理员" value="admin" />
            </el-select>
            <el-select v-model="filters.status" clearable placeholder="状态">
              <el-option label="启用" value="active" />
              <el-option label="禁用" value="disabled" />
            </el-select>
            <el-button type="primary" @click="search">筛选</el-button>
          </div>
        </div>

        <el-table :data="users" v-loading="loading" height="560" @row-click="openDetail">
          <el-table-column prop="public_uid" label="账户 ID" min-width="110" fixed="left" />
          <el-table-column prop="nickname" label="昵称" min-width="130" />
          <el-table-column prop="qq_email" label="QQ 邮箱" min-width="180">
            <template #default="{ row }">{{ row.qq_email || '-' }}</template>
          </el-table-column>
          <el-table-column label="角色" width="100">
            <template #default="{ row }">{{ roleText(row.role) }}</template>
          </el-table-column>
          <el-table-column label="状态" width="100">
            <template #default="{ row }">
              <el-tag :type="row.status === 'active' ? 'success' : 'info'">
                {{ statusText(row.status) }}
              </el-tag>
            </template>
          </el-table-column>
          <el-table-column prop="douyin_account_count" label="抖音号数量" width="110" />
          <el-table-column prop="send_task_count" label="发送任务" width="100" />
          <el-table-column prop="redeem_code_count" label="兑换码" width="90" />
          <el-table-column label="创建时间" min-width="170">
            <template #default="{ row }">{{ formatBeijingTime(row.created_at) }}</template>
          </el-table-column>
          <el-table-column label="更新时间" min-width="170">
            <template #default="{ row }">{{ formatBeijingTime(row.updated_at) }}</template>
          </el-table-column>
          <el-table-column label="操作" width="150" fixed="right">
            <template #default="{ row }">
              <el-button link type="primary" @click.stop="openDetail(row)">详情</el-button>
              <el-button
                v-if="canChangeStatus(row)"
                link
                :type="row.status === 'disabled' ? 'success' : 'danger'"
                :loading="statusChangingUid === row.public_uid"
                @click.stop="changeUserStatus(row)"
              >
                {{ row.status === 'disabled' ? '启用' : '禁用' }}
              </el-button>
            </template>
          </el-table-column>
        </el-table>

      </div>
    </div>

    <el-drawer
      v-model="detailOpen"
      title="账户详情"
      size="calc(100vw - 320px)"
      class="admin-user-detail-drawer"
    >
      <div v-if="detail" class="detail-layout">
        <section class="detail-section">
          <div class="detail-section-header">
            <h2>账户信息</h2>
            <el-button
              v-if="canChangeStatus(detail.user)"
              :type="detail.user.status === 'disabled' ? 'success' : 'danger'"
              :loading="statusChangingUid === detail.user.public_uid"
              @click="changeUserStatus(detail.user)"
            >
              {{ detail.user.status === 'disabled' ? '启用账户' : '禁用账户' }}
            </el-button>
          </div>
          <el-descriptions :column="2" border>
            <el-descriptions-item label="账户 ID">{{ detail.user.public_uid }}</el-descriptions-item>
            <el-descriptions-item label="昵称">{{ detail.user.nickname || '-' }}</el-descriptions-item>
            <el-descriptions-item label="QQ 邮箱">{{ detail.user.qq_email || '-' }}</el-descriptions-item>
            <el-descriptions-item label="角色">{{ roleText(detail.user.role) }}</el-descriptions-item>
            <el-descriptions-item label="状态">{{ statusText(detail.user.status) }}</el-descriptions-item>
            <el-descriptions-item label="抖音号数量">{{ detail.user.douyin_account_count || 0 }}</el-descriptions-item>
            <el-descriptions-item label="发送任务数量">{{ detail.user.send_task_count || 0 }}</el-descriptions-item>
            <el-descriptions-item label="兑换码数量">{{ detail.user.redeem_code_count || 0 }}</el-descriptions-item>
            <el-descriptions-item label="创建时间">{{ formatBeijingTime(detail.user.created_at) }}</el-descriptions-item>
            <el-descriptions-item label="更新时间">{{ formatBeijingTime(detail.user.updated_at) }}</el-descriptions-item>
          </el-descriptions>
        </section>

        <section class="detail-section">
          <h2>该账户管理的抖音号</h2>
          <el-table :data="detail.douyin_accounts" height="300">
            <el-table-column prop="douyin_id" label="抖音号" min-width="140" fixed="left" />
            <el-table-column label="状态" width="90">
              <template #default="{ row }">{{ statusText(row.status) }}</template>
            </el-table-column>
            <el-table-column label="登录态" min-width="110">
              <template #default="{ row }">{{ loginStateText(row.login_state) }}</template>
            </el-table-column>
            <el-table-column label="运行状态" min-width="110">
              <template #default="{ row }">{{ runnerStateText(row.runner_state) }}</template>
            </el-table-column>
            <el-table-column label="自动加入新增轮次" min-width="140">
              <template #default="{ row }">{{ row.auto_apply_new_slots ? '已开启' : '未开启' }}</template>
            </el-table-column>
            <el-table-column label="轮询资格" min-width="110">
              <template #default="{ row }">{{ entitlementStatusText(row.polling_entitlement_status) }}</template>
            </el-table-column>
            <el-table-column label="资格有效期" min-width="180">
              <template #default="{ row }">{{ formatBeijingTime(row.polling_eligible_until) }}</template>
            </el-table-column>
            <el-table-column label="最近登录状态验证" min-width="180">
              <template #default="{ row }">{{ formatBeijingTime(row.last_check_at) }}</template>
            </el-table-column>
            <el-table-column label="操作" width="100" fixed="right">
              <template #default="{ row }">
                <el-button link type="primary" @click="copyDouyinId(row.douyin_id)">
                  复制抖音号
                </el-button>
              </template>
            </el-table-column>
          </el-table>
        </section>

        <section class="detail-section">
          <h2>兑换码</h2>
          <el-table :data="detail.redeem_codes" height="300">
            <el-table-column label="兑换码" min-width="160" fixed="left">
              <template #default="{ row }">{{ row.code || row.masked_code || '-' }}</template>
            </el-table-column>
            <el-table-column label="类型" width="100">
              <template #default="{ row }">{{ row.type || row.code_type || '-' }}</template>
            </el-table-column>
            <el-table-column prop="days" label="天数" width="80" />
            <el-table-column label="状态" width="100">
              <template #default="{ row }">{{ redeemStatusText(row.status) }}</template>
            </el-table-column>
            <el-table-column prop="redeemed_douyin_id" label="兑换到抖音号" min-width="140" />
            <el-table-column label="兑换时间" min-width="170">
              <template #default="{ row }">{{ formatBeijingTime(row.redeemed_at) }}</template>
            </el-table-column>
            <el-table-column label="禁用时间" min-width="170">
              <template #default="{ row }">{{ formatBeijingTime(row.disabled_at) }}</template>
            </el-table-column>
            <el-table-column label="创建时间" min-width="170">
              <template #default="{ row }">{{ formatBeijingTime(row.created_at) }}</template>
            </el-table-column>
          </el-table>
        </section>
      </div>
      <div v-else v-loading="detailLoading" class="detail-loading" />
    </el-drawer>
  </section>
</template>

<script setup lang="ts">
import { onMounted, reactive, ref } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { getAdminUser, listAdminUsers, updateAdminUserStatus } from '@/api/adminUsers'
import { errorText } from '@/api/http'
import type { AdminUserDetail, AdminUserSummary } from '@/api/types'
import { copyText } from '@/utils/clipboard'
import { loginStateText } from '@/utils/status'
import { formatBeijingTime } from '@/utils/time'

const users = ref<AdminUserSummary[]>([])
const detail = ref<AdminUserDetail | null>(null)
const loading = ref(false)
const detailLoading = ref(false)
const detailOpen = ref(false)
const statusChangingUid = ref('')
const pageSize = 100
const filters = reactive({
  public_uid: '',
  nickname: '',
  qq_email: '',
  role: '',
  status: '',
})

onMounted(loadUsers)

async function loadUsers() {
  loading.value = true
  try {
    const data = await listAdminUsers({
      page: 1,
      page_size: pageSize,
      public_uid: filters.public_uid || undefined,
      nickname: filters.nickname || undefined,
      qq_email: filters.qq_email || undefined,
      role: filters.role || undefined,
      status: filters.status || undefined,
    })
    users.value = data.items || []
  } catch (error) {
    ElMessage.error(errorText(error))
  } finally {
    loading.value = false
  }
}

async function search() {
  await loadUsers()
}

async function openDetail(user: AdminUserSummary) {
  detailOpen.value = true
  detail.value = null
  detailLoading.value = true
  try {
    detail.value = await getAdminUser(user.public_uid)
  } catch (error) {
    ElMessage.error(errorText(error))
  } finally {
    detailLoading.value = false
  }
}

function canChangeStatus(user: AdminUserSummary) {
  return user.role !== 'admin'
}

async function changeUserStatus(user: AdminUserSummary) {
  if (!canChangeStatus(user)) {
    ElMessage.warning('不能禁用管理员账户。')
    return
  }
  const nextStatus = user.status === 'disabled' ? 'active' : 'disabled'
  const actionText = nextStatus === 'disabled' ? '禁用' : '启用'
  try {
    await ElMessageBox.confirm(
      `确定要${actionText}账户 ${user.public_uid} 吗？`,
      `${actionText}账户`,
      {
        confirmButtonText: actionText,
        cancelButtonText: '取消',
        type: nextStatus === 'disabled' ? 'warning' : 'info',
      },
    )
  } catch {
    return
  }

  statusChangingUid.value = user.public_uid
  try {
    const updatedUser = await updateAdminUserStatus(user.public_uid, nextStatus)
    applyUpdatedUser(updatedUser)
    ElMessage.success(`账户已${actionText}。`)
  } catch (error) {
    ElMessage.error(errorText(error))
  } finally {
    statusChangingUid.value = ''
  }
}

function applyUpdatedUser(updatedUser: AdminUserSummary) {
  const index = users.value.findIndex((item) => item.public_uid === updatedUser.public_uid)
  if (index >= 0) {
    users.value[index] = { ...users.value[index], ...updatedUser }
  }
  if (detail.value?.user.public_uid === updatedUser.public_uid) {
    detail.value.user = { ...detail.value.user, ...updatedUser }
  }
}

function roleText(role?: string) {
  return role === 'admin' ? '管理员' : '普通用户'
}

function statusText(status?: string) {
  return status === 'disabled' ? '已禁用' : '已启用'
}

function redeemStatusText(status?: string) {
  if (status === 'redeemed') return '已兑换'
  if (status === 'disabled') return '已禁用'
  if (status === 'expired') return '已过期'
  return '未兑换'
}

function runnerStateText(state?: string) {
  const map: Record<string, string> = {
    idle: '空闲',
    running: '运行中',
    sending: '发送中',
    checking: '验证中',
    paused: '已暂停',
    stopped: '已停止',
    failed: '异常',
  }
  return state ? map[state] || state : '-'
}

function entitlementStatusText(status?: string) {
  const map: Record<string, string> = {
    active: '有效',
    valid: '有效',
    expired: '已过期',
    none: '未开通',
    inactive: '未开通',
    disabled: '已禁用',
  }
  return status ? map[status] || status : '未开通'
}

async function copyDouyinId(douyinId?: string) {
  if (!douyinId) {
    ElMessage.warning('没有可复制的抖音号。')
    return
  }
  if (await copyText(douyinId)) {
    ElMessage.success('抖音号已复制。')
    return
  }
  ElMessage.error('复制失败，请手动选中复制。')
}
</script>

<style scoped>
.user-toolbar {
  align-items: flex-start;
}

.filter-row {
  display: grid;
  grid-template-columns: 120px 140px 180px 120px 120px auto;
  gap: 8px;
}

.detail-layout {
  display: grid;
  gap: 22px;
}

.detail-section {
  display: grid;
  gap: 12px;
}

.detail-section h2 {
  margin: 0;
  color: #111827;
  font-size: 17px;
}

.detail-section-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.detail-loading {
  min-height: 320px;
}

:deep(.admin-user-detail-drawer.el-drawer) {
  min-width: 1180px;
  max-width: calc(100vw - 300px);
}

@media (max-width: 980px) {
  .filter-row {
    grid-template-columns: 1fr;
  }

  :deep(.admin-user-detail-drawer.el-drawer) {
    min-width: 0;
    max-width: 96vw;
    width: 96vw !important;
  }
}
</style>
