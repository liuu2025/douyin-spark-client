<template>
  <section>
    <div class="page-header">
      <div>
        <h1 class="page-title">全局轮次管理</h1>
        <p class="page-subtitle">管理员统一维护全局发送轮次，普通用户只选择参与哪些轮次。</p>
      </div>
      <el-button type="primary" @click="openDialog()">新增轮次</el-button>
    </div>

    <div class="content-panel">
      <div class="panel-body">
        <div class="toolbar">
          <div class="toolbar-left">
            <strong>轮次列表</strong>
            <el-segmented v-model="sortMode" :options="sortOptions" />
          </div>
          <el-button @click="loadSlots(true)">刷新</el-button>
        </div>

        <div v-if="sortMode === 'status'" class="slot-groups" v-loading="loading">
          <div class="slot-group">
            <div class="group-title">启用</div>
            <div class="slot-list">
              <SlotHeader />
              <SlotRow
                v-for="slot in activeSlots"
                :key="slot.id"
                :slot="slot"
                @edit="openDialog"
                @toggle="toggleSlot"
              />
              <el-empty v-if="activeSlots.length === 0" description="暂无启用轮次" />
            </div>
          </div>
          <div class="slot-group">
            <div class="group-title">禁用</div>
            <div class="slot-list">
              <SlotHeader />
              <SlotRow
                v-for="slot in disabledSlots"
                :key="slot.id"
                :slot="slot"
                @edit="openDialog"
                @toggle="toggleSlot"
              />
              <el-empty v-if="disabledSlots.length === 0" description="暂无禁用轮次" />
            </div>
          </div>
        </div>

        <div v-else class="slot-list" v-loading="loading">
          <SlotHeader />
          <SlotRow
            v-for="slot in sortedSlots"
            :key="slot.id"
            :slot="slot"
            @edit="openDialog"
            @toggle="toggleSlot"
          />
          <el-empty v-if="sortedSlots.length === 0 && !loading" description="暂无轮次" />
        </div>
      </div>
    </div>

    <el-dialog
      v-model="dialogOpen"
      :title="editingSlot ? '编辑轮次' : '新增轮次'"
      width="460px"
    >
      <el-form :model="form" label-position="top">
        <el-form-item label="轮次名称">
          <el-input v-model.trim="form.name" maxlength="60" show-word-limit placeholder="晚间轮次" />
        </el-form-item>
        <el-form-item label="轮次模式">
          <el-segmented v-model="form.mode" :options="modeOptions" />
        </el-form-item>
        <el-form-item v-if="form.mode === 'fixed_time'" label="发送时间">
          <el-time-picker
            v-model="form.time"
            class="schedule-time-picker"
            popper-class="schedule-time-picker-popper"
            format="HH:mm"
            value-format="HH:mm"
            placeholder="选择时间"
          />
        </el-form-item>
        <el-form-item v-else label="间隔小时">
          <el-input-number v-model="form.interval_hours" :min="1" :step="1" />
        </el-form-item>
        <el-form-item label="状态">
          <el-switch v-model="form.active" active-text="启用" inactive-text="禁用" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="dialogOpen = false">取消</el-button>
        <el-button type="primary" :loading="saving" @click="saveSlot">保存</el-button>
      </template>
    </el-dialog>
  </section>
</template>

<script setup lang="ts">
import { computed, defineComponent, h, onMounted, reactive, ref } from 'vue'
import { ElButton, ElMessage, ElTag } from 'element-plus'
import {
  createAdminScheduleSlot,
  disableAdminScheduleSlot,
  enableAdminScheduleSlot,
  listAdminScheduleSlots,
  updateAdminScheduleSlot,
} from '@/api/schedule'
import { errorText } from '@/api/http'
import type { SendScheduleSlot } from '@/api/types'
import { createCacheKey, readCache, writeCache } from '@/utils/cache'

const SlotHeader = defineComponent({
  setup() {
    return () =>
      h('div', { class: 'slot-header' }, [
        h('span', '时间'),
        h('span', '轮次名称'),
        h('span', '轮次模式'),
        h('span', '状态'),
        h('span', '操作'),
      ])
  },
})

