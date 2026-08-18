<template>
  <section>
    <div class="page-header">
      <div>
        <h1 class="page-title">活动广场</h1>
        <p class="page-subtitle">领取管理员发布的轮询资格兑换码活动，每个账号每个活动限领一次。</p>
      </div>
      <el-button :loading="loading" @click="loadAll">刷新</el-button>
    </div>

    <div class="activity-layout">
      <main class="activity-list" v-loading="loading">
        <article v-for="activity in activities" :key="activity.id" class="activity-card">
          <div class="activity-main">
            <div>
              <div class="activity-title-row">
                <h2>{{ activity.title }}</h2>
                <el-tag :type="claimTag(activity.claim_status)">
                  {{ claimStatusText(activity.claim_status) }}
                </el-tag>
              </div>
              <p class="activity-description">{{ activity.description || '暂无活动说明' }}</p>
            </div>
            <el-button
              type="primary"
              :disabled="activity.claim_status !== 'available'"
              :loading="claimingId === activity.id"
              @click="claim(activity)"
            >
              {{ claimButtonText(activity.claim_status) }}
            </el-button>
          </div>

          <div class="activity-meta">
            <div>
              <strong>{{ activity.reward_days }}</strong>
              <span>奖励天数</span>
            </div>
            <div>
              <strong>{{ stockText(activity) }}</strong>
              <span>剩余库存</span>
            </div>
            <div>
              <strong>{{ activity.claimed_count || 0 }}</strong>
              <span>已领取</span>
            </div>
            <div>
              <strong>{{ formatTime(activity.ends_at) }}</strong>
              <span>结束时间</span>
            </div>
          </div>
        </article>
        <el-empty v-if="activities.length === 0 && !loading" description="暂无可领取活动" />
      </main>

      <aside class="claims-panel">
        <div class="panel-title-row">
          <strong>我的领取记录</strong>
          <el-button link type="primary" @click="loadClaims">刷新</el-button>
        </div>
        <div class="claims-list" v-loading="claimsLoading">
          <div v-for="claimItem in claims" :key="claimItem.id" class="claim-item">
            <div class="claim-code-row">
              <strong>{{ claimCode(claimItem) }}</strong>
              <el-button
                v-if="claimCode(claimItem) !== '-'"
                link
                type="primary"
                @click="copyCode(claimCode(claimItem))"
              >
                复制
              </el-button>
            </div>
            <span>{{ claimItem.redeem_code_days || claimItem.redeem_code?.days || '-' }} 天</span>
            <small>{{ formatTime(claimItem.created_at) }}</small>
          </div>
          <el-empty v-if="claims.length === 0 && !claimsLoading" description="暂无领取记录" />
        </div>
      </aside>
    </div>

    <el-dialog v-model="claimDialogOpen" title="领取成功" width="520px">
      <div class="claim-success">
        <p>兑换码已生成，并已加入“我的兑换码”。</p>
        <div class="code-box">{{ claimedCode?.code || claimedCode?.masked_code || '-' }}</div>
        <p class="muted">可复制后到抖音号详情页兑换轮询资格。</p>
      </div>
      <template #footer>
        <el-button @click="claimDialogOpen = false">关闭</el-button>
        <el-button type="primary" @click="copyClaimedCode">复制兑换码</el-button>
      </template>
    </el-dialog>
  </section>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { ElMessage } from 'element-plus'
import { claimActivity, listActivities, listMyActivityClaims } from '@/api/activities'
import { errorText } from '@/api/http'
import type { Activity, ActivityClaim, RedeemCode } from '@/api/types'
import { createCacheKey, readCache, writeCache } from '@/utils/cache'
import { copyText } from '@/utils/clipboard'
import { formatBeijingTime } from '@/utils/time'

const activities = ref<Activity[]>([])
const claims = ref<ActivityClaim[]>([])
const claimedCode = ref<RedeemCode | null>(null)
const loading = ref(false)
const claimsLoading = ref(false)
const claimingId = ref('')
const claimDialogOpen = ref(false)
const ACTIVITIES_CACHE_TTL = 1000 * 60 * 2
const CLAIMS_CACHE_TTL = 1000 * 60

function activitiesCacheKey() {
  return 'activities:list:v1'
}

function claimsCacheKey() {
  return 'activities:claims:v1'
}

onMounted(loadAll)

async function loadAll(force = false) {
  await Promise.all([loadActivities(force), loadClaims(force)])
}

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
    const data = await listActivities({ page: 1, page_size: 100 })
    activities.value = data.items || []
    writeCache(activitiesCacheKey(), activities.value)
  } catch (error) {
    ElMessage.error(errorText(error))
  } finally {
    loading.value = false
  }
}

