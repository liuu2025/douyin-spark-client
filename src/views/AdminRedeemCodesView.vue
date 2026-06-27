<template>
  <section>
    <div class="page-header">
      <div>
        <h1 class="page-title">兑换码管理</h1>
        <p class="page-subtitle">管理员生成轮询资格兑换码，可禁用未兑换的码；已兑换码不能撤回。</p>
      </div>
      <el-button type="primary" @click="dialogOpen = true">生成兑换码</el-button>
    </div>

    <div class="content-panel">
      <div class="panel-body">
        <div class="toolbar redeem-toolbar">
          <div class="toolbar-left">
            <strong>兑换码列表</strong>
            <el-select v-model="statusFilter" placeholder="状态" clearable class="filter-select">
              <el-option label="未兑换" value="unused" />
              <el-option label="已兑换" value="redeemed" />
              <el-option label="已禁用" value="disabled" />
            </el-select>
            <el-input
              v-model.trim="keyword"
              clearable
              class="keyword-input"
              placeholder="搜索兑换码/账户ID/抖音号"
            />
          </div>
          <div class="toolbar-actions">
            <el-button @click="copyUnusedCodes">复制未兑换码</el-button>
            <el-button @click="loadCodes">刷新</el-button>
          </div>
        </div>
        <el-table
          :data="filteredCodes"
          :loading="loading"
          empty-text="暂无兑换码"
          height="calc(100vh - 360px)"
        >
          <el-table-column label="兑换码" min-width="190">
            <template #default="{ row }">
              <div class="code-cell">
                <strong>{{ row.code || row.masked_code || '-' }}</strong>
                <el-button v-if="row.code" link type="primary" @click="copyOneCode(row)">复制</el-button>
              </div>
            </template>
          </el-table-column>
          <el-table-column label="绑定账户ID" width="110">
            <template #default="{ row }">{{ assignedUserText(row) }}</template>
          </el-table-column>
          <el-table-column label="类型" width="110">
            <template #default="{ row }">{{ codeTypeText(row) }}</template>
          </el-table-column>
          <el-table-column prop="days" label="天数" width="80" />
          <el-table-column label="状态" width="110">
            <template #default="{ row }">
              <el-tag :type="statusTag(row.status)">{{ statusText(row.status) }}</el-tag>
            </template>
          </el-table-column>
          <el-table-column label="兑换到抖音号" min-width="150">
            <template #default="{ row }">{{ row.redeemed_douyin_id || row.douyin_id || '-' }}</template>
          </el-table-column>
          <el-table-column label="兑换时间" min-width="170">
            <template #default="{ row }">{{ formatBeijingTime(row.redeemed_at) }}</template>
          </el-table-column>
          <el-table-column label="操作" width="110" fixed="right">
            <template #default="{ row }">
              <el-button
                v-if="row.status === 'unused'"
                link
                type="danger"
                @click="disableCode(row)"
              >
                禁用
              </el-button>
              <span v-else class="muted-text">-</span>
            </template>
          </el-table-column>
        </el-table>
      </div>
    </div>

    <el-dialog v-model="dialogOpen" title="生成兑换码" width="440px">
      <el-form :model="form" label-position="top">
        <el-form-item label="绑定账户ID">
          <el-input
            v-model.trim="form.assigned_public_uid"
            clearable
            placeholder="可为空；例如 100001"
          />
        </el-form-item>
        <el-form-item label="兑换码类型">
          <el-tag>天数型轮询资格码</el-tag>
        </el-form-item>
        <el-form-item label="有效天数">
          <el-input-number v-model="form.days" :min="1" :step="1" />
        </el-form-item>
        <el-form-item label="生成数量">
          <el-input-number v-model="form.count" :min="1" :max="100" :step="1" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="dialogOpen = false">取消</el-button>
        <el-button type="primary" :loading="creating" @click="createCodes">生成</el-button>
      </template>
    </el-dialog>
  </section>
</template>

