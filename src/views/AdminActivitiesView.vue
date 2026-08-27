<template>
  <section>
    <div class="page-header">
      <div>
        <h1 class="page-title">活动管理</h1>
        <p class="page-subtitle">发布用户可自行领取兑换码的活动，并查看领取记录。</p>
      </div>
      <el-button type="primary" @click="openDialog()">新增活动</el-button>
    </div>

    <div class="content-panel">
      <div class="panel-body">
        <div class="toolbar">
          <div class="filter-row">
            <el-select v-model="filters.status" clearable placeholder="活动状态" style="width: 150px">
              <el-option label="草稿" value="draft" />
              <el-option label="已发布" value="published" />
              <el-option label="已暂停" value="paused" />
              <el-option label="已结束" value="ended" />
            </el-select>
            <el-button @click="loadActivities()">筛选</el-button>
          </div>
          <el-button :loading="loading" @click="loadActivities(true)">刷新</el-button>
        </div>

        <el-table class="desktop-only" :data="activities" v-loading="loading" height="clamp(280px, calc(100dvh - 250px), 620px)">
          <el-table-column prop="title" label="活动标题" min-width="180" fixed="left" />
          <el-table-column prop="description" label="说明" min-width="240" />
          <el-table-column label="状态" width="100">
            <template #default="{ row }">
              <el-tag :type="activityStatusTag(row.status)">{{ activityStatusText(row.status) }}</el-tag>
            </template>
          </el-table-column>
          <el-table-column prop="reward_days" label="奖励天数" width="100" />
          <el-table-column label="库存" width="100">
            <template #default="{ row }">{{ row.stock_total === 0 ? '不限量' : row.stock_total }}</template>
          </el-table-column>
          <el-table-column prop="claimed_count" label="已领取" width="90" />
          <el-table-column label="剩余" width="90">
            <template #default="{ row }">{{ row.stock_total === 0 ? '不限量' : row.remaining_count }}</template>
          </el-table-column>
          <el-table-column label="开始时间" min-width="170">
            <template #default="{ row }">{{ formatTime(row.starts_at) }}</template>
          </el-table-column>
          <el-table-column label="结束时间" min-width="170">
            <template #default="{ row }">{{ formatTime(row.ends_at) }}</template>
          </el-table-column>
          <el-table-column label="操作" width="250" fixed="right">
            <template #default="{ row }">
              <el-button link type="primary" @click="openDialog(row)">编辑</el-button>
              <el-button v-if="row.status !== 'published'" link type="success" @click="publish(row.id)">发布</el-button>
              <el-button v-if="row.status === 'published'" link type="warning" @click="pause(row.id)">暂停</el-button>
              <el-button v-if="row.status !== 'ended'" link type="danger" @click="end(row.id)">结束</el-button>
              <el-button link @click="openClaims(row)">领取记录</el-button>
            </template>
          </el-table-column>
        </el-table>

        <div v-loading="loading" class="mobile-only mobile-card-list">
          <article v-for="activity in activities" :key="activity.id" class="mobile-data-card">
            <div class="mobile-data-card__header">
              <strong>{{ activity.title }}</strong>
              <el-tag :type="activityStatusTag(activity.status)">{{ activityStatusText(activity.status) }}</el-tag>
            </div>
            <div class="mobile-data-card__body">
              <div class="mobile-data-row"><span>说明</span><span>{{ activity.description || '-' }}</span></div>
              <div class="mobile-data-row"><span>奖励天数</span><span>{{ activity.reward_days }}</span></div>
              <div class="mobile-data-row"><span>库存</span><span>{{ activity.stock_total === 0 ? '不限量' : activity.stock_total }}</span></div>
              <div class="mobile-data-row"><span>已领取</span><span>{{ activity.claimed_count }}</span></div>
              <div class="mobile-data-row"><span>剩余</span><span>{{ activity.stock_total === 0 ? '不限量' : activity.remaining_count }}</span></div>
              <div class="mobile-data-row"><span>开始时间</span><span>{{ formatTime(activity.starts_at) }}</span></div>
              <div class="mobile-data-row"><span>结束时间</span><span>{{ formatTime(activity.ends_at) }}</span></div>
            </div>
            <div class="mobile-data-card__footer activity-card-actions">
              <el-button @click="openDialog(activity)">编辑</el-button>
              <el-button v-if="activity.status !== 'published'" type="success" @click="publish(activity.id)">发布</el-button>
              <el-button v-if="activity.status === 'published'" type="warning" @click="pause(activity.id)">暂停</el-button>
              <el-button v-if="activity.status !== 'ended'" type="danger" @click="end(activity.id)">结束</el-button>
              <el-button @click="openClaims(activity)">领取记录</el-button>
            </div>
          </article>
          <div v-if="!loading && activities.length === 0" class="mobile-empty">暂无活动</div>
        </div>
      </div>
    </div>

    <el-dialog v-model="dialogOpen" :title="editingActivity ? '编辑活动' : '新增活动'" width="680px">
      <el-form :model="form" label-position="top">
        <el-form-item label="活动标题">
          <el-input v-model.trim="form.title" maxlength="80" show-word-limit placeholder="新用户福利" />
        </el-form-item>
        <el-form-item label="活动说明">
          <el-input
            v-model="form.description"
            type="textarea"
            :rows="3"
            maxlength="500"
            show-word-limit
            placeholder="每个账号可领取 7 天轮询资格兑换码。"
          />
        </el-form-item>
        <div class="form-grid">
          <el-form-item label="状态">
            <el-segmented v-model="form.status" :options="statusOptions" />
          </el-form-item>
          <el-form-item label="奖励天数">
            <el-input-number v-model="form.reward_days" :min="1" :step="1" />
          </el-form-item>
          <el-form-item label="库存">
            <el-input-number v-model="form.stock_total" :min="0" :step="1" />
            <p class="field-help">填 0 表示不限量。</p>
          </el-form-item>
        </div>
        <div class="form-grid two">
          <el-form-item label="开始时间">
            <el-date-picker
              v-model="form.starts_at"
              type="datetime"
              value-format="YYYY-MM-DDTHH:mm:ssZ"
              placeholder="选择开始时间"
            />
          </el-form-item>
          <el-form-item label="结束时间">
            <el-date-picker
              v-model="form.ends_at"
              type="datetime"
              value-format="YYYY-MM-DDTHH:mm:ssZ"
              placeholder="选择结束时间"
            />
          </el-form-item>
        </div>
      </el-form>
      <template #footer>
        <el-button @click="dialogOpen = false">取消</el-button>
        <el-button type="primary" :loading="saving" @click="save">保存</el-button>
      </template>
    </el-dialog>

    <el-drawer v-model="claimsOpen" title="活动领取记录" size="min(900px, 92vw)">
      <div class="claims-title" v-if="selectedActivity">
        <strong>{{ selectedActivity.title }}</strong>
        <span>{{ selectedActivity.claimed_count || 0 }} 人已领取</span>
      </div>
      <el-table class="desktop-only" :data="claims" v-loading="claimsLoading" height="clamp(260px, calc(100dvh - 150px), 620px)">
        <el-table-column prop="public_uid" label="账户 ID" min-width="110" fixed="left">
          <template #default="{ row }">{{ row.public_uid || '-' }}</template>
        </el-table-column>
        <el-table-column prop="nickname" label="昵称" min-width="120">
          <template #default="{ row }">{{ row.nickname || '-' }}</template>
        </el-table-column>
        <el-table-column label="兑换码" min-width="220">
          <template #default="{ row }">
            <div class="claim-code-cell">
              <span>{{ claimCode(row) }}</span>
              <el-button
                v-if="claimCode(row) !== '-'"
                link
                type="primary"
                @click="copyCode(claimCode(row))"
              >
                复制
              </el-button>
            </div>
          </template>
        </el-table-column>
        <el-table-column label="天数" width="90">
          <template #default="{ row }">{{ row.redeem_code_days || row.redeem_code?.days || '-' }}</template>
        </el-table-column>
        <el-table-column label="领取时间" min-width="170">
          <template #default="{ row }">{{ formatTime(row.created_at) }}</template>
        </el-table-column>
      </el-table>
      <div v-loading="claimsLoading" class="mobile-only mobile-card-list">
        <article v-for="claim in claims" :key="claim.id" class="mobile-data-card">
          <div class="mobile-data-card__header">
            <strong>{{ claim.nickname || claim.public_uid || '-' }}</strong>
            <span>{{ formatTime(claim.created_at) }}</span>
          </div>
          <div class="mobile-data-card__body">
            <div class="mobile-data-row"><span>账户 ID</span><span>{{ claim.public_uid || '-' }}</span></div>
            <div class="mobile-data-row"><span>兑换码</span><span>{{ claimCode(claim) }}</span></div>
            <div class="mobile-data-row"><span>天数</span><span>{{ claim.redeem_code_days || claim.redeem_code?.days || '-' }}</span></div>
          </div>
          <div v-if="claimCode(claim) !== '-'" class="mobile-data-card__footer">
            <el-button type="primary" @click="copyCode(claimCode(claim))">复制兑换码</el-button>
          </div>
        </article>
        <div v-if="!claimsLoading && claims.length === 0" class="mobile-empty">暂无领取记录</div>
      </div>
    </el-drawer>
  </section>
