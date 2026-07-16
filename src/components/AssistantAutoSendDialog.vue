<template>
  <el-dialog
    v-model="assistant.autoSendDialogOpen"
    :title="assistant.autoSendDialogTitle"
    width="560px"
    @close="assistant.dismissAutoSendSuggestion"
    @closed="assistant.handleAutoSendDialogClosed"
  >
    <div v-if="assistant.pendingActionSuggestion && !assistant.latestActionAccount" class="auto-send-dialog">
      <p>{{ assistant.pendingActionSuggestion.message }}</p>
      <el-select
        v-model="assistant.actionDouyinId"
        class="dialog-account-select"
        filterable
        placeholder="请选择抖音号"
        :loading="assistant.accountsLoading"
      >
        <el-option
          v-for="account in assistant.accounts"
          :key="account.douyin_id"
          :label="assistant.accountLabel(account)"
          :value="account.douyin_id"
        >
          <span>{{ assistant.accountLabel(account) }}</span>
          <span class="option-status">
            {{ account.status === 'active' ? '自动发送已开启' : '自动发送已暂停' }}
          </span>
        </el-option>
      </el-select>
    </div>

    <div v-else-if="assistant.pendingActionSuggestion && assistant.latestActionAccount" class="auto-send-dialog">
      <div class="confirm-account">
        <strong>{{ assistant.accountLabel(assistant.latestActionAccount) }}</strong>
        <span>抖音号 ID：{{ assistant.latestActionAccount.douyin_id }}</span>
      </div>

      <div class="state-grid">
        <span>当前自动发送</span>
        <el-tag :type="assistant.latestActionAccount.status === 'active' ? 'success' : 'info'">
          {{ assistant.latestActionAccount.status === 'active' ? '已开启' : '已暂停' }}
        </el-tag>
        <span>登录状态</span>
        <el-tag :type="assistant.latestActionAccount.login_state === 'ok' ? 'success' : 'warning'">
          {{ assistant.latestActionAccount.login_state || '未验证' }}
        </el-tag>
        <span>轮询资格</span>
        <el-tag :type="assistant.entitlementTag(assistant.latestActionAccount.polling_entitlement_status)">
          {{ assistant.entitlementLabel(assistant.latestActionAccount.polling_entitlement_status) }}
        </el-tag>
      </div>

      <el-alert
        v-if="assistant.isAlreadyTargetState"
        type="info"
        show-icon
        :closable="false"
        :title="assistant.alreadyTargetText"
      />
      <el-alert
        v-else-if="assistant.pendingActionSuggestion.target_state && assistant.latestActionAccount.login_state !== 'ok'"
        type="warning"
        show-icon
        :closable="false"
        title="当前登录状态不可用，请先重新登录或验证登录状态后再开启自动发送。"
      />
      <el-alert
        v-else-if="assistant.pendingActionSuggestion.target_state && assistant.latestActionAccount.polling_entitlement_status !== 'active' && assistant.latestActionAccount.polling_entitlement_status !== 'valid'"
        type="warning"
        show-icon
        :closable="false"
        title="当前轮询资格不是有效状态。开启开关不会保证任务可以进入自动发送号池。"
      />
      <p v-if="!assistant.isAlreadyTargetState" class="confirm-note">
        {{ assistant.pendingActionSuggestion.target_state
          ? '确认开启后，满足登录、资格、任务和轮次条件时，任务才有机会进入自动发送。'
          : '确认关闭后，这个抖音号不会继续参与自动发送，已保存的任务不会被删除。' }}
      </p>
    </div>

    <template #footer>
      <el-button @click="assistant.dismissAutoSendSuggestion">
        {{ assistant.pendingActionSuggestion?.target_state ? '暂不开启' : '暂不关闭' }}
      </el-button>
      <el-button
        v-if="assistant.pendingActionSuggestion && !assistant.latestActionAccount"
        type="primary"
        :disabled="!assistant.actionDouyinId"
        :loading="assistant.actionAccountLoading"
        @click="assistant.loadActionAccount"
      >
        下一步
      </el-button>
      <el-button
        v-else-if="assistant.pendingActionSuggestion && assistant.latestActionAccount && !assistant.isAlreadyTargetState"
        type="primary"
        :disabled="assistant.pendingActionSuggestion.target_state && assistant.latestActionAccount.login_state !== 'ok'"
        :loading="assistant.actionSaving"
        @click="assistant.confirmAutoSendChange"
      >
        {{ assistant.pendingActionSuggestion.target_state ? '确认开启' : '确认关闭' }}
      </el-button>
      <el-button v-else type="primary" @click="assistant.autoSendDialogOpen = false">知道了</el-button>
    </template>
  </el-dialog>
</template>

<script setup lang="ts">
import { useAssistantStore } from '@/stores/assistant'

const assistant = useAssistantStore()
</script>

<style scoped>
.auto-send-dialog {
  display: grid;
  gap: 14px;
}

.dialog-account-select {
  width: 100%;
}

.option-status {
  float: right;
  color: var(--app-text-muted);
  font-size: 12px;
}

.confirm-account {
  display: grid;
  gap: 4px;
}

.confirm-account strong {
  color: var(--app-text);
  font-size: 16px;
}

.confirm-account span {
  color: var(--app-text-muted);
  font-size: 13px;
}

.state-grid {
  display: grid;
  grid-template-columns: 96px minmax(0, 1fr);
  gap: 10px 12px;
  align-items: center;
  padding: 12px;
  border: 1px solid var(--app-border);
  border-radius: 8px;
  background: var(--app-surface-soft);
}

.state-grid > span:nth-child(odd) {
  color: var(--app-text-muted);
  font-size: 13px;
}

.confirm-note {
  margin: 0;
  color: var(--app-text-body);
  line-height: 1.6;
}
</style>
