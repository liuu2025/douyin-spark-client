<template>
  <section>
    <div class="page-header">
      <div>
        <h1 class="page-title">我的兑换码</h1>
        <p class="page-subtitle">兑换码可以转赠；未兑换码可复制后兑换到任意用户管理的抖音号。</p>
      </div>
      <el-button @click="loadCodes">刷新</el-button>
    </div>

    <div class="content-panel">
      <div class="panel-body">
        <el-table :data="codes" :loading="loading" empty-text="暂无兑换码">
          <el-table-column label="兑换码" min-width="220">
            <template #default="{ row }">
              <div class="code-cell">
                <strong>{{ displayCode(row) }}</strong>
                <el-button v-if="canCopy(row)" link type="primary" @click="copyCode(row)">复制</el-button>
              </div>
            </template>
          </el-table-column>
          <el-table-column label="类型" width="120">
            <template #default="{ row }">{{ codeTypeText(row) }}</template>
          </el-table-column>
          <el-table-column label="天数" width="90">
            <template #default="{ row }">{{ row.days ?? '-' }}</template>
          </el-table-column>
          <el-table-column label="状态" width="110">
            <template #default="{ row }">
              <el-tag :type="statusTag(row.status)">{{ statusText(row.status) }}</el-tag>
            </template>
          </el-table-column>
          <el-table-column label="兑换到抖音号" min-width="150">
            <template #default="{ row }">{{ row.redeemed_douyin_id || row.douyin_id || '-' }}</template>
          </el-table-column>
          <el-table-column label="兑换时间" min-width="180">
            <template #default="{ row }">{{ formatBeijingTime(row.redeemed_at) }}</template>
          </el-table-column>
          <el-table-column label="发放时间" min-width="180">
            <template #default="{ row }">{{ formatBeijingTime(row.created_at) }}</template>
          </el-table-column>
        </el-table>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { ElMessage } from 'element-plus'
import { errorText } from '@/api/http'
import { listMyRedeemCodes } from '@/api/redeemCodes'
import type { RedeemCode } from '@/api/types'
import { copyText } from '@/utils/clipboard'
import { formatBeijingTime } from '@/utils/time'

const codes = ref<RedeemCode[]>([])
const loading = ref(false)

function displayCode(code: RedeemCode) {
  return code.status === 'unused' ? code.code || code.masked_code || '-' : code.masked_code || code.code || '-'
}

function canCopy(code: RedeemCode) {
  return code.status === 'unused' && Boolean(code.code)
}

function codeTypeText(code: RedeemCode) {
  const type = code.type || code.code_type
  if (type === 'days') return '天数型'
  return type || '天数型'
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

async function copyCode(code: RedeemCode) {
  if (!code.code) return
  if (await copyText(code.code)) {
    ElMessage.success('兑换码已复制。')
    return
  }
  ElMessage.error('复制失败，请手动选中复制。')
}

async function loadCodes() {
  loading.value = true
  try {
    codes.value = await listMyRedeemCodes()
  } catch (error) {
    ElMessage.error(errorText(error))
  } finally {
    loading.value = false
  }
}

onMounted(loadCodes)
</script>

<style scoped>
.code-cell {
  display: flex;
  gap: 10px;
  align-items: center;
}
</style>