</template>

<script setup lang="ts">
import { onMounted, reactive, ref } from 'vue'
import { ElMessage } from 'element-plus'
import {
  createAdminActivity,
  endAdminActivity,
  listAdminActivities,
  listAdminActivityClaims,
  pauseAdminActivity,
  publishAdminActivity,
  updateAdminActivity,
} from '@/api/activities'
import { errorText } from '@/api/http'
import type { Activity, ActivityClaim } from '@/api/types'
import { copyText } from '@/utils/clipboard'
import { createCacheKey, readCache, writeCache } from '@/utils/cache'
import { formatBeijingTime } from '@/utils/time'

const statusOptions = [
  { label: '草稿', value: 'draft' },
  { label: '发布', value: 'published' },
  { label: '暂停', value: 'paused' },
  { label: '结束', value: 'ended' },
]

const activities = ref<Activity[]>([])
const claims = ref<ActivityClaim[]>([])
const selectedActivity = ref<Activity | null>(null)
const editingActivity = ref<Activity | null>(null)
const loading = ref(false)
const saving = ref(false)
const claimsLoading = ref(false)
const dialogOpen = ref(false)
const claimsOpen = ref(false)
const filters = reactive({
  status: '',
})
const ACTIVITIES_CACHE_TTL = 1000 * 45