async function loadClaims(force = false) {
  if (!force) {
    const cached = readCache<ActivityClaim[]>(claimsCacheKey(), CLAIMS_CACHE_TTL)
    if (cached) {
      claims.value = cached
    }
    claimsLoading.value = !cached
  } else {
    claimsLoading.value = true
  }
  try {
    claims.value = await listMyActivityClaims()
    writeCache(claimsCacheKey(), claims.value)
  } catch (error) {
    ElMessage.error(errorText(error))
  } finally {
    claimsLoading.value = false
  }
}

async function claim(activity: Activity) {
  claimingId.value = activity.id
  try {
    const result = await claimActivity(activity.id)
    claimedCode.value = result.code || result.claim.redeem_code || null
    claimDialogOpen.value = true
    ElMessage.success('活动奖励领取成功。')
    await loadAll(true)
  } catch (error) {
    ElMessage.error(errorText(error))
  } finally {
    claimingId.value = ''
  }
}

async function copyClaimedCode() {
  const code = claimedCode.value?.code
  if (!code) {
    ElMessage.warning('没有可复制的兑换码。')
    return
  }
  if (await copyText(code)) {
    ElMessage.success('兑换码已复制。')
    return
  }
  ElMessage.error('复制失败，请手动选中复制。')
}

async function copyCode(code: string) {
  if (await copyText(code)) {
    ElMessage.success('兑换码已复制。')
    return
  }
  ElMessage.error('复制失败，请手动选中复制。')
}

function claimCode(claimItem: ActivityClaim) {
  return claimItem.redeem_code?.code || claimItem.redeem_code?.masked_code || '-'
}

function claimStatusText(status?: string) {
  const map: Record<string, string> = {
    available: '可领取',
    claimed: '已领取',
    not_started: '未开始',
    ended: '已结束',
    paused: '已暂停',
    out_of_stock: '已领完',
  }
  return status ? map[status] || status : '可领取'
}

function claimButtonText(status?: string) {
  if (status === 'claimed') return '已领取'
  if (status === 'not_started') return '未开始'
  if (status === 'ended') return '已结束'
  if (status === 'paused') return '已暂停'
  if (status === 'out_of_stock') return '已领完'
  return '领取兑换码'
}

function claimTag(status?: string) {
  if (status === 'available') return 'success'
  if (status === 'claimed') return 'info'
  if (status === 'not_started') return 'warning'
  return 'danger'
}

function stockText(activity: Activity) {
  if (activity.stock_total === 0) return '不限量'
  return String(activity.remaining_count ?? Math.max(0, activity.stock_total - activity.claimed_count))
}

function formatTime(value?: string) {
  return formatBeijingTime(value)
}
</script>

<style scoped>
.activity-layout {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 320px;
  gap: 18px;
}

.activity-list,
.claims-panel {
  min-height: 560px;
  max-height: calc(100vh - 150px);
  overflow-y: auto;
}

.activity-card {
  display: grid;
  gap: 16px;
  padding: 18px;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  background: #ffffff;
}

.activity-card + .activity-card {
  margin-top: 12px;
}

.activity-main {
  display: flex;
  justify-content: space-between;
  gap: 18px;
  align-items: flex-start;
}

.activity-title-row {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  align-items: center;
}

.activity-title-row h2 {
  margin: 0;
  color: #111827;
  font-size: 20px;
}

.activity-description {
  margin: 8px 0 0;
  color: #4b5563;
  line-height: 1.6;
}

.activity-meta {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 10px;
}

.activity-meta div {
  display: grid;
  gap: 4px;
  padding: 10px;
  border-radius: 6px;
  background: #f9fafb;
}

.activity-meta strong {
  color: #111827;
  font-size: 18px;
}

.activity-meta span,
.muted {
  color: #6b7280;
  font-size: 12px;
}

.claims-panel {
  padding: 14px;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  background: #ffffff;
}

.panel-title-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 10px;
}

.claims-list {
  display: grid;
  gap: 8px;
}

.claim-item {
  display: grid;
  gap: 5px;
  padding: 10px;
  border: 1px solid #e5e7eb;
  border-radius: 6px;
  background: #f9fafb;
}

.claim-code-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}

.claim-code-row strong {
  min-width: 0;
  word-break: break-all;
}

.claim-item span,
.claim-item small {
  color: #6b7280;
  font-size: 12px;
}

.claim-success {
  display: grid;
  gap: 10px;
}

.code-box {
  padding: 12px;
  border: 1px solid #dbeafe;
  border-radius: 6px;
  background: #eff6ff;
  color: #111827;
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
  font-weight: 700;
  word-break: break-all;
}

@media (max-width: 980px) {
  .activity-layout {
    grid-template-columns: 1fr;
  }

  .activity-meta {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}
</style>
