<template>
  <main class="login-page">
    <section class="login-panel">
      <div class="login-copy">
        <img class="login-logo" src="@/assets/douyin-icon.svg" alt="抖音" />
        <h1>douyin-spark</h1>
        <p>管理抖音自动发送消息任务。</p>
      </div>

      <div class="auth-card">
        <el-tabs v-model="activeTab">
          <el-tab-pane label="登录" name="login">
            <el-form :model="loginForm" label-position="top" @submit.prevent>
              <el-form-item label="登录方式">
                <el-segmented
                  v-model="loginForm.mode"
                  :options="[
                    { label: '账户ID登录', value: 'account' },
                    { label: 'QQ邮箱登录', value: 'qq_email' },
                  ]"
                />
              </el-form-item>
              <el-form-item :label="loginForm.mode === 'account' ? '账户ID' : 'QQ邮箱'">
                <div
                  :class="[
                    'email-complete-field',
                    { 'is-email-mode': loginForm.mode === 'qq_email' },
                  ]"
                >
                  <el-input
                    v-model.trim="loginForm.identifier"
                    :type="loginForm.mode === 'qq_email' ? 'email' : 'text'"
                    :spellcheck="false"
                    autocapitalize="off"
                    :autocomplete="loginForm.mode === 'qq_email' ? 'email' : 'username'"
                    :inputmode="loginForm.mode === 'qq_email' ? 'email' : 'text'"
                    :placeholder="
                      loginForm.mode === 'account'
                        ? '请输入您的账户ID'
                        : '请输入您的 QQ 邮箱'
                    "
                    size="large"
                    @keydown.tab="handleLoginEmailTab"
                  />
                  <span
                    v-if="loginForm.mode === 'qq_email' && emailCompletionHint(loginForm.identifier)"
                    class="email-complete-hint"
                    aria-hidden="true"
                  >
                    <span class="email-complete-spacer">{{ loginForm.identifier }}</span>
                    <span>{{ emailCompletionHint(loginForm.identifier) }}</span>
                  </span>
                </div>
              </el-form-item>
              <el-form-item label="密码">
                <el-input
                  v-model="loginForm.password"
                  type="password"
                  show-password
                  size="large"
                  placeholder="请输入密码"
                  autocomplete="current-password"
                  @keyup.enter="submitLogin"
                />
              </el-form-item>
              <el-button
                type="primary"
                size="large"
                class="full-button"
                :loading="auth.loading"
                @click="submitLogin"
              >
                登录
              </el-button>
              <div class="auth-footer">
                <el-button link type="primary" @click="activeTab = 'register'">
                  注册
                </el-button>
                <el-button link type="primary" @click="activeTab = 'forgot'">
                  忘记密码？
                </el-button>
              </div>
            </el-form>
          </el-tab-pane>

          <el-tab-pane label="用户注册" name="register">
            <el-form :model="registerForm" label-position="top" @submit.prevent>
              <el-form-item label="QQ邮箱">
                <div class="code-row">
                  <div class="email-complete-field">
                    <el-input
                      v-model.trim="registerForm.qqEmail"
                      type="email"
                      :spellcheck="false"
                      autocapitalize="off"
                      autocomplete="email"
                      inputmode="email"
                      size="large"
                      placeholder="请输入您的 QQ 邮箱"
                      @keydown.tab="handleRegisterEmailTab"
                    />
                    <span
                      v-if="emailCompletionHint(registerForm.qqEmail)"
                      class="email-complete-hint"
                      aria-hidden="true"
                    >
                      <span class="email-complete-spacer">{{ registerForm.qqEmail }}</span>
                      <span>{{ emailCompletionHint(registerForm.qqEmail) }}</span>
                    </span>
                  </div>
                  <el-button size="large" :loading="codeLoading" @click="sendRegisterCode">
                    发送验证码
                  </el-button>
                </div>
              </el-form-item>
              <el-form-item label="验证码">
                <el-input v-model.trim="registerForm.code" size="large" placeholder="6位验证码" />
              </el-form-item>
              <el-form-item label="密码">
                <el-input
                  v-model="registerForm.password"
                  type="password"
                  show-password
                  size="large"
                  placeholder="请输入注册密码"
                  autocomplete="new-password"
                />
                <div class="field-hint">
                  6-20 位；至少包含 1 个数字和 1 个非数字字符；可用大小写字母、数字、英文点号 .、下划线 _、短横线 -。
                </div>
              </el-form-item>
              <el-button
                type="primary"
                size="large"
                class="full-button"
                :loading="auth.loading"
                @click="submitRegister"
              >
                注册并登录
              </el-button>
              <div class="auth-footer">
                <el-button link type="primary" @click="activeTab = 'login'">
                  返回登录
                </el-button>
              </div>
            </el-form>
          </el-tab-pane>

          <el-tab-pane label="忘记密码" name="forgot">
            <el-form :model="resetForm" label-position="top" @submit.prevent>
              <el-form-item label="QQ邮箱">
                <div class="code-row">
                  <div class="email-complete-field">
                    <el-input
                      v-model.trim="resetForm.qqEmail"
                      type="email"
                      :spellcheck="false"
                      autocapitalize="off"
                      autocomplete="email"
                      inputmode="email"
                      size="large"
                      placeholder="请输入您的 QQ 邮箱"
                      @keydown.tab="handleResetEmailTab"
                    />
                    <span
                      v-if="emailCompletionHint(resetForm.qqEmail)"
                      class="email-complete-hint"
                      aria-hidden="true"
                    >
                      <span class="email-complete-spacer">{{ resetForm.qqEmail }}</span>
                      <span>{{ emailCompletionHint(resetForm.qqEmail) }}</span>
                    </span>
                  </div>
                  <el-button size="large" :loading="resetCodeLoading" @click="sendResetCode">
                    发送验证码
                  </el-button>
                </div>
              </el-form-item>
              <el-form-item label="验证码">
                <el-input v-model.trim="resetForm.code" size="large" placeholder="6位验证码" />
              </el-form-item>
              <el-form-item label="新密码">
                <el-input
                  v-model="resetForm.newPassword"
                  type="password"
                  show-password
                  size="large"
                  placeholder="请输入新密码"
                  autocomplete="new-password"
                  @keyup.enter="submitResetPassword"
                />
                <div class="field-hint">
                  6-20 位；至少包含 1 个数字和 1 个非数字字符；可用大小写字母、数字、英文点号 .、下划线 _、短横线 -。
                </div>
              </el-form-item>
              <el-button
                type="primary"
                size="large"
                class="full-button"
                :loading="resetSubmitting"
                @click="submitResetPassword"
              >
                重置密码
              </el-button>
              <div class="auth-footer">
                <el-button link type="primary" @click="activeTab = 'login'">
                  返回登录
                </el-button>
              </div>
            </el-form>
          </el-tab-pane>
        </el-tabs>
      </div>
    </section>
  </main>
