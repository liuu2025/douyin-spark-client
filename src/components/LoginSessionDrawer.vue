<template>
  <el-drawer
    :model-value="modelValue"
    size="520px"
    title="远程浏览器登录"
    :close-on-click-modal="false"
    :before-close="beforeClose"
    @close="handleClose"
  >
    <div class="login-flow">
      <el-steps :active="activeStep" finish-status="success" simple>
        <el-step title="启动" />
        <el-step title="登录" />
        <el-step title="确认" />
        <el-step title="完成" />
      </el-steps>

      <div class="session-box">
        <div class="session-status">{{ sessionStatusText(session?.status) }}</div>
        <p class="muted">
          新增或重新登录抖音号时，请在远程浏览器里完成扫码、滑块、风控、短信验证码和保存登录信息。
        </p>
        <el-alert
          v-if="session?.status === 'login_confirming'"
          type="warning"
          show-icon
          :closable="false"
          title="请确认远程窗口里没有未处理的滑块、风控或保存登录信息弹窗。"
        />
        <el-alert
          v-if="session?.last_error_message"
          type="error"
          show-icon
          :closable="false"
          :title="session.last_error_message"
        />
      </div>

      <el-descriptions v-if="session" :column="1" border>
        <el-descriptions-item label="会话ID">{{ session.id }}</el-descriptions-item>
        <el-descriptions-item label="远程状态">{{ session.remote_status || '-' }}</el-descriptions-item>
        <el-descriptions-item label="过期时间">{{ formatBeijingTime(session.expires_at) }}</el-descriptions-item>
        <el-descriptions-item v-if="session.douyin_id || session.resolved_douyin_id" label="识别抖音号">
          {{ session.douyin_id || session.resolved_douyin_id }}
        </el-descriptions-item>
      </el-descriptions>

      <div class="form-footer">
        <el-button v-if="!session" type="primary" :loading="creating" @click="startSession">
          创建登录会话
        </el-button>
        <el-button
          v-if="session?.remote_url"
          @click="openRemote"
        >
          打开远程浏览器
        </el-button>
        <el-button
          v-if="session?.status === 'login_confirming'"
          type="primary"
          :loading="acting"
          @click="confirmSession"
        >
          我已确认，完成登录
        </el-button>
        <el-button
          v-if="session && !isDone"
          type="danger"
          :loading="acting"
          @click="cancelSession"
        >
          取消登录
        </el-button>
      </div>
    </div>
  </el-drawer>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, ref, watch } from 'vue'
import { ElMessage } from 'element-plus'
import {
  cancelLoginSession,
  confirmLoginSession,
  createLoginSession,
  getLoginSession,
} from '@/api/loginSessions'
import { errorText } from '@/api/http'
import type { LoginSession } from '@/api/types'
import { sessionStatusText } from '@/utils/status'
import { formatBeijingTime } from '@/utils/time'

const props = defineProps<{
  modelValue: boolean
  autoStart?: boolean
}>()

const emit = defineEmits<{
  'update:modelValue': [value: boolean]
  completed: []
}>()

const session = ref<LoginSession | null>(null)
const creating = ref(false)
const acting = ref(false)
let timer: number | undefined

const isDone = computed(() =>
  ['logged_in', 'cancelled', 'failed', 'timeout'].includes(session.value?.status || ''),
)

const activeStep = computed(() => {
  switch (session.value?.status) {
    case 'remote_browser_starting':
      return 1
    case 'waiting_manual_login':
      return 2
    case 'login_confirming':
    case 'finalizing':
      return 3
    case 'logged_in':
      return 4
    default:
      return session.value ? 1 : 0
  }
})

watch(
  () => props.modelValue,
  (open) => {
    if (open && props.autoStart && !session.value) {
      void startSession()
    }
    if (!open) {
      stopPolling()
    }
  },
)

async function startSession() {
  creating.value = true
  try {
    session.value = await createLoginSession()
    if (session.value.remote_url) openRemote()
    startPolling()
  } catch (error) {
    ElMessage.error(errorText(error))
  } finally {
    creating.value = false
  }
}

function openRemote() {
  if (!session.value?.remote_url) return
  window.open(session.value.remote_url, '_blank', 'noopener,noreferrer')
}

function startPolling() {
  stopPolling()
  timer = window.setInterval(async () => {
    if (!session.value || isDone.value) {
      stopPolling()
      return
    }
    try {
      session.value = await getLoginSession(session.value.id)
      if (session.value.status === 'logged_in') {
        ElMessage.success('抖音号登录完成。')
        emit('completed')
        stopPolling()
      }
    } catch (error) {
      ElMessage.error(errorText(error))
    }
  }, 2500)
}

function stopPolling() {
  if (timer) {
    window.clearInterval(timer)
    timer = undefined
  }
}

async function confirmSession() {
  if (!session.value) return
  acting.value = true
  try {
    session.value = await confirmLoginSession(session.value.id)
    startPolling()
  } catch (error) {
    ElMessage.error(errorText(error))
  } finally {
    acting.value = false
  }
}

async function cancelSession() {
  if (!session.value) return
  acting.value = true
  try {
    session.value = await cancelLoginSession(session.value.id)
    stopPolling()
    ElMessage.info('已取消登录会话。')
    emit('completed')
  } catch (error) {
    ElMessage.error(errorText(error))
  } finally {
    acting.value = false
  }
}

function handleClose() {
  emit('update:modelValue', false)
}

function beforeClose(done: () => void) {
  if (session.value && !isDone.value) {
    ElMessage.warning('登录会话仍在进行中，请先点击“取消登录”释放远程资源。')
    return
  }
  done()
}

onBeforeUnmount(stopPolling)
</script>

<style scoped>
.login-flow {
  display: flex;
  flex-direction: column;
  gap: 18px;
}

.session-box {
  padding: 16px;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  background: #f9fafb;
}

.session-status {
  margin-bottom: 8px;
  color: #111827;
  font-size: 18px;
  font-weight: 700;
}

:global(:root.dark) .session-box {
  border-color: var(--app-border);
  background: var(--app-surface-soft);
}

:global(:root.dark) .session-status {
  color: var(--app-text);
}
</style>
