<template>
  <section>
    <div class="page-header">
      <div>
        <h1 class="page-title">抖音号</h1>
        <p class="page-subtitle">这里只做账号选择，具体操作进入单个抖音号页面处理。</p>
      </div>
      <el-button type="primary" @click="loginDrawerOpen = true">添加抖音号</el-button>
    </div>

    <div class="content-panel">
      <div class="panel-body">
        <div class="toolbar">
          <strong class="section-title">抖音号列表</strong>
          <el-button @click="loadAccounts">刷新</el-button>
        </div>
        <el-table :data="accounts" :loading="loading" empty-text="还没有添加抖音号">
          <el-table-column prop="douyin_id" label="抖音号" min-width="160" />
          <el-table-column label="抖音昵称" min-width="160">
            <template #default="{ row }">{{ row.profile_nickname || '-' }}</template>
          </el-table-column>
          <el-table-column label="登录状态" width="150">
            <template #default="{ row }">
              <el-tag :type="loginStateTag(row.login_state)">
                {{ loginStateText(row.login_state) }}
              </el-tag>
            </template>
          </el-table-column>
          <el-table-column label="自动发送" width="130">
            <template #default="{ row }">
              <el-tag :type="enabledStatusTag(row.status)">
                {{ enabledStatusText(row.status) }}
              </el-tag>
            </template>
          </el-table-column>
          <el-table-column label="最近验证" min-width="180">
            <template #default="{ row }">{{ formatBeijingTime(row.last_check_at) }}</template>
          </el-table-column>
          <el-table-column prop="last_error_message" label="最近错误" min-width="220" />
          <el-table-column label="操作" width="120" fixed="right">
            <template #default="{ row }">
              <el-button type="primary" link @click="$router.push(`/douyin-accounts/${row.douyin_id}`)">
                进入
              </el-button>
            </template>
          </el-table-column>
        </el-table>
      </div>
    </div>

    <LoginSessionDrawer v-model="loginDrawerOpen" auto-start @completed="loadAccounts" />
  </section>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { ElMessage } from 'element-plus'
import { listDouyinAccounts } from '@/api/douyin'
import { errorText } from '@/api/http'
import type { DouyinAccount } from '@/api/types'
import LoginSessionDrawer from '@/components/LoginSessionDrawer.vue'
import { enabledStatusTag, enabledStatusText, loginStateTag, loginStateText } from '@/utils/status'
import { formatBeijingTime } from '@/utils/time'

const accounts = ref<DouyinAccount[]>([])
const loading = ref(false)
const loginDrawerOpen = ref(false)

async function loadAccounts() {
  loading.value = true
  try {
    accounts.value = await listDouyinAccounts()
  } catch (error) {
    ElMessage.error(errorText(error))
  } finally {
    loading.value = false
  }
}

onMounted(loadAccounts)
</script>

<style scoped>
.section-title {
  font-size: 16px;
  font-weight: 700;
}
</style>