</template>

<script setup lang="ts">
import { reactive, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { requestRegisterCode, requestResetPasswordCode, resetPassword } from '@/api/account'
import { errorText } from '@/api/http'
import { useAuthStore } from '@/stores/auth'

const router = useRouter()
const auth = useAuthStore()

const activeTab = ref('login')
const codeLoading = ref(false)
const resetCodeLoading = ref(false)
const resetSubmitting = ref(false)
const loginForm = reactive({
  mode: 'account' as 'account' | 'qq_email',
  identifier: '',
  password: '',
})
const registerForm = reactive({
  qqEmail: '',
  code: '',
  password: '',
})
const resetForm = reactive({
  qqEmail: '',
  code: '',
  newPassword: '',
})

const qqEmailSuffix = '@qq.com'
const qqEmailDomain = 'qq.com'

watch(
  () => loginForm.mode,
  () => {
    loginForm.identifier = ''
  },
)

function completedQQEmail(value: string) {
  const trimmed = value.trim()
  if (!trimmed) {
    return trimmed
  }
  const atIndex = trimmed.indexOf('@')
  if (atIndex === -1) {
    return `${trimmed}${qqEmailSuffix}`
  }
  const localPart = trimmed.slice(0, atIndex)
  const domainPart = trimmed.slice(atIndex + 1)
  if (!localPart || !qqEmailDomain.startsWith(domainPart.toLowerCase())) {
    return trimmed
  }
  return `${localPart}${qqEmailSuffix}`
}

function emailCompletionHint(value: string) {
  const trimmed = value.trim()
  if (!trimmed) {
    return ''
  }
  const completed = completedQQEmail(trimmed)
  if (completed === trimmed) {
    return ''
  }
  return completed.slice(trimmed.length)
}

function completeEmailWithTab(event: KeyboardEvent, updateValue: (value: string) => void, value: string) {
  const completed = completedQQEmail(value)
  if (completed === value.trim()) {
    return
  }
  event.preventDefault()
  updateValue(completed)
}

function handleLoginEmailTab(event: KeyboardEvent) {
  if (loginForm.mode !== 'qq_email') {
    return
  }
  completeEmailWithTab(event, (value) => {
    loginForm.identifier = value
  }, loginForm.identifier)
}

function handleRegisterEmailTab(event: KeyboardEvent) {
  completeEmailWithTab(event, (value) => {
    registerForm.qqEmail = value
  }, registerForm.qqEmail)
}

function handleResetEmailTab(event: KeyboardEvent) {
  completeEmailWithTab(event, (value) => {
    resetForm.qqEmail = value
  }, resetForm.qqEmail)
}

async function submitLogin() {
  if (!loginForm.identifier || !loginForm.password) {
    ElMessage.warning('请输入登录信息。')
    return
  }
  try {
    await auth.login({
      mode: loginForm.mode,
      identifier: loginForm.identifier,
      password: loginForm.password,
    })
    ElMessage.success('登录成功。')
    await router.push('/dashboard')
  } catch (error) {
    ElMessage.error(`登录失败：${errorText(error)}`)
  }
}

async function sendRegisterCode() {
  if (!registerForm.qqEmail) {
    ElMessage.warning('请输入 QQ 邮箱。')
    return
  }
  codeLoading.value = true
  try {
    await requestRegisterCode(registerForm.qqEmail)
    ElMessage.success('验证码已发送。')
  } catch (error) {
    ElMessage.error(errorText(error))
  } finally {
    codeLoading.value = false
  }
}

async function submitRegister() {
  if (!registerForm.qqEmail || !registerForm.code || !registerForm.password) {
    ElMessage.warning('请完整填写注册信息。')
    return
  }
  try {
    await auth.register({
      qqEmail: registerForm.qqEmail,
      code: registerForm.code,
      password: registerForm.password,
    })
    ElMessage.success('注册成功，已自动登录。')
    await router.push('/dashboard')
  } catch (error) {
    ElMessage.error(`注册失败：${errorText(error)}`)
  }
}

async function sendResetCode() {
  if (!resetForm.qqEmail) {
    ElMessage.warning('请输入 QQ 邮箱。')
    return
  }
  resetCodeLoading.value = true
  try {
    await requestResetPasswordCode(resetForm.qqEmail)
    ElMessage.success('重置密码验证码已发送。')
  } catch (error) {
    ElMessage.error(errorText(error))
  } finally {
    resetCodeLoading.value = false
  }
}

async function submitResetPassword() {
  if (!resetForm.qqEmail || !resetForm.code || !resetForm.newPassword) {
    ElMessage.warning('请完整填写重置密码信息。')
    return
  }
  resetSubmitting.value = true
  try {
    await resetPassword({
      qqEmail: resetForm.qqEmail,
      code: resetForm.code,
      newPassword: resetForm.newPassword,
    })
    ElMessage.success('密码已重置，请使用新密码登录。')
    loginForm.mode = 'qq_email'
    loginForm.identifier = resetForm.qqEmail
    loginForm.password = ''
    activeTab.value = 'login'
  } catch (error) {
    ElMessage.error(errorText(error))
  } finally {
    resetSubmitting.value = false
  }
}
</script>

<style scoped>
.login-page {
  display: grid;
  min-height: 100vh;
  min-height: 100dvh;
  place-items: center;
  padding: 28px;
  background:
    linear-gradient(180deg, rgba(255, 255, 255, 0.72), rgba(245, 247, 251, 0.95)),
    #f5f7fb;
}

.login-panel {
  display: grid;
  grid-template-columns: minmax(280px, 420px) minmax(360px, 440px);
  gap: 44px;
  align-items: center;
  width: min(980px, 100%);
}

.login-copy h1 {
  margin: 18px 0 12px;
  color: #111827;
  font-size: 34px;
  line-height: 1.2;
}

.login-copy p {
  margin: 0;
  color: #4b5563;
  font-size: 16px;
  line-height: 1.8;
}

.login-logo {
  width: 52px;
  height: 52px;
  border-radius: 8px;
  object-fit: contain;
}

.auth-card {
  padding: 26px;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  background: #ffffff;
  box-shadow: 0 20px 60px rgba(15, 23, 42, 0.08);
}

.full-button {
  width: 100%;
}

.auth-footer {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 4px;
  margin-top: 12px;
  color: #6b7280;
  font-size: 13px;
}

.code-row {
  display: grid;
  grid-template-columns: 1fr auto;
  gap: 10px;
  width: 100%;
}

.email-complete-field {
  position: relative;
  min-width: 0;
  width: 100%;
}

.email-complete-field.is-email-mode {
  width: 100%;
}

.email-complete-hint {
  position: absolute;
  top: 0;
  right: 12px;
  bottom: 0;
  left: 12px;
  z-index: 1;
  display: flex;
  align-items: center;
  overflow: hidden;
  color: #9ca3af;
  font: inherit;
  line-height: 40px;
  pointer-events: none;
  white-space: nowrap;
}

.email-complete-spacer {
  overflow: hidden;
  max-width: 100%;
  color: transparent;
  font: inherit;
  white-space: pre;
}

.field-hint {
  margin-top: 8px;
  color: #6b7280;
  font-size: 12px;
  line-height: 1.6;
}

:global(:root.dark) .login-page {
  background:
    radial-gradient(circle at 20% 25%, rgba(37, 99, 235, 0.16), transparent 34%),
    radial-gradient(circle at 76% 70%, rgba(14, 165, 233, 0.12), transparent 32%),
    var(--app-bg);
}

:global(:root.dark) .login-copy h1 {
  color: var(--app-text);
}

:global(:root.dark) .login-copy p {
  color: #cbd5e1;
}

:global(:root.dark) .auth-card {
  border-color: var(--app-border);
  background: var(--app-surface);
  box-shadow: 0 24px 70px rgba(0, 0, 0, 0.34);
}

@media (max-width: 860px) {
  .login-panel {
    grid-template-columns: 1fr;
    gap: 24px;
    max-width: 520px;
  }
}

@media (max-width: 640px) {
  .login-page {
    align-items: start;
    padding: 18px 12px;
    overflow-y: auto;
  }

  .login-panel {
    gap: 16px;
  }

  .login-copy {
    display: grid;
    grid-template-columns: 44px minmax(0, 1fr);
    align-items: center;
    gap: 12px;
  }

  .login-logo {
    width: 44px;
    height: 44px;
  }

  .login-copy h1 {
    margin: 0;
    font-size: 24px;
  }

  .login-copy p {
    grid-column: 1 / -1;
    font-size: 14px;
    line-height: 1.5;
  }

  .auth-card {
    padding: 18px 16px;
  }

  .code-row {
    grid-template-columns: minmax(0, 1fr);
  }

  .code-row > .el-button {
    width: 100%;
  }
}

@media (min-width: 680px) and (max-height: 520px) and (orientation: landscape) {
  .login-page {
    align-items: start;
    padding: 16px 24px;
    overflow-y: auto;
  }

  .login-panel {
    grid-template-columns: minmax(220px, 0.8fr) minmax(360px, 1.2fr);
    gap: 24px;
    max-width: 900px;
  }

  .login-copy h1 {
    margin: 12px 0 8px;
    font-size: 28px;
  }

  .login-copy p {
    font-size: 14px;
    line-height: 1.5;
  }

  .auth-card {
    padding: 20px;
  }
}
</style>