const SlotRow = defineComponent({
  props: {
    slot: {
      type: Object as () => SendScheduleSlot,
      required: true,
    },
  },
  emits: ['edit', 'toggle'],
  setup(props, { emit }) {
    return () =>
      h('div', { class: ['slot-row', props.slot.status === 'disabled' ? 'disabled' : ''] }, [
        h('div', { class: 'slot-time' }, slotTimeText(props.slot)),
        h('strong', { class: 'slot-name' }, props.slot.name),
        h('div', { class: 'slot-mode' }, modeText(props.slot)),
        h(
          ElTag,
          { type: props.slot.status === 'active' ? 'success' : 'info' },
          () => (props.slot.status === 'active' ? '已启用' : '已禁用'),
        ),
        h('div', { class: 'slot-actions' }, [
          h(
            ElButton,
            { link: true, type: 'primary', onClick: () => emit('edit', props.slot) },
            () => '编辑',
          ),
          h(
            ElButton,
            {
              link: true,
              type: props.slot.status === 'active' ? 'warning' : 'success',
              onClick: () => emit('toggle', props.slot),
            },
            () => (props.slot.status === 'active' ? '禁用' : '启用'),
          ),
        ]),
      ])
  },
})

const sortOptions = [
  { label: '按时间排序', value: 'time' },
  { label: '按状态分组', value: 'status' },
]
const modeOptions = [
  { label: '固定时间', value: 'fixed_time' },
  { label: '间隔', value: 'interval' },
]

const slots = ref<SendScheduleSlot[]>([])
const loading = ref(false)
const saving = ref(false)
const dialogOpen = ref(false)
const sortMode = ref<'time' | 'status'>('time')
const editingSlot = ref<SendScheduleSlot | null>(null)
const SLOTS_CACHE_TTL = 1000 * 30
const form = reactive({
  name: '',
  mode: 'fixed_time',
  time: '20:00',
  interval_hours: 6,
  active: true,
})

function slotsCacheKey() {
  return createCacheKey('admin-schedule-slots:list:v1')
}

const sortedSlots = computed(() => [...slots.value].sort(compareByTime))
const activeSlots = computed(() =>
  sortedSlots.value.filter((slot) => slot.status === 'active'),
)
const disabledSlots = computed(() =>
  sortedSlots.value.filter((slot) => slot.status !== 'active'),
)

function slotTimeText(slot: SendScheduleSlot) {
  if (slot.mode === 'interval') {
    const hours = Math.floor((slot.interval_seconds || 0) / 3600)
    return hours > 0 ? `每 ${hours} 小时` : `间隔 ${slot.interval_seconds || '-'} 秒`
  }
  return slot.time_of_day || '-'
}

function modeText(slot: SendScheduleSlot) {
  return slot.mode === 'interval' ? '间隔轮次' : '固定时间轮次'
}

function compareByTime(left: SendScheduleSlot, right: SendScheduleSlot) {
  return sortValue(left).localeCompare(sortValue(right))
}

function sortValue(slot: SendScheduleSlot) {
  if (slot.mode === 'interval') return `zz-${String(slot.interval_seconds || 0).padStart(8, '0')}`
  return slot.time_of_day || '99:99'
}

function openDialog(slot?: SendScheduleSlot) {
  editingSlot.value = slot || null
  form.name = slot?.name || ''
  form.mode = slot?.mode || 'fixed_time'
  form.time = slot?.time_of_day || '20:00'
  form.interval_hours = Math.max(1, Math.floor((slot?.interval_seconds || 21600) / 3600))
  form.active = slot?.status !== 'disabled'
  dialogOpen.value = true
}

function buildPayload() {
  return {
    name: form.name.trim(),
    mode: form.mode,
    time_of_day: form.mode === 'fixed_time' ? form.time : undefined,
    interval_seconds: form.mode === 'interval' ? form.interval_hours * 3600 : undefined,
    status: form.active ? 'active' : 'disabled',
  }
}

