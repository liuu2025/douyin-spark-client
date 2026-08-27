<template>
  <section>
    <div class="page-header">
      <div>
        <h1 class="page-title">登录态导入</h1>
        <p class="page-subtitle">管理员上传已有 storageState.json，并指定目标客户端账户ID。</p>
      </div>
    </div>

    <div class="content-panel">
      <div class="panel-body">
        <el-segmented v-model="activePanel" :options="panelOptions" class="import-tabs" />

        <div v-if="activePanel === 'import'" class="import-layout">
          <el-form :model="form" label-position="top">
            <el-form-item label="目标客户端账户ID">
              <el-input v-model.trim="form.targetPublicUid" placeholder="100002" />
            </el-form-item>
            <el-form-item label="登录态文件">
              <el-upload
                :auto-upload="false"
                :limit="1"
                :on-change="handleFileChange"
                :on-remove="handleFileRemove"
                accept=".json,application/json"
              >
                <el-button>选择 storageState.json</el-button>
                <template #tip>
                  <div class="muted upload-tip">只上传给管理员导入接口，普通用户没有该权限。</div>
                </template>
              </el-upload>
            </el-form-item>
            <el-button type="primary" :loading="submitting" @click="submit">开始导入</el-button>
          </el-form>

          <div class="result-box">
            <h2>导入结果</h2>
            <el-empty v-if="!result" description="暂无导入结果" :image-size="100" />
            <el-descriptions v-else :column="1" border>
              <el-descriptions-item label="状态">{{ statusText(result.status) }}</el-descriptions-item>
              <el-descriptions-item label="结果">{{ resultText(result.result) }}</el-descriptions-item>
              <el-descriptions-item label="目标账户ID">
                {{ result.target_public_uid || form.targetPublicUid }}
              </el-descriptions-item>
              <el-descriptions-item label="原归属账户ID">
                {{ result.original_owner_public_uid || '-' }}
              </el-descriptions-item>
              <el-descriptions-item label="实际归属账户ID">
                {{ result.final_owner_public_uid || '-' }}
              </el-descriptions-item>
              <el-descriptions-item label="识别抖音号">
                {{ result.detected_douyin_id || '-' }}
              </el-descriptions-item>
              <el-descriptions-item label="归属是否变化">
                {{ result.owner_changed ? '是' : '否' }}
              </el-descriptions-item>
              <el-descriptions-item label="错误">
                {{ result.last_error_message || result.last_error_code || '-' }}
              </el-descriptions-item>
            </el-descriptions>
          </div>
        </div>

        <div v-else class="history-view">
          <div class="history-header">
            <div>
              <h2>导入记录</h2>
              <p class="muted history-note">按最新导入时间排序，可筛选目标账户、识别抖音号和导入状态。</p>
            </div>
            <el-button :loading="loadingRecords" @click="loadRecords">刷新</el-button>
          </div>

          <div class="history-filters">
            <el-select
              v-model="filters.status"
              clearable
              placeholder="导入状态"
              class="status-filter"
              @change="reloadFirstPage"
            >
              <el-option label="已创建" value="created" />
              <el-option label="验证中" value="validating" />
              <el-option label="已导入" value="imported" />
              <el-option label="无效" value="invalid" />
              <el-option label="失败" value="failed" />
            </el-select>
            <el-input
              v-model.trim="filters.targetPublicUid"
              clearable
              placeholder="目标账户ID"
              class="text-filter"
              @change="reloadFirstPage"
              @clear="reloadFirstPage"
            />
            <el-input
              v-model.trim="filters.detectedDouyinId"
              clearable
              placeholder="识别抖音号"
              class="text-filter"
              @change="reloadFirstPage"
              @clear="reloadFirstPage"
            />
          </div>

          <el-table
            class="history-table desktop-only"
            :data="records"
            :loading="loadingRecords"
            empty-text="暂无导入记录"
            height="clamp(250px, calc(100dvh - 330px), 520px)"
          >
            <el-table-column label="状态" width="100">
              <template #default="{ row }">
                <el-tag :type="statusTag(row.status)">{{ statusText(row.status) }}</el-tag>
              </template>
            </el-table-column>
            <el-table-column label="结果" min-width="170">
              <template #default="{ row }">{{ resultText(row.result) }}</template>
            </el-table-column>
            <el-table-column label="目标账户ID" width="120">
              <template #default="{ row }">{{ row.target_public_uid || '-' }}</template>
            </el-table-column>
            <el-table-column label="原归属账户ID" width="130">
              <template #default="{ row }">{{ row.original_owner_public_uid || '-' }}</template>
            </el-table-column>
            <el-table-column label="实际归属账户ID" width="140">
              <template #default="{ row }">
                <strong>{{ row.final_owner_public_uid || '-' }}</strong>
              </template>
            </el-table-column>
            <el-table-column label="识别抖音号" min-width="140">
              <template #default="{ row }">{{ row.detected_douyin_id || '-' }}</template>
            </el-table-column>
            <el-table-column label="归属变化" width="100">
              <template #default="{ row }">{{ row.owner_changed ? '是' : '否' }}</template>
            </el-table-column>
            <el-table-column label="错误" min-width="180">
              <template #default="{ row }">
                <span class="error-text">{{ row.last_error_message || row.last_error_code || '-' }}</span>
              </template>
            </el-table-column>
            <el-table-column label="记录时间" min-width="170">
              <template #default="{ row }">{{ formatBeijingTime(row.created_at) }}</template>
            </el-table-column>
          </el-table>

          <div v-loading="loadingRecords" class="mobile-only mobile-card-list">
            <article v-for="record in records" :key="record.id" class="mobile-data-card">
              <div class="mobile-data-card__header">
                <strong>{{ record.detected_douyin_id || record.target_public_uid || '未识别' }}</strong>
                <el-tag :type="statusTag(record.status)">{{ statusText(record.status) }}</el-tag>
              </div>
              <div class="mobile-data-card__body">
                <div class="mobile-data-row"><span>结果</span><span>{{ resultText(record.result) }}</span></div>
                <div class="mobile-data-row"><span>目标账户ID</span><span>{{ record.target_public_uid || '-' }}</span></div>
                <div class="mobile-data-row"><span>原归属账户ID</span><span>{{ record.original_owner_public_uid || '-' }}</span></div>
                <div class="mobile-data-row"><span>实际归属账户ID</span><span>{{ record.final_owner_public_uid || '-' }}</span></div>
                <div class="mobile-data-row"><span>归属变化</span><span>{{ record.owner_changed ? '是' : '否' }}</span></div>
                <div class="mobile-data-row"><span>错误</span><span>{{ record.last_error_message || record.last_error_code || '-' }}</span></div>
                <div class="mobile-data-row"><span>记录时间</span><span>{{ formatBeijingTime(record.created_at) }}</span></div>
              </div>
            </article>
            <div v-if="!loadingRecords && records.length === 0" class="mobile-empty">暂无导入记录</div>
          </div>

          <div class="history-pagination">
            <el-pagination
              v-model:current-page="pagination.page"
              v-model:page-size="pagination.pageSize"
              :total="pagination.total"
              :page-sizes="[20, 50, 100]"
              layout="total, sizes, prev, pager, next"
              background
              @current-change="loadRecords"
              @size-change="reloadFirstPage"
            />
          </div>
        </div>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
