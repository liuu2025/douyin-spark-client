<template>
  <div class="message-content-wrap" :class="{ expandable, overflowed }">
    <div
      ref="contentEl"
      class="message-content-text"
      :style="{ '--line-count': String(lines) }"
    >
      {{ text || emptyText }}
    </div>
    <button
      v-if="expandable && overflowed"
      class="more-button"
      type="button"
      @click.stop="dialogVisible = true"
    >
      ... 更多
    </button>
  </div>

  <el-dialog v-model="dialogVisible" title="消息内容" width="640px">
    <div class="full-message-content">{{ text || emptyText }}</div>
    <template #footer>
      <el-button @click="copyMessage">复制消息</el-button>
      <el-button type="primary" @click="dialogVisible = false">关闭</el-button>
    </template>
  </el-dialog>
</template>

<script setup lang="ts">
import { nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { ElMessage } from 'element-plus'
import { copyText } from '@/utils/clipboard'

const props = withDefaults(
  defineProps<{
    text?: string
    lines?: number
    expandable?: boolean
    emptyText?: string
  }>(),
  {
    text: '',
    lines: 10,
    expandable: false,
    emptyText: '',
  },
)

const contentEl = ref<HTMLElement | null>(null)
const dialogVisible = ref(false)
const overflowed = ref(false)
let resizeObserver: ResizeObserver | null = null

async function detectOverflow() {
  await nextTick()
  const el = contentEl.value
  if (!el) return
  overflowed.value = el.scrollHeight > el.clientHeight + 1 || el.scrollWidth > el.clientWidth + 1
}

async function copyMessage() {
  const content = props.text || props.emptyText
  if (!content) {
    ElMessage.warning('没有可复制的消息内容。')
    return
  }
  if (await copyText(content)) {
    ElMessage.success('消息内容已复制。')
    return
  }
  ElMessage.error('复制失败，请手动选中复制，或使用 Ctrl+C。')
}

watch(() => [props.text, props.lines], detectOverflow)

onMounted(() => {
  void detectOverflow()
  if (contentEl.value && typeof ResizeObserver !== 'undefined') {
    resizeObserver = new ResizeObserver(() => {
      void detectOverflow()
    })
    resizeObserver.observe(contentEl.value)
  }
})

onBeforeUnmount(() => {
  resizeObserver?.disconnect()
})
</script>

<style scoped>
.message-content-wrap {
  position: relative;
  min-width: 0;
}

.message-content-text {
  display: -webkit-box;
  overflow: hidden;
  white-space: pre-wrap;
  word-break: break-word;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: var(--line-count);
}

.message-content-wrap.expandable.overflowed {
  padding-right: 58px;
}

.more-button {
  position: absolute;
  right: 0;
  bottom: 0;
  padding: 0 0 0 6px;
  border: 0;
  color: #2563eb;
  background: linear-gradient(90deg, rgb(249 250 251 / 0%), #f9fafb 22%);
  cursor: pointer;
  font: inherit;
  line-height: 1.6;
}

:deep(.message-row.mine) .more-button {
  background: linear-gradient(90deg, rgb(239 246 255 / 0%), #eff6ff 22%);
}

.full-message-content {
  max-height: min(62vh, 560px);
  overflow: auto;
  overscroll-behavior: contain;
  white-space: pre-wrap;
  word-break: break-word;
  line-height: 1.8;
}
</style>
