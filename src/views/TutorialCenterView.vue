<template>
  <section>
    <div class="page-header">
      <div>
        <h1 class="page-title">教程中心</h1>
        <p class="page-subtitle">按分类查看教程，选择标题后在右侧阅读正文。</p>
      </div>
      <el-button @click="loadAll(true)">刷新</el-button>
    </div>

    <div class="tutorial-shell">
      <div class="search-bar">
        <el-input
          v-model.trim="filters.keyword"
          clearable
          placeholder="搜索教程、规则或关键操作"
          @keyup.enter="loadTutorials(true)"
          @clear="loadTutorials(true)"
        />
        <el-button type="primary" @click="loadTutorials(true)">搜索</el-button>
      </div>

      <div class="tutorial-columns" v-loading="loading">
        <aside class="category-column">
          <button
            type="button"
            class="category-item"
            :class="{ active: !filters.category_id }"
            @click="selectCategory('')"
          >
            <strong>全部教程</strong>
            <span>{{ tutorials.length }} 篇</span>
          </button>
          <button
            v-for="category in categories"
            :key="category.id"
            type="button"
            class="category-item"
            :class="{ active: filters.category_id === category.id }"
            @click="selectCategory(category.id)"
          >
            <strong>{{ category.name }}</strong>
            <span>{{ categoryCount(category.id) }} 篇</span>
          </button>
        </aside>

        <aside class="title-column">
          <button
            v-for="tutorial in visibleTutorials"
            :key="tutorial.id"
            type="button"
            class="title-item"
            :class="{ active: selected?.id === tutorial.id }"
            @click="selectTutorial(tutorial)"
          >
            <div class="title-item-main">
              <strong>{{ tutorial.title }}</strong>
              <span>{{ tutorial.summary || tutorial.category_name || '教程正文' }}</span>
            </div>
            <div class="title-item-meta">
              <small>{{ formatDate(tutorial.updated_at || tutorial.published_at) }}</small>
              <el-tag :type="tutorial.is_read ? 'info' : 'warning'">
                {{ tutorial.is_read ? '已读' : '未读' }}
              </el-tag>
            </div>
            <div v-if="tutorial.page_keys?.length" class="page-key-tags">
              <el-tag
                v-for="key in tutorial.page_keys.slice(0, 2)"
                :key="key"
                size="small"
                type="info"
              >
                {{ pageKeyText(key) }}
              </el-tag>
            </div>
          </button>
          <el-empty v-if="visibleTutorials.length === 0 && !loading" description="暂无教程" />
        </aside>

        <article class="content-column">
          <template v-if="selected">
            <header class="reader-header">
              <div>
                <h2>{{ selected.title }}</h2>
                <p>{{ selected.summary || selected.category_name || '教程正文' }}</p>
              </div>
              <el-tag :type="selected.is_read ? 'info' : 'warning'">
                {{ selected.is_read ? '已读' : '未读' }}
              </el-tag>
            </header>

            <div
              v-if="selected.content_markdown?.trim()"
              class="markdown-body"
              v-html="renderMarkdown(selected.content_markdown)"
            />
            <el-empty v-else description="这篇教程还没有正文" />
          </template>
          <el-empty v-else description="请选择左侧教程标题" />
        </article>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import { ElMessage } from 'element-plus'
import { errorText } from '@/api/http'
import {
  getTutorial,
  listTutorialCategories,
  listTutorials,
  markTutorialRead,
} from '@/api/tutorials'
import type { Tutorial, TutorialCategory } from '@/api/types'
import { createCacheKey, readCache, writeCache } from '@/utils/cache'
import { renderMarkdown } from '@/utils/markdown'
import { formatBeijingTime } from '@/utils/time'

const pageKeyLabels: Record<string, string> = {
  dashboard: '仪表盘',
  douyin_account_login: '抖音号',
  send_task_config: '发送任务',
  messages: '消息中心',
  account_settings: '账号设置',
  redeem_code: '兑换码',
  activity_square: '活动广场',
  tutorial_center: '教程中心',
  storage_state_import: '登录态导入',
  admin_douyin_accounts: '抖音号管理',
  admin_notices: '通知发布',
  admin_support: '用户咨询',
  send_schedule_slots: '全局轮次管理',
  admin_redeem_codes: '兑换码管理',
  admin_activities: '活动管理',
  tutorial_management: '教程管理',
  admin_users: '账户管理',
}

const categories = ref<TutorialCategory[]>([])
const tutorials = ref<Tutorial[]>([])
const selected = ref<Tutorial | null>(null)
const loading = ref(false)
const filters = reactive({
  category_id: '',
  keyword: '',
})
const CATEGORY_CACHE_TTL = 1000 * 60 * 60
const TUTORIAL_CACHE_TTL = 1000 * 60 * 60

function categoriesCacheKey() {
  return 'tutorial-center:categories:v1'
}

function tutorialsCacheKey() {
  return createCacheKey('tutorial-center:list:v1', {
    category_id: filters.category_id || '',
    keyword: filters.keyword || '',
  })
}

function persistTutorialCache() {
  writeCache(tutorialsCacheKey(), {
    tutorials: tutorials.value,
    selected: selected.value,
  })
}

