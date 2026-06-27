<template>
  <section>
    <div class="content-panel">
      <div class="panel-body">
        <el-tabs v-model="activeTab">
          <el-tab-pane label="通知发布" name="publish">
            <el-form :model="form" label-position="top" class="notice-form">
              <el-form-item label="通知标题">
                <el-input v-model.trim="form.title" maxlength="120" show-word-limit placeholder="系统维护" />
              </el-form-item>
              <el-form-item label="通知内容">
                <el-input
                  v-model.trim="form.content"
                  type="textarea"
                  :rows="10"
                  maxlength="5000"
                  show-word-limit
                  placeholder="请输入通知内容"
                />
              </el-form-item>
              <el-button type="primary" :loading="publishing" @click="publish">发布</el-button>
            </el-form>
          </el-tab-pane>

          <el-tab-pane label="已发布通知" name="published">
            <div class="toolbar">
              <strong>已发布通知</strong>
              <el-button @click="loadNotices">刷新</el-button>
            </div>
            <div class="notice-reader-shell" v-loading="loading">
              <div class="notice-list">
                <button
                  v-for="notice in notices"
                  :key="notice.id"
                  class="notice-item"
                  :class="{ active: notice.id === selectedNotice?.id }"
                  type="button"
                  @click="selectedNotice = notice"
                >
                  <strong>
                    {{ notice.title }}
                    <span v-if="isArchived(notice)" class="status-text">已撤回</span>
                  </strong>
                  <span>{{ shortTime(notice.published_at || notice.created_at) }}</span>
                  <p>{{ notice.content }}</p>
                </button>
                <el-empty v-if="notices.length === 0" description="暂无通知" />
              </div>
              <article class="notice-detail">
                <template v-if="selectedNotice">
                  <div class="notice-detail-header">
                    <div>
                      <h2>{{ selectedNotice.title }}</h2>
                      <span>{{ shortTime(selectedNotice.published_at || selectedNotice.created_at) }}</span>
                    </div>
                    <div class="notice-actions">
                      <span v-if="isArchived(selectedNotice)" class="status-pill">已撤回</span>
                      <el-button
                        v-else
                        type="danger"
                        plain
                        :loading="archiving"
                        @click="confirmArchiveNotice(selectedNotice)"
                      >
                        撤回通知
                      </el-button>
                    </div>
                  </div>
                  <div class="notice-content">{{ selectedNotice.content }}</div>
                </template>
                <el-empty v-else description="请选择一条通知" />
              </article>
            </div>
          </el-tab-pane>
        </el-tabs>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
import { onMounted, reactive, ref } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { archiveNotice, createNotice, listAdminNotices } from '@/api/notices'
import { errorText } from '@/api/http'
import type { Notice } from '@/api/types'
import { formatBeijingTime } from '@/utils/time'

const form = reactive({
  title: '',
  content: '',
})
const activeTab = ref('publish')
const notices = ref<Notice[]>([])
const selectedNotice = ref<Notice | null>(null)
const publishing = ref(false)
const loading = ref(false)
const archiving = ref(false)

function shortTime(value?: string) {
  return formatBeijingTime(value)
}

function isArchived(notice: Notice) {
  return notice.status === 'archived'
}

async function loadNotices() {
  loading.value = true
  try {
    notices.value = await listAdminNotices()
    if (!selectedNotice.value || !notices.value.some((item) => item.id === selectedNotice.value?.id)) {
      selectedNotice.value = notices.value[0] || null
    }
  } catch (error) {
    ElMessage.error(errorText(error))
  } finally {
    loading.value = false
  }
}

async function publish() {
  if (!form.title || !form.content) {
    ElMessage.warning('请填写通知标题和内容。')
    return
  }
  publishing.value = true
  try {
    await createNotice({ title: form.title, content: form.content })
    form.title = ''
    form.content = ''
    ElMessage.success('通知已发布。')
    await loadNotices()
    activeTab.value = 'published'
  } catch (error) {
    ElMessage.error(errorText(error))
  } finally {
    publishing.value = false
  }
}

