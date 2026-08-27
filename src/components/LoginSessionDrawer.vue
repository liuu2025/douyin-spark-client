<template>
  <el-drawer
    :model-value="modelValue"
    size="min(560px, 100vw)"
    :title="drawerTitle"
    :close-on-click-modal="false"
    :before-close="beforeClose"
    @close="handleClose"
  >
    <div v-if="!session" class="login-flow">
      <div class="method-header">
        <div class="method-title">选择登录方式</div>
        <p class="muted">选择后才会创建浏览器登录会话。</p>
      </div>

      <el-segmented v-model="loginMode" :options="loginModeOptions" class="mode-segmented" />

      <div class="method-detail">
        <QrCode v-if="loginMode === 'qr_sms'" :size="22" />
        <Monitor v-else :size="22" />
        <div>
          <strong class="mode-title-row">
            {{ selectedModeTitle }}
            <el-tag v-if="loginMode === 'qr_sms'" size="small" type="success" effect="plain">
              推荐
            </el-tag>
          </strong>
          <p>{{ selectedModeDescription }}</p>
        </div>
      </div>

      <div class="form-footer">
        <el-button type="primary" :loading="creating" @click="startSession">
          开始登录
        </el-button>
      </div>
    </div>

    <div v-else class="login-flow">
      <el-steps :active="activeStep" finish-status="success" simple>
        <el-step v-for="step in stepTitles" :key="step" :title="step" />
      </el-steps>

      <div class="session-box">
        <div class="session-status">{{ sessionStatusText(session.status) }}</div>
        <p class="muted">{{ statusDescription }}</p>
        <div class="elapsed-time" aria-live="polite">已开始 {{ formattedElapsed }}</div>
        <el-alert
          v-if="session.last_error_message"
          :type="session.status === 'remote_browser_required' ? 'warning' : 'error'"
          show-icon
          :closable="false"
          :title="session.last_error_message"
        />
      </div>

      <template v-if="loginMode === 'qr_sms'">
        <div v-if="showQRCode" class="qr-section">
          <div class="qr-frame" v-loading="qrLoading">
            <img v-if="qrObjectURL" :src="qrObjectURL" alt="抖音登录二维码" />
            <div v-else class="qr-placeholder">正在生成二维码</div>
          </div>
          <p v-if="qrError" class="qr-notice">二维码正在传输到前端，请不要关闭当前窗口。</p>
        </div>

        <div v-if="showSMSForm" class="sms-section">
          <div class="sms-heading">
            <strong>短信验证码</strong>
            <span>{{ session.masked_phone || '已绑定手机号' }}</span>
          </div>
          <el-input
            v-model="smsCode"
            class="sms-code-input"
            :class="{ 'is-ready': smsSubmitReady }"
            inputmode="numeric"
            maxlength="6"
            autocomplete="one-time-code"
            placeholder="请输入 6 位验证码"
            :disabled="smsCodePending || !canSubmitSMS"
            @input="normalizeSMSCode"
            @keyup.enter="submitSMSCode"
          >
            <template #append>
              <el-button
                class="sms-submit-button"
                :class="{ 'is-ready': smsSubmitReady }"
                :disabled="!smsSubmitReady"
                :loading="smsSubmitting"
                title="提交短信验证码"
                aria-label="提交短信验证码"
                @click="submitSMSCode"
              >
                <Send :size="16" />
              </el-button>
            </template>
          </el-input>
          <div
            v-if="smsCode.length > 0 && !smsCodeReady"
            class="sms-validation"
            role="status"
          >
            请输入完整的 6 位数字验证码（{{ smsCode.length }}/6）
          </div>
          <div class="sms-actions">
            <span v-if="smsCodePending" class="muted">验证码已提交，正在验证</span>
            <span v-else-if="resendRequested" class="muted">正在等待新验证码</span>
            <el-button
              v-if="canResendSMS"
              link
              type="primary"
              :disabled="resendRequested"
              :loading="resendingSMS"
              @click="resendSMSCode"
            >
              <RotateCw :size="15" />
              重新发送验证码
            </el-button>
          </div>
        </div>

        <el-alert
          v-if="session.status === 'remote_browser_required'"
          type="warning"
          show-icon
          :closable="false"
          title="抖音要求额外验证，请在远程浏览器中完成验证，完成后扫码流程会继续。"
        />
      </template>

      <template v-else>
        <el-alert
          v-if="session.status === 'login_confirming'"
          type="warning"
          show-icon
          :closable="false"
          title="请确认远程窗口里没有未处理的滑块、风控或保存登录信息弹窗。"
        />
      </template>

      <el-descriptions :column="1" border>
        <el-descriptions-item label="会话ID">{{ session.id }}</el-descriptions-item>
        <el-descriptions-item v-if="session.remote_status" label="远程状态">
          {{ session.remote_status }}
        </el-descriptions-item>
        <el-descriptions-item v-if="session.masked_phone" label="验证手机号">
          {{ session.masked_phone }}
        </el-descriptions-item>
        <el-descriptions-item label="过期时间">{{ formatBeijingTime(session.expires_at) }}</el-descriptions-item>
        <el-descriptions-item v-if="session.douyin_id || session.resolved_douyin_id" label="识别抖音号">
          {{ session.douyin_id || session.resolved_douyin_id }}
        </el-descriptions-item>
      </el-descriptions>

      <div class="form-footer">
        <el-button v-if="session.remote_url" @click="openRemote">
          <ExternalLink :size="16" />
          打开远程浏览器
        </el-button>
        <el-button
          v-if="session.status === 'login_confirming'"
          type="primary"
          :loading="acting"
          @click="confirmSession"
        >
          我已确认，完成登录
        </el-button>
        <el-button
          v-if="!isDone"
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
import { ExternalLink, Monitor, QrCode, RotateCw, Send } from 'lucide-vue-next'
import {
  cancelLoginSession,
  confirmLoginSession,
  createLoginSession,
  getLoginQRCode,
  getLoginSession,
  resendLoginSMSCode,
  submitLoginSMSCode,
} from '@/api/loginSessions'
import { errorText } from '@/api/http'
import type { LoginMode, LoginSession } from '@/api/types'
import { sessionStatusText } from '@/utils/status'
import { formatBeijingTime } from '@/utils/time'