async function loadSlots(force = false) {
  if (!force) {
    const cached = readCache<SendScheduleSlot[]>(slotsCacheKey(), SLOTS_CACHE_TTL)
    if (cached) {
      slots.value = cached
    }
    loading.value = !cached
  } else {
    loading.value = true
  }
  try {
    slots.value = await listAdminScheduleSlots()
    writeCache(slotsCacheKey(), slots.value)
  } catch (error) {
    ElMessage.error(errorText(error))
  } finally {
    loading.value = false
  }
}

async function saveSlot() {
  if (!form.name.trim()) {
    ElMessage.warning('请输入轮次名称。')
    return
  }
  if (form.mode === 'fixed_time' && !form.time) {
    ElMessage.warning('请选择发送时间。')
    return
  }
  saving.value = true
  try {
    const payload = buildPayload()
    if (editingSlot.value) {
      await updateAdminScheduleSlot(editingSlot.value.id, payload)
      ElMessage.success('轮次已更新。')
    } else {
      await createAdminScheduleSlot(payload)
      ElMessage.success('轮次已新增。')
    }
    dialogOpen.value = false
    await loadSlots(true)
  } catch (error) {
    ElMessage.error(errorText(error))
  } finally {
    saving.value = false
  }
}

async function toggleSlot(slot: SendScheduleSlot) {
  try {
    if (slot.status === 'active') {
      await disableAdminScheduleSlot(slot.id)
      ElMessage.success('轮次已禁用。')
    } else {
      await enableAdminScheduleSlot(slot.id)
      ElMessage.success('轮次已启用。')
    }
    await loadSlots(true)
  } catch (error) {
    ElMessage.error(errorText(error))
  }
}

onMounted(() => loadSlots())
</script>

<style scoped>
.toolbar-left {
  display: flex;
  flex-wrap: wrap;
  gap: 14px;
  align-items: center;
}

.slot-groups {
  display: grid;
  gap: 18px;
}

.group-title {
  margin-bottom: 8px;
  color: #6b7280;
  font-size: 13px;
  font-weight: 700;
}

.slot-list {
  display: grid;
  gap: 10px;
}

.slot-header,
.slot-row {
  display: grid;
  grid-template-columns: 120px minmax(160px, 1fr) 140px 90px 120px;
  gap: 14px;
  align-items: center;
}

.slot-header {
  padding: 0 16px 2px;
  color: #374151;
  font-size: 13px;
  font-weight: 800;
}

.slot-row {
  padding: 14px 16px;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  background: #ffffff;
}

.slot-row.disabled {
  background: #f9fafb;
}

.slot-time {
  color: #111827;
  font-size: 20px;
  font-weight: 800;
}

.slot-name {
  overflow: hidden;
  color: #111827;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.slot-mode {
  color: #6b7280;
  font-size: 13px;
}

.slot-actions {
  display: flex;
  gap: 8px;
}

.schedule-time-picker {
  width: 320px;
}

:global(:root.dark) .group-title,
:global(:root.dark) .slot-mode {
  color: var(--app-text-muted);
}

:global(:root.dark) .slot-header {
  color: var(--app-text);
}

:global(:root.dark) .slot-row {
  border-color: var(--app-border);
  background: var(--app-surface);
}

:global(:root.dark) .slot-row.disabled {
  background: var(--app-surface-soft);
}

:global(:root.dark) .slot-time,
:global(:root.dark) .slot-name {
  color: var(--app-text);
}

@media (max-width: 760px) {
  .slot-header {
    display: none;
  }

  .slot-row {
    grid-template-columns: 1fr;
    gap: 8px;
  }

  .slot-actions {
    justify-content: flex-start;
  }
}
</style>

<style>
.schedule-time-picker-popper {
  min-width: 286px;
}

.schedule-time-picker-popper .el-time-panel {
  width: 286px;
}

.schedule-time-picker-popper .el-time-spinner__item {
  font-size: 15px;
}

.schedule-time-picker-popper .el-time-spinner__item.is-active:not(.is-disabled) {
  font-size: 16px;
  font-weight: 800;
}

.schedule-time-picker-popper .el-time-panel__footer {
  height: 46px;
  padding: 8px 10px;
}

.schedule-time-picker-popper .el-time-panel__btn {
  min-width: 48px;
  height: 30px;
  font-size: 14px;
  line-height: 30px;
}
</style>