function activitiesCacheKey() {
  return createCacheKey('admin-activities:list:v1', {
    status: filters.status || '',
  })
}
const form = reactive({
  title: '',
  description: '',
  status: 'draft',
  reward_days: 7,
  stock_total: 0,
  starts_at: '',
  ends_at: '',
})

onMounted(() => loadActivities())

async function loadActivities(force = false) {
  if (!force) {
    const cached = readCache<Activity[]>(activitiesCacheKey(), ACTIVITIES_CACHE_TTL)
    if (cached) {
      activities.value = cached
    }
    loading.value = !cached
  } else {
    loading.value = true
  }
  try {
    const data = await listAdminActivities({
      page: 1,
      page_size: 100,
      status: filters.status || undefined,
    })
    activities.value = data.items || []
    writeCache(activitiesCacheKey(), activities.value)
  } catch (error) {
    ElMessage.error(errorText(error))
  } finally {
    loading.value = false
  }
}

function openDialog(activity?: Activity) {
  editingActivity.value = activity || null
  form.title = activity?.title || ''
  form.description = activity?.description || ''
  form.status = activity?.status || 'draft'
  form.reward_days = activity?.reward_days || 7
  form.stock_total = activity?.stock_total || 0
  form.starts_at = activity?.starts_at || ''
  form.ends_at = activity?.ends_at || ''
  dialogOpen.value = true
}

async function save() {
  if (!form.title.trim()) {
    ElMessage.warning('请输入活动标题。')
    return
  }
  saving.value = true
  try {
    const payload = { ...form, title: form.title.trim() }
    if (editingActivity.value) {
      await updateAdminActivity(editingActivity.value.id, payload)
      ElMessage.success('活动已更新。')
    } else {
      await createAdminActivity(payload)
      ElMessage.success('活动已创建。')
    }
    dialogOpen.value = false
    await loadActivities(true)
  } catch (error) {
    ElMessage.error(errorText(error))
  } finally {
    saving.value = false
  }
}

async function publish(id: string) {
  await changeStatus(() => publishAdminActivity(id), '活动已发布。')
}

async function pause(id: string) {
  await changeStatus(() => pauseAdminActivity(id), '活动已暂停。')
}

async function end(id: string) {
  await changeStatus(() => endAdminActivity(id), '活动已结束。')
}

async function changeStatus(action: () => Promise<Activity>, message: string) {
  try {
    await action()
    ElMessage.success(message)
    await loadActivities(true)
  } catch (error) {
    ElMessage.error(errorText(error))
  }
}

async function openClaims(activity: Activity) {
  selectedActivity.value = activity
  claimsOpen.value = true
  claimsLoading.value = true
  try {
    claims.value = await listAdminActivityClaims(activity.id, 200)
  } catch (error) {
    ElMessage.error(errorText(error))
  } finally {
    claimsLoading.value = false
  }
}

async function copyCode(code: string) {
  if (await copyText(code)) {
    ElMessage.success('兑换码已复制。')
    return
  }
  ElMessage.error('复制失败，请手动选中复制。')
}

function claimCode(claim: ActivityClaim) {
  return claim.redeem_code?.code || claim.redeem_code?.masked_code || '-'
}

function formatTime(value?: string) {
  return formatBeijingTime(value)
}

function activityStatusText(status?: string) {
  const map: Record<string, string> = {
    draft: '草稿',
    published: '已发布',
    paused: '已暂停',
    ended: '已结束',
  }
  return status ? map[status] || status : '-'
}

function activityStatusTag(status?: string) {
  if (status === 'published') return 'success'
  if (status === 'paused') return 'warning'
  if (status === 'ended') return 'info'
  return ''
}
</script>

<style scoped>
.filter-row {
  display: flex;
  gap: 8px;
  align-items: center;
}

.form-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 14px;
}

.form-grid.two {
  grid-template-columns: repeat(2, minmax(0, 1fr));
}

.field-help {
  margin: 6px 0 0;
  color: #6b7280;
  font-size: 12px;
}

.claims-title {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 14px;
}

.claims-title span {
  color: #6b7280;
}

.claim-code-cell {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}

.claim-code-cell span {
  min-width: 0;
  word-break: break-all;
}

.activity-card-actions {
  flex-wrap: wrap;
}

@media (max-width: 860px) {
  .form-grid,
  .form-grid.two {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 640px) {
  .filter-row,
  .filter-row .el-select,
  .filter-row .el-button {
    width: 100%;
  }

  .filter-row {
    align-items: stretch;
    flex-direction: column;
  }
}
</style>