async function confirmArchiveNotice(notice: Notice) {
  try {
    await ElMessageBox.confirm('确定撤回这条通知吗？撤回后普通用户将看不到该通知。', '撤回通知', {
      confirmButtonText: '撤回',
      cancelButtonText: '取消',
      type: 'warning',
    })
    archiving.value = true
    const archived = await archiveNotice(notice.id)
    ElMessage.success('通知已撤回。')
    await loadNotices()
    selectedNotice.value = notices.value.find((item) => item.id === archived.id) || archived
  } catch (error) {
    if (error !== 'cancel' && error !== 'close') {
      ElMessage.error(errorText(error))
    }
  } finally {
    archiving.value = false
  }
}

onMounted(loadNotices)
</script>

<style scoped>
.notice-form {
  max-width: 520px;
}

.notice-reader-shell {
  display: grid;
  grid-template-columns: minmax(200px, 260px) minmax(0, 1fr);
  height: calc(100vh - 280px);
  min-height: 520px;
  overflow: hidden;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
}

.notice-list {
  min-height: 0;
  overflow: auto;
  overscroll-behavior: contain;
  border-right: 1px solid #e5e7eb;
  background: #f9fafb;
  padding: 8px;
}

.notice-item {
  display: grid;
  width: 100%;
  gap: 5px;
  padding: 10px;
  border: 0;
  border-radius: 8px;
  background: transparent;
  color: inherit;
  text-align: left;
  cursor: pointer;
}

.notice-item:hover {
  background: #eef2f7;
}

.notice-item.active {
  background: #e8f1ff;
}

.notice-item strong,
.notice-item p {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.notice-item span,
.notice-item p {
  margin: 0;
  color: #6b7280;
  font-size: 12px;
}

.notice-detail {
  min-height: 0;
  overflow: auto;
  overscroll-behavior: contain;
  padding: 18px;
}

.notice-detail-header {
  display: flex;
  justify-content: space-between;
  gap: 16px;
  align-items: flex-start;
  padding-bottom: 14px;
  border-bottom: 1px solid #e5e7eb;
}

.notice-detail-header h2 {
  margin: 0 0 8px;
  color: #111827;
  font-size: 18px;
}

.notice-detail-header span {
  color: #6b7280;
  font-size: 13px;
}

.notice-actions {
  flex: 0 0 auto;
}

.status-text {
  margin-left: 6px;
  color: #9ca3af;
  font-size: 12px;
  font-weight: 500;
}

.status-pill {
  display: inline-flex;
  padding: 3px 8px;
  border: 1px solid #d1d5db;
  border-radius: 999px;
  color: #6b7280;
  background: #f9fafb;
  font-size: 12px;
}

.notice-content {
  margin-top: 16px;
  white-space: pre-wrap;
  line-height: 1.8;
}

:global(:root.dark) .notice-reader-shell {
  border-color: var(--app-border);
  background: var(--app-surface);
}

:global(:root.dark) .notice-list {
  border-color: var(--app-border);
  background: var(--app-surface-soft);
}

:global(:root.dark) .notice-item:hover {
  background: var(--app-surface-hover);
}

:global(:root.dark) .notice-item.active {
  background: #172554;
}

:global(:root.dark) .notice-item span,
:global(:root.dark) .notice-item p,
:global(:root.dark) .notice-detail-header span,
:global(:root.dark) .status-text {
  color: var(--app-text-muted);
}

:global(:root.dark) .notice-detail {
  background: var(--app-surface);
}

:global(:root.dark) .notice-detail-header {
  border-color: var(--app-border);
}

:global(:root.dark) .notice-detail-header h2 {
  color: var(--app-text);
}

:global(:root.dark) .status-pill {
  border-color: var(--app-border);
  color: var(--app-text-muted);
  background: var(--app-surface-soft);
}

@media (max-width: 980px) {
  .notice-reader-shell {
    grid-template-columns: 1fr;
    height: auto;
  }

  .notice-list {
    max-height: 280px;
    border-right: 0;
    border-bottom: 1px solid #e5e7eb;
  }
}
</style>