import { onMounted, reactive, ref, watch } from 'vue'
import { ElMessage, type UploadFile } from 'element-plus'
import { importStorageState, listStorageStateImports } from '@/api/admin'
import { errorText } from '@/api/http'
import type { StorageStateImport } from '@/api/types'
import { formatBeijingTime } from '@/utils/time'

const form = reactive({
  targetPublicUid: '',
})
const activePanel = ref<'import' | 'records'>('import')
const panelOptions = [
  { label: '登录态导入', value: 'import' },
  { label: '导入记录', value: 'records' },
]
const filters = reactive({
  status: '',
  targetPublicUid: '',
  detectedDouyinId: '',
})
const pagination = reactive({
  page: 1,
  pageSize: 20,
  total: 0,
})
const file = ref<File | null>(null)
const result = ref<StorageStateImport | null>(null)
const records = ref<StorageStateImport[]>([])
const submitting = ref(false)
const loadingRecords = ref(false)

function handleFileChange(uploadFile: UploadFile) {
  file.value = uploadFile.raw || null
}

function handleFileRemove() {
  file.value = null
}

async function submit() {
  if (!form.targetPublicUid || !file.value) {
    ElMessage.warning('请输入目标账户ID并选择登录态文件。')
    return
  }
  submitting.value = true
  try {
    result.value = await importStorageState(form.targetPublicUid, file.value)
    ElMessage.success('导入流程已完成。')
    await reloadFirstPage()
  } catch (error) {
    ElMessage.error(errorText(error))
  } finally {
    submitting.value = false
  }
}

