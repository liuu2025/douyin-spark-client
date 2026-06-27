<template>
  <section>
    <div class="page-header">
      <div>
        <h1 class="page-title">账号设置</h1>
        <p class="page-subtitle">查看当前登录账号信息，设置控制台里显示的昵称。</p>
      </div>
    </div>

    <div class="content-panel">
      <div class="panel-body">
        <el-descriptions :column="1" border class="account-descriptions">
          <el-descriptions-item label="昵称">
            <div class="value-row">
              <span>{{ auth.displayName }}</span>
              <el-button class="inline-edit-button" @click="openNicknameDialog">修改</el-button>
            </div>
          </el-descriptions-item>
          <el-descriptions-item label="账户ID">{{ auth.user?.public_uid }}</el-descriptions-item>
          <el-descriptions-item label="QQ邮箱">
            <div class="value-row">
              <span>{{ auth.user?.qq_email || '-' }}</span>
              <el-button class="inline-edit-button" @click="openEmailDialog">更改</el-button>
            </div>
          </el-descriptions-item>
          <el-descriptions-item label="状态">{{ userStatusText(auth.user?.status) }}</el-descriptions-item>
        </el-descriptions>
      </div>
    </div>

    <el-dialog v-model="nicknameDialogOpen" title="修改昵称" width="420px">
      <el-form label-position="top" @submit.prevent>
        <el-form-item label="昵称">
          <el-input
            v-model.trim="nicknameDraft"
            maxlength="40"
            show-word-limit
            placeholder="例如：运营一号"
            @keyup.enter="saveNickname"
          />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="nicknameDialogOpen = false">取消</el-button>
        <el-button type="primary" :loading="saving" @click="saveNickname">保存</el-button>
      </template>
    </el-dialog>

    <el-dialog v-model="emailDialogOpen" title="更改 QQ 邮箱" width="460px">
      <el-form label-position="top" @submit.prevent>
        <el-form-item label="新 QQ 邮箱">
          <div class="code-row">
            <el-input
              v-model.trim="emailForm.newQqEmail"
              :class="{ 'invalid-email-input': showEmailFormatError }"
              type="email"
              :spellcheck="false"
              autocapitalize="off"
              autocomplete="email"
              inputmode="email"
              placeholder="请输入新的 QQ 邮箱"
            />
            <el-button :loading="emailCodeLoading" @click="sendChangeEmailCode">
              发送验证码
            </el-button>
          </div>
          <div v-if="showEmailFormatError" class="field-error">
            QQ 邮箱必须是标准的数字 qq.com 地址，例如 123456789@qq.com。
          </div>
        </el-form-item>
        <el-form-item label="验证码">
          <el-input
            v-model.trim="emailForm.code"
            placeholder="6位验证码"
            @keyup.enter="saveQqEmail"
          />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="emailDialogOpen = false">取消</el-button>
        <el-button type="primary" :loading="emailSaving" @click="saveQqEmail">保存</el-button>
      </template>
    </el-dialog>
  </section>
</template>

<script setup lang="ts">
import { computed, reactive, ref, watch } from 'vue'
import { ElMessage } from 'element-plus'
import { requestChangeQqEmailCode } from '@/api/account'
import { errorText } from '@/api/http'
import { useAuthStore } from '@/stores/auth'

const auth = useAuthStore()
const nicknameDraft = ref(auth.nickname || auth.displayName)
const nicknameDialogOpen = ref(false)
const emailDialogOpen = ref(false)
const saving = ref(false)
const emailCodeLoading = ref(false)
const emailSaving = ref(false)
const emailForm = reactive({
  newQqEmail: '',
  code: '',
})
const numericQqEmailPattern = /^\d+@qq\.com$/i
const isEmailFormatValid = computed(() => numericQqEmailPattern.test(emailForm.newQqEmail))
const showEmailFormatError = computed(
  () => Boolean(emailForm.newQqEmail) && !isEmailFormatValid.value,
)

watch(
  () => auth.displayName,
  (value) => {
    nicknameDraft.value = auth.nickname || value
  },
)

function openNicknameDialog() {
  nicknameDraft.value = auth.nickname || auth.displayName
  nicknameDialogOpen.value = true
}

function openEmailDialog() {
  emailForm.newQqEmail = ''
  emailForm.code = ''
  emailDialogOpen.value = true
}

async function saveNickname() {
  saving.value = true
  try {
    await auth.updateNickname(nicknameDraft.value)
    nicknameDraft.value = auth.nickname || auth.displayName
    nicknameDialogOpen.value = false
    ElMessage.success('昵称已保存。')
  } catch (error) {
    ElMessage.error(`昵称保存失败：${errorText(error)}`)
  } finally {
    saving.value = false
  }
}

async function sendChangeEmailCode() {
  if (!emailForm.newQqEmail) {
    ElMessage.warning('请输入新的 QQ 邮箱。')
    return
  }
  if (!isEmailFormatValid.value) {
    ElMessage.warning('QQ 邮箱必须是标准的数字 qq.com 地址，例如 123456789@qq.com。')
    return
  }
  emailCodeLoading.value = true
  try {
    await requestChangeQqEmailCode(emailForm.newQqEmail)
    ElMessage.success('验证码已发送。')
  } catch (error) {
    ElMessage.error(errorText(error))
  } finally {
    emailCodeLoading.value = false
  }
}

async function saveQqEmail() {
  if (!emailForm.newQqEmail || !emailForm.code) {
    ElMessage.warning('请填写新的 QQ 邮箱和验证码。')
    return
  }
  if (!isEmailFormatValid.value) {
    ElMessage.warning('QQ 邮箱必须是标准的数字 qq.com 地址，例如 123456789@qq.com。')
    return
  }
  emailSaving.value = true
  try {
    await auth.changeQqEmail({
      newQqEmail: emailForm.newQqEmail,
      code: emailForm.code,
    })
    emailDialogOpen.value = false
    ElMessage.success('QQ 邮箱已更改。')
  } catch (error) {
    ElMessage.error(`QQ 邮箱更改失败：${errorText(error)}`)
  } finally {
    emailSaving.value = false
  }
}

function userStatusText(status?: string) {
  const map: Record<string, string> = {
    active: '正常',
    disabled: '已禁用',
  }
  return status ? map[status] ?? status : '-'
}
</script>

<style scoped>
.account-descriptions :deep(.el-descriptions__label) {
  width: 25%;
}

.account-descriptions :deep(.el-descriptions__content) {
  width: 75%;
}

.value-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.code-row {
  display: grid;
  grid-template-columns: 1fr auto;
  gap: 10px;
  width: 100%;
}

.field-error {
  margin-top: 8px;
  color: #dc2626;
  font-size: 12px;
  line-height: 1.5;
}

.invalid-email-input :deep(.el-input__wrapper) {
  box-shadow: 0 0 0 1px #dc2626 inset;
}

.invalid-email-input :deep(.el-input__inner) {
  text-decoration-line: underline;
  text-decoration-style: wavy;
  text-decoration-color: #dc2626;
  text-underline-offset: 4px;
}

.inline-edit-button {
  height: 30px;
  padding: 0 14px;
  border-color: #bfdbfe;
  background: #eff6ff;
  color: #409eff;
}

.inline-edit-button:hover,
.inline-edit-button:focus {
  border-color: #409eff;
  background: #e0efff;
  color: #1677ff;
}

@media (max-width: 640px) {
  .account-descriptions :deep(.el-descriptions__label) {
    width: 25%;
  }

  .code-row {
    grid-template-columns: 1fr;
  }
}
</style>
