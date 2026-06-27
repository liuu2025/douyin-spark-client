<template>
  <el-drawer
    :model-value="modelValue"
    title="页面帮助"
    size="min(760px, 92vw)"
    @update:model-value="emit('update:modelValue', $event)"
  >
    <div class="help-drawer">
      <div class="help-toolbar">
        <el-input
          v-model.trim="keyword"
          clearable
          placeholder="搜索教程"
          @keyup.enter="loadTutorials"
          @clear="loadTutorials"
        />
        <el-button :loading="loading" @click="loadTutorials">搜索</el-button>
      </div>

      <div class="help-layout">
        <aside class="help-list" v-loading="loading">
          <button
            v-for="tutorial in tutorials"
            :key="tutorial.id"
            type="button"
            class="help-list-item"
            :class="{ active: selected?.id === tutorial.id }"
            @click="selectTutorial(tutorial)"
          >
            <strong>{{ tutorial.title }}</strong>
            <span>{{ tutorial.category_name || '未分类' }}</span>
            <small>{{ tutorial.is_read ? '已读' : '未读' }}</small>
          </button>
          <el-empty v-if="tutorials.length === 0 && !loading" description="暂无相关教程" />
        </aside>

        <article class="help-content">
          <template v-if="selected">
            <div class="help-title-row">
              <div>
                <h2>{{ selected.title }}</h2>
                <p>{{ selected.summary || selected.category_name || '教程正文' }}</p>
              </div>
              <el-tag :type="selected.is_read ? 'info' : 'warning'">
                {{ selected.is_read ? '已读' : '未读' }}
              </el-tag>
            </div>
            <div
              v-if="selected.content_markdown?.trim()"
              class="markdown-body"
              v-html="renderMarkdown(selected.content_markdown)"
            />
            <el-empty v-else description="这篇教程还没有正文" />
          </template>
          <el-empty v-else description="请选择一篇教程" />
        </article>
      </div>
    </div>
  </el-drawer>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'
import { ElMessage } from 'element-plus'
import { errorText } from '@/api/http'
import { getTutorial, listTutorials, markTutorialRead } from '@/api/tutorials'
import type { Tutorial } from '@/api/types'
import { renderMarkdown } from '@/utils/markdown'

const props = defineProps<{
  modelValue: boolean
  pageKey?: string
}>()

const emit = defineEmits<{
  'update:modelValue': [value: boolean]
}>()

const loading = ref(false)
const keyword = ref('')
const tutorials = ref<Tutorial[]>([])
const selected = ref<Tutorial | null>(null)

watch(
  () => [props.modelValue, props.pageKey] as const,
  () => {
    if (props.modelValue) void loadTutorials()
  },
  { immediate: true },
)

async function loadTutorials() {
  loading.value = true
  try {
    const data = await listTutorials({
      page: 1,
      page_size: 20,
      page_key: props.pageKey || undefined,
      keyword: keyword.value || undefined,
    })
    tutorials.value = data.items || []
    if (tutorials.value.length > 0) {
      await selectTutorial(tutorials.value[0])
    } else {
      selected.value = null
    }
  } catch (error) {
    ElMessage.error(errorText(error))
  } finally {
    loading.value = false
  }
}

async function selectTutorial(tutorial: Tutorial) {
  try {
    selected.value = await getTutorial(tutorial.id)
    if (!selected.value.is_read) {
      await markTutorialRead(tutorial.id)
      selected.value = { ...selected.value, is_read: true }
      const item = tutorials.value.find((current) => current.id === tutorial.id)
      if (item) item.is_read = true
    }
  } catch (error) {
    ElMessage.error(errorText(error))
  }
}
</script>

<style scoped>
.help-drawer {
  display: grid;
  grid-template-rows: auto minmax(0, 1fr);
  height: 100%;
  gap: 12px;
}

.help-toolbar {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  gap: 8px;
}

.help-layout {
  display: grid;
  grid-template-columns: 230px minmax(0, 1fr);
  min-height: 0;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  overflow: hidden;
}

.help-list {
  min-height: 0;
  overflow-y: auto;
  border-right: 1px solid #e5e7eb;
  background: #f9fafb;
}

.help-list-item {
  display: grid;
  width: 100%;
  gap: 5px;
  padding: 12px;
  border: 0;
  border-bottom: 1px solid #e5e7eb;
  background: transparent;
  color: #111827;
  text-align: left;
  cursor: pointer;
}

.help-list-item.active,
.help-list-item:hover {
  background: #eef6ff;
}

.help-list-item span,
.help-list-item small {
  color: #6b7280;
  font-size: 12px;
}

.help-content {
  min-height: 0;
  overflow-y: auto;
  padding: 18px;
}

.help-title-row {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 14px;
  margin-bottom: 16px;
}

.help-title-row h2 {
  margin: 0;
  color: #111827;
  font-size: 20px;
}

.help-title-row p {
  margin: 6px 0 0;
  color: #6b7280;
}

.markdown-body {
  color: #1f2937;
  line-height: 1.75;
}

.markdown-body :deep(h1),
.markdown-body :deep(h2),
.markdown-body :deep(h3) {
  margin: 18px 0 8px;
  color: #111827;
}

.markdown-body :deep(p) {
  margin: 8px 0;
}

.markdown-body :deep(pre) {
  overflow-x: auto;
  padding: 12px;
  border-radius: 6px;
  background: #111827;
  color: #f9fafb;
}

.markdown-body :deep(code) {
  padding: 1px 4px;
  border-radius: 4px;
  background: #eef2ff;
}

.markdown-body :deep(pre code) {
  padding: 0;
  background: transparent;
}

.markdown-body :deep(img) {
  max-width: 100%;
  border-radius: 6px;
}

@media (max-width: 720px) {
  .help-layout {
    grid-template-columns: 1fr;
  }

  .help-list {
    max-height: 220px;
    border-right: 0;
    border-bottom: 1px solid #e5e7eb;
  }
}
</style>