function statusText(status: string) {
  const map: Record<string, string> = {
    created: '已创建',
    validating: '验证中',
    invalid: '无效',
    imported: '已导入',
    failed: '失败',
  }
  return map[status] || status || '-'
}

function statusTag(status: string) {
  if (status === 'imported') return 'success'
  if (status === 'invalid' || status === 'failed') return 'danger'
  if (status === 'validating') return 'warning'
  return 'info'
}

function resultText(resultCode?: string) {
  const map: Record<string, string> = {
    ok_created_owner: '已创建归属关系',
    ok_refreshed_existing_owner: '已刷新已有归属',
    invalid_storage_state: '登录态文件无效',
    target_user_not_found: '目标账户不存在',
    target_user_disabled: '目标账户已禁用',
    storage_state_replace_failed: '登录态替换失败',
  }
  return resultCode ? map[resultCode] || resultCode : '-'
}

async function loadRecords() {
  loadingRecords.value = true
  try {
    const data = await listStorageStateImports({
      page: pagination.page,
      page_size: pagination.pageSize,
      status: filters.status || undefined,
      target_public_uid: filters.targetPublicUid || undefined,
      detected_douyin_id: filters.detectedDouyinId || undefined,
    })
    records.value = data.items || []
    pagination.total = data.total || 0
    pagination.page = data.page || pagination.page
    pagination.pageSize = data.page_size || pagination.pageSize
  } catch (error) {
    ElMessage.error(errorText(error))
  } finally {
    loadingRecords.value = false
  }
}

async function reloadFirstPage() {
  pagination.page = 1
  await loadRecords()
}

watch(activePanel, (value) => {
  if (value === 'records' && records.value.length === 0) {
    void loadRecords()
  }
})

onMounted(loadRecords)
</script>

<style scoped>
.import-layout {
  display: grid;
  grid-template-columns: minmax(280px, 420px) 1fr;
  gap: 28px;
}

.import-tabs {
  margin-bottom: 20px;
}

.upload-tip {
  margin-top: 8px;
}

.result-box h2 {
  margin: 0 0 14px;
  font-size: 18px;
}

.history-header {
  display: flex;
  justify-content: space-between;
  gap: 16px;
  align-items: flex-start;
  margin-bottom: 14px;
}

.history-header h2 {
  margin: 0;
  font-size: 18px;
}

.history-note {
  margin-top: 6px;
  font-size: 13px;
}

.history-filters {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  margin-bottom: 14px;
}

.status-filter {
  width: 130px;
}

.text-filter {
  width: 180px;
}

.history-table {
  width: 100%;
}

.history-pagination {
  display: flex;
  justify-content: flex-end;
  margin-top: 14px;
}

.error-text {
  display: -webkit-box;
  overflow: hidden;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
}

@media (max-width: 900px) {
  .import-layout {
    grid-template-columns: 1fr;
  }

  .history-header {
    display: grid;
  }
}

@media (max-width: 640px) {
  .history-filters,
  .status-filter,
  .text-filter {
    width: 100%;
  }
}
</style>