const props = defineProps<{
  modelValue: boolean
}>()

const emit = defineEmits<{
  'update:modelValue': [value: boolean]
  completed: []
}>()

const loginModeOptions = [
  { label: '扫码登录', value: 'qr_sms' },
  { label: '远程浏览器', value: 'remote_browser' },
]

const loginMode = ref<LoginMode>('qr_sms')
const session = ref<LoginSession | null>(null)
const creating = ref(false)
const acting = ref(false)
const polling = ref(false)
const qrLoading = ref(false)
const qrObjectURL = ref('')
const qrError = ref('')
const smsCode = ref('')
const smsSubmitting = ref(false)
const smsCodePending = ref(false)
const resendingSMS = ref(false)
const resendRequested = ref(false)
let lastQRImageURL = ''
let completedEmitted = false
let pollTimer: number | undefined
let elapsedTimer: number | undefined
const elapsedSeconds = ref(0)
let startedAt = 0

const formattedElapsed = computed(() => {
  const minutes = Math.floor(elapsedSeconds.value / 60)
  const seconds = elapsedSeconds.value % 60
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
})

const drawerTitle = computed(() => {
  if (!session.value) return '登录抖音号'
  return loginMode.value === 'qr_sms' ? '扫码登录' : '远程浏览器登录'
})

const selectedModeTitle = computed(() =>
  loginMode.value === 'qr_sms' ? '扫码登录' : '远程浏览器登录',
)

const selectedModeDescription = computed(() =>
  loginMode.value === 'qr_sms'
    ? '前端显示后端生成的二维码；扫码后如需验证，可在这里提交短信验证码。'
    : '请在远程浏览器完成抖音号登录，并保存登录信息！保存登录信息可在左侧栏进入“我的”个人主页开启！',
)