<script setup lang="ts">
import { computed, reactive, ref, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import {
  createAdminRedeemCodes,
  disableAdminRedeemCode,
  listAdminRedeemCodes,
} from '@/api/redeemCodes'
import { errorText } from '@/api/http'
import type { RedeemCode } from '@/api/types'
import { copyText } from '@/utils/clipboard'
import { formatBeijingTime } from '@/utils/time'

const codes = ref<RedeemCode[]>([])
const loading = ref(false)
const creating = ref(false)
const dialogOpen = ref(false)
const statusFilter = ref('')
const keyword = ref('')
const form = reactive({
  assigned_public_uid: '',
  days: 30,
  count: 1,
})

const filteredCodes = computed(() => {
  const key = keyword.value.toLowerCase()
  return codes.value.filter((code) => {
    if (statusFilter.value && code.status !== statusFilter.value) return false
    if (!key) return true
    const haystack = [
      code.code,
      code.masked_code,
      assignedUserText(code),
      code.redeemed_douyin_id,
      code.douyin_id,
    ]
      .filter(Boolean)
      .join(' ')
      .toLowerCase()
    return haystack.includes(key)
  })
})

function codeId(code: RedeemCode) {
  return code.id || code.code_id || ''
}

function statusText(status: string) {
  const map: Record<string, string> = {
    unused: '未兑换',
    redeemed: '已兑换',
    disabled: '已禁用',
    expired: '已过期',
  }
  return map[status] || status || '-'
}

function statusTag(status: string) {
  if (status === 'unused') return 'success'
  if (status === 'redeemed') return 'info'
  if (status === 'disabled') return 'danger'
  return 'warning'
}

function codeTypeText(code: RedeemCode) {
  const type = code.type || code.code_type
  if (type === 'days') return '天数型'
  return type || '天数型'
}

function assignedUserText(code: RedeemCode) {
  return code.assigned_public_uid || code.target_public_uid || code.owner_public_uid || '-'
}

async function copyOneCode(code: RedeemCode) {
  if (!code.code) return
  if (await copyText(code.code)) {
    ElMessage.success('兑换码已复制。')
    return
  }
  ElMessage.error('复制失败，请手动选中复制。')
}

async function copyUnusedCodes() {
  const text = filteredCodes.value
    .filter((code) => code.status === 'unused' && code.code)
    .map((code) => code.code)
    .join('\n')
  if (!text) {
    ElMessage.warning('当前筛选条件下没有可复制的未兑换码。')
    return
  }
  if (await copyText(text)) {
    ElMessage.success('未兑换码已复制。')
    return
  }
  ElMessage.error('复制失败，请手动选中复制。')
}

async function loadCodes() {
  loading.value = true
  try {
    codes.value = await listAdminRedeemCodes()
  } catch (error) {
    ElMessage.error(errorText(error))
  } finally {
    loading.value = false
  }
}

async function createCodes() {
  if (!form.days || !form.count) {
    ElMessage.warning('请填写完整生成信息。')
    return
  }
  creating.value = true
  try {
    await createAdminRedeemCodes({
      assigned_public_uid: form.assigned_public_uid || undefined,
      days: form.days,
      count: form.count,
    })
    dialogOpen.value = false
    ElMessage.success('兑换码已生成。')
    await loadCodes()
  } catch (error) {
    ElMessage.error(errorText(error))
  } finally {
    creating.value = false
  }
}

async function disableCode(code: RedeemCode) {
  const id = codeId(code)
  if (!id) return
  try {
    await ElMessageBox.confirm('确定禁用这个未兑换码吗？', '禁用兑换码', {
      confirmButtonText: '禁用',
      cancelButtonText: '取消',
      type: 'warning',
    })
    await disableAdminRedeemCode(id)
    ElMessage.success('兑换码已禁用。')
    await loadCodes()
  } catch (error) {
    if (error !== 'cancel' && error !== 'close') {
      ElMessage.error(errorText(error))
    }
  }
}

onMounted(loadCodes)
</script>

<style scoped>
.muted-text {
  color: #9ca3af;
}

.redeem-toolbar,
.toolbar-left,
.toolbar-actions,
.code-cell {
  display: flex;
  gap: 10px;
  align-items: center;
}

.redeem-toolbar {
  justify-content: space-between;
}

.toolbar-left {
  flex-wrap: wrap;
}

.filter-select {
  width: 120px;
}

.keyword-input {
  width: 260px;
}
</style>
