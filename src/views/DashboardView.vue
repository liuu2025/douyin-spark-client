<template>
  <section>
    <div class="page-header">
      <div>
        <h1 class="page-title">仪表盘</h1>
        <p class="page-subtitle">查看全局状态和需要处理的抖音号事项。</p>
      </div>
      <el-button type="primary" @click="loginDrawerOpen = true">添加抖音号</el-button>
    </div>

    <div class="status-grid">
      <div class="metric">
        <div class="metric-label">已管理抖音号</div>
        <div class="metric-value">{{ accounts.length }}</div>
      </div>
      <div class="metric">
        <div class="metric-label">登录状态异常</div>
        <div class="metric-value">{{ needAttention.length }}</div>
      </div>
      <div class="metric">
        <div class="metric-label">自动发送开启</div>
        <div class="metric-value">{{ activeAccounts.length }}</div>
      </div>
    </div>

    <div class="content-panel">
      <div class="panel-body">
        <div class="toolbar">
          <div>
            <strong>待处理事项</strong>
            <div class="muted">优先处理登录失效、登录文件缺失或账号不匹配的抖音号。</div>
          </div>
          <el-button @click="loadAccounts">刷新</el-button>
        </div>
        <el-table :data="needAttention" :loading="loading" empty-text="暂无待处理事项">
          <el-table-column prop="douyin_id" label="抖音号" min-width="150" />
          <el-table-column label="登录状态" min-width="130">
            <template #default="{ row }">
              <el-tag :type="loginStateTag(row.login_state)">
                {{ loginStateText(row.login_state) }}
              </el-tag>
            </template>
          </el-table-column>
          <el-table-column prop="last_error_message" label="最近错误" min-width="220" />
          <el-table-column label="操作" width="150">
            <template #default="{ row }">
              <el-button link type="primary" @click="$router.push(`/douyin-accounts/${row.douyin_id}`)">
                进入处理
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
import { computed, onMounted, ref } from 'vue'
import { ElMessage } from 'element-plus'
import { listDouyinAccounts } from '@/api/douyin'
import { errorText } from '@/api/http'
import type { DouyinAccount, LoginState } from '@/api/types'
import LoginSessionDrawer from '@/components/LoginSessionDrawer.vue'
import { loginStateTag, loginStateText } from '@/utils/status'

const accounts = ref<DouyinAccount[]>([])
const loading = ref(false)
const loginDrawerOpen = ref(false)

const needAttention = computed(() =>
  accounts.value.filter((item) => {
    const state = item.login_state as LoginState | undefined
    return state && state !== 'ok' && state !== 'not_checked'
  }),
)
const activeAccounts = computed(() => accounts.value.filter((item) => item.status === 'active'))

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