const visibleTutorials = computed(() => {
  return tutorials.value
    .filter((tutorial) => !filters.category_id || tutorial.category_id === filters.category_id)
    .sort((left, right) => (left.sort_order || 0) - (right.sort_order || 0))
})

onMounted(loadAll)

async function loadAll(force = false) {
  await Promise.all([loadCategories(force), loadTutorials(force)])
}

async function loadCategories(force = false) {
  if (!force) {
    const cached = readCache<TutorialCategory[]>(categoriesCacheKey(), CATEGORY_CACHE_TTL)
    if (cached) {
      categories.value = cached
    }
  }
  try {
    const data = await listTutorialCategories()
    categories.value = data
    writeCache(categoriesCacheKey(), data)
  } catch (error) {
    ElMessage.error(errorText(error))
  }
}

async function loadTutorials(force = false) {
  const cacheKey = tutorialsCacheKey()
  if (!force) {
    const cached = readCache<{ tutorials: Tutorial[]; selected: Tutorial | null }>(
      cacheKey,
      TUTORIAL_CACHE_TTL,
    )
    if (cached) {
      tutorials.value = cached.tutorials || []
      selected.value = cached.selected || null
    }
    loading.value = !cached
  } else {
    loading.value = true
  }
  try {
    const data = await listTutorials({
      page: 1,
      page_size: 100,
      keyword: filters.keyword || undefined,
    })
    tutorials.value = data.items || []
    if (selected.value && !tutorials.value.some((tutorial) => tutorial.id === selected.value?.id)) {
      selected.value = null
    }
    if (!selected.value && visibleTutorials.value.length > 0) {
      await selectTutorial(visibleTutorials.value[0])
    }
    if (tutorials.value.length === 0) {
      selected.value = null
    }
    persistTutorialCache()
  } catch (error) {
    ElMessage.error(errorText(error))
  } finally {
    loading.value = false
  }
}

async function selectCategory(categoryId: string) {
  filters.category_id = categoryId
  if (visibleTutorials.value.length > 0) {
    await selectTutorial(visibleTutorials.value[0])
  } else {
    selected.value = null
    persistTutorialCache()
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
    persistTutorialCache()
  } catch (error) {
    ElMessage.error(errorText(error))
  }
}

function categoryCount(categoryId: string) {
  return tutorials.value.filter((tutorial) => tutorial.category_id === categoryId).length
}

function pageKeyText(key: string) {
  return pageKeyLabels[key] || key
}

function formatDate(value?: string) {
  return formatBeijingTime(value)
}
</script>

<style scoped>
.tutorial-shell {
  display: grid;
  grid-template-rows: auto minmax(0, 1fr);
  gap: 12px;
  height: calc(100vh - 138px);
  min-height: 560px;
}

.search-bar {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  gap: 10px;
  padding: 12px;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  background: #ffffff;
}

.tutorial-columns {
  display: grid;
  grid-template-columns: 144px 169px minmax(0, 1fr);
  min-height: 0;
  min-width: 720px;
  overflow: hidden;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  background: #ffffff;
}

.category-column,
.title-column,
.content-column {
  min-height: 0;
  overflow-y: auto;
}

.category-column {
  padding: 12px;
  border-right: 1px solid #e5e7eb;
  background: #f9fafb;
}

.title-column {
  padding: 12px;
  border-right: 1px solid #e5e7eb;
}

.content-column {
  padding: 24px;
}

.category-item,
.title-item {
  width: 100%;
  border: 1px solid #e5e7eb;
  border-radius: 6px;
  background: #ffffff;
  color: #111827;
  text-align: left;
  cursor: pointer;
}

.category-item {
  display: flex;
  justify-content: space-between;
  gap: 10px;
  padding: 12px;
}

.category-item + .category-item,
.title-item + .title-item {
  margin-top: 8px;
}

.category-item:hover,
.category-item.active,
.title-item:hover,
.title-item.active {
  border-color: #93c5fd;
  background: #eef6ff;
}

.category-item span {
  color: #6b7280;
  font-size: 12px;
  white-space: nowrap;
}

.title-item {
  display: grid;
  gap: 10px;
  padding: 12px;
}

.title-item-main {
  display: grid;
  gap: 6px;
}

.title-item-main strong {
  font-size: 15px;
}

.title-item-main span,
.title-item-meta small,
.reader-header p {
  color: #6b7280;
}

.title-item-main span,
.title-item-meta small {
  font-size: 12px;
  line-height: 1.5;
}

.title-item-meta {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}

.page-key-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.reader-header {
  display: flex;
  justify-content: space-between;
  gap: 16px;
  margin-bottom: 18px;
  padding-bottom: 16px;
  border-bottom: 1px solid #e5e7eb;
}

.reader-header h2 {
  margin: 0;
  color: #111827;
  font-size: 26px;
}

.reader-header p {
  margin: 8px 0 0;
}

.markdown-body {
  color: #1f2937;
  font-size: 15px;
  line-height: 1.8;
}

.markdown-body :deep(h1),
.markdown-body :deep(h2),
.markdown-body :deep(h3) {
  margin: 22px 0 10px;
  color: #111827;
}

.markdown-body :deep(p) {
  margin: 10px 0;
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

@media (max-width: 980px) {
  .tutorial-shell {
    overflow-x: auto;
  }

  .tutorial-columns {
    grid-template-columns: 144px 169px minmax(400px, 1fr);
  }
}
</style>