const isDone = computed(() =>
  ['logged_in', 'cancelled', 'failed', 'timeout'].includes(session.value?.status || ''),
)

const stepTitles = computed(() =>
  loginMode.value === 'qr_sms'
    ? ['二维码', '扫码', '验证', '完成']
    : ['启动', '登录', '确认', '完成'],
)

const activeStep = computed(() => {
  const status = session.value?.status
  if (loginMode.value === 'qr_sms') {
    if (!qrObjectURL.value && ['created', 'waiting_qr_scan'].includes(status || '')) return 0
    if (status === 'waiting_qr_scan' || status === 'created') return 1
    if (
      ['waiting_sms_code', 'sms_code_invalid', 'sms_code_expired', 'sms_retry_later', 'remote_browser_required'].includes(
        status || '',
      )
    ) return 2
    if (status === 'finalizing') return 3
    if (status === 'logged_in') return 4
    return session.value ? 1 : 0
  }
  switch (status) {
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

const statusDescription = computed(() => {
  const status = session.value?.status
  const descriptions: Record<string, string> = {
    created: qrObjectURL.value
      ? '二维码已加载，请使用抖音 App 扫码。'
      : session.value?.qr_image_url
        ? '二维码正在传输到前端，请不要关闭当前窗口。'
        : '正在等待生成二维码，需长时间等待。',
    waiting_qr_scan: qrObjectURL.value
      ? '二维码已加载，请使用抖音 App 扫码。'
      : '二维码正在传输到前端，请不要关闭当前窗口。',
    waiting_sms_code: smsCodePending.value
      ? '验证码已提交，正在等待完成验证，请稍候。'
      : '扫码结果已收到，正在等待短信验证。',
    sms_code_invalid: '验证码未通过，请重新输入。',
    sms_code_expired: '验证码已过期，请重新发送。',
    sms_retry_later: '当前验证码不能继续使用，请重新发送。',
    remote_browser_required: '请在远程浏览器完成抖音号登录，并保存登录信息！保存登录信息可在左侧栏进入“我的”个人主页开启！',
    remote_browser_starting: '正在分配远程浏览器资源。',
    waiting_manual_login: '请在远程浏览器中完成抖音登录。',
    login_confirming: '已检测到登录成功，请确认远程页面没有未处理提示。',
    finalizing: '正在保存登录状态并识别抖音号。',
    logged_in: '抖音号登录已经完成。',
    cancelled: '登录会话已取消。',
    failed: '登录流程未能完成。',
    timeout: '登录会话已超时。',
  }
  return status ? descriptions[status] ?? sessionStatusText(status) : ''
})

const showQRCode = computed(() =>
  ['created', 'waiting_qr_scan'].includes(session.value?.status || ''),
)

const showSMSForm = computed(() =>
  ['waiting_sms_code', 'sms_code_invalid', 'sms_code_expired', 'sms_retry_later'].includes(
    session.value?.status || '',
  ),
)

const canSubmitSMS = computed(() =>
  ['waiting_sms_code', 'sms_code_invalid'].includes(session.value?.status || ''),
)

const canResendSMS = computed(() =>
  ['sms_code_expired', 'sms_retry_later'].includes(session.value?.status || ''),
)

const smsCodeReady = computed(() => /^\d{6}$/.test(smsCode.value))
const smsSubmitReady = computed(
  () => smsCodeReady.value && canSubmitSMS.value && !smsCodePending.value && !smsSubmitting.value,
)

watch(
  () => props.modelValue,
  (open) => {
    if (open && session.value && isDone.value) resetFlow()
    if (!open) {
      stopPolling()
      stopElapsedTimer()
    }
  },
)

async function startSession() {
  creating.value = true
  try {
    session.value = await createLoginSession(loginMode.value)
    completedEmitted = false
    startElapsedTimer()
    if (loginMode.value === 'remote_browser' && session.value.remote_url) openRemote()
    await refreshQRCode(session.value)
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
  void pollSession()
  pollTimer = window.setInterval(() => void pollSession(), 2500)
}

async function pollSession() {
  if (!session.value || isDone.value || polling.value) {
    if (isDone.value) stopPolling()
    return
  }
  polling.value = true
  try {
    const previousStatus = session.value.status
    const next = await getLoginSession(session.value.id)
    session.value = next
    if (next.status !== previousStatus) {
      smsCodePending.value = false
      resendRequested.value = false
    }
    await refreshQRCode(next)
    if (isDone.value) stopElapsedTimer()
    if (next.status === 'logged_in' && !completedEmitted) {
      completedEmitted = true
      ElMessage.success('抖音号登录完成。')
      emit('completed')
      stopPolling()
      stopElapsedTimer()
    }
  } catch (error) {
    ElMessage.error(errorText(error))
  } finally {
    polling.value = false
  }
}

async function refreshQRCode(current: LoginSession) {
  if (loginMode.value !== 'qr_sms' || !current.qr_image_url || current.qr_image_url === lastQRImageURL) return
  const imageURL = current.qr_image_url
  qrLoading.value = true
  qrError.value = ''
  try {
    const blob = await getLoginQRCode(imageURL)
    if (session.value?.qr_image_url !== imageURL) return
    revokeQRCode()
    qrObjectURL.value = URL.createObjectURL(blob)
    lastQRImageURL = imageURL
  } catch (error) {
    qrError.value = errorText(error)
  } finally {
    qrLoading.value = false
  }
}

function normalizeSMSCode(value: string) {
  smsCode.value = value.replace(/\D/g, '').slice(0, 6)
}

async function submitSMSCode() {
  if (!session.value || !smsSubmitReady.value) return
  smsSubmitting.value = true
  try {
    await submitLoginSMSCode(session.value.id, smsCode.value)
    smsCodePending.value = true
    smsCode.value = ''
    ElMessage.success('验证码已提交。')
  } catch (error) {
    ElMessage.error(errorText(error))
  } finally {
    smsSubmitting.value = false
  }
}

async function resendSMSCode() {
  if (!session.value || !canResendSMS.value || resendRequested.value) return
  resendingSMS.value = true
  try {
    await resendLoginSMSCode(session.value.id)
    smsCodePending.value = false
    resendRequested.value = true
    smsCode.value = ''
    ElMessage.success('已请求重新发送验证码。')
  } catch (error) {
    ElMessage.error(errorText(error))
  } finally {
    resendingSMS.value = false
  }
}

function stopPolling() {
  if (pollTimer) {
    window.clearInterval(pollTimer)
    pollTimer = undefined
  }
}

function startElapsedTimer() {
  stopElapsedTimer()
  startedAt = Date.now()
  elapsedSeconds.value = 0
  elapsedTimer = window.setInterval(() => {
    elapsedSeconds.value = Math.max(0, Math.floor((Date.now() - startedAt) / 1000))
  }, 1000)
}

function stopElapsedTimer() {
  if (elapsedTimer) {
    window.clearInterval(elapsedTimer)
    elapsedTimer = undefined
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
    stopElapsedTimer()
    ElMessage.info('已取消登录会话。')
  } catch (error) {
    ElMessage.error(errorText(error))
  } finally {
    acting.value = false
  }
}

function resetFlow() {
  stopPolling()
  stopElapsedTimer()
  revokeQRCode()
  session.value = null
  loginMode.value = 'qr_sms'
  qrError.value = ''
  smsCode.value = ''
  smsCodePending.value = false
  resendRequested.value = false
  completedEmitted = false
}

function revokeQRCode() {
  if (qrObjectURL.value) URL.revokeObjectURL(qrObjectURL.value)
  qrObjectURL.value = ''
  lastQRImageURL = ''
}

function handleClose() {
  if (!session.value || isDone.value) resetFlow()
  emit('update:modelValue', false)
}

function beforeClose(done: () => void) {
  if (session.value && !isDone.value) {
    ElMessage.warning('登录会话仍在进行中，请先点击“取消登录”释放浏览器资源。')
    return
  }
  done()
}

onBeforeUnmount(() => {
  stopPolling()
  stopElapsedTimer()
  revokeQRCode()
})
</script>

<style scoped>
.login-flow {
  display: flex;
  flex-direction: column;
  gap: 18px;
}

.method-header p,
.method-detail p {
  margin: 6px 0 0;
  line-height: 1.6;
}

.method-title {
  color: var(--app-text);
  font-size: 18px;
  font-weight: 700;
}

.mode-segmented {
  width: 100%;
}

.method-detail {
  display: grid;
  grid-template-columns: 24px minmax(0, 1fr);
  gap: 12px;
  align-items: start;
  padding: 16px 0;
  border-top: 1px solid var(--app-border);
  border-bottom: 1px solid var(--app-border);
  min-height: 136px;
}

.mode-title-row {
  display: inline-flex;
  align-items: center;
  gap: 8px;
}

.session-box {
  padding: 16px;
  border: 1px solid var(--app-border);
  border-radius: 8px;
  background: var(--app-surface-soft);
}

.session-box p {
  margin: 8px 0 0;
  line-height: 1.6;
}

.session-box .el-alert {
  margin-top: 12px;
}

.session-status {
  color: var(--app-text);
  font-size: 18px;
  font-weight: 700;
}

.elapsed-time {
  margin-top: 10px;
  color: var(--app-text-muted);
  font-size: 13px;
  font-variant-numeric: tabular-nums;
}

.qr-section {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10px;
}

.qr-frame {
  display: grid;
  place-items: center;
  width: min(100%, 340px);
  aspect-ratio: 1;
  overflow: hidden;
  border: 1px solid var(--app-border);
  border-radius: 8px;
  background: #ffffff;
}

.qr-frame img {
  display: block;
  width: 100%;
  height: 100%;
  object-fit: contain;
}

.qr-placeholder {
  color: #6b7280;
  font-size: 14px;
}

.qr-notice {
  margin: 0;
  color: var(--app-text-muted);
  font-size: 13px;
}

.sms-section {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.sms-heading,
.sms-actions,
.form-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.sms-heading span {
  color: var(--app-text-muted);
  font-size: 13px;
}

.sms-actions {
  min-height: 24px;
  font-size: 13px;
}

.sms-validation {
  margin-top: -6px;
  color: var(--app-danger);
  font-size: 12px;
}

.sms-code-input :deep(.el-input-group__append) {
  padding: 0;
  overflow: hidden;
  transition: background-color 160ms ease, border-color 160ms ease;
}

.sms-code-input :deep(.sms-submit-button) {
  width: 58px;
  height: 38px;
  margin: 0;
  border: 0;
  border-radius: 0;
  color: var(--app-text-muted);
  background: transparent;
}

.sms-code-input.is-ready :deep(.el-input__wrapper) {
  box-shadow: 0 0 0 1px var(--el-color-primary) inset;
}

.sms-code-input.is-ready :deep(.el-input-group__append) {
  border-color: var(--el-color-primary);
  background: var(--el-color-primary);
}

.sms-code-input :deep(.sms-submit-button.is-ready) {
  color: #ffffff;
  background: var(--el-color-primary);
}

.sms-code-input :deep(.sms-submit-button.is-ready:hover),
.sms-code-input :deep(.sms-submit-button.is-ready:focus-visible) {
  color: #ffffff;
  background: var(--el-color-primary-light-3);
}

.form-footer {
  justify-content: flex-end;
  flex-wrap: wrap;
}

@media (max-width: 640px) {
  .method-detail {
    min-height: 176px;
  }

  .qr-frame {
    width: min(100%, 300px);
  }

  .form-footer {
    align-items: stretch;
  }

  .form-footer .el-button {
    margin-left: 0;
    width: 100%;
  }
}
</style>
