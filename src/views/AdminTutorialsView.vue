<template>
  <section>
    <div class="page-header">
      <div>
        <h1 class="page-title">教程管理</h1>
        <p class="page-subtitle">先建立分类，再编写教程。发布后用户可在教程中心查看，关联页面后也会出现在右上角帮助抽屉。</p>
      </div>
      <el-button type="primary" :loading="importingRecommended" @click="importRecommendedTutorials">
        导入推荐教程
      </el-button>
    </div>

    <div class="content-panel tutorial-admin-panel">
      <div class="panel-body tutorial-admin-body">
        <div class="usage-guide">
          <div>
            <strong>使用顺序</strong>
            <span>新增分类 → 新增教程 → 选择关联页面 → 发布教程</span>
          </div>
          <div>
            <strong>发布规则</strong>
            <span>草稿只有管理员可见；发布后普通用户可见；隐藏后普通用户不再看到。</span>
          </div>
          <div>
            <strong>关联页面</strong>
            <span>不选择也可以，教程只出现在教程中心；选择页面后，会出现在对应页面右上角帮助按钮里。</span>
          </div>
          <div>
            <strong>推荐教程</strong>
            <span>可一键导入常用规则说明，已存在同名教程会自动跳过。</span>
          </div>
        </div>

        <el-segmented v-model="activeTab" :options="tabOptions" class="admin-tabs" />

        <div v-show="activeTab === 'categories'" class="admin-section">
          <div class="toolbar">
            <strong>教程分类</strong>
            <el-button type="primary" @click="openCategoryDialog()">新增分类</el-button>
          </div>
          <div class="table-scroll">
            <el-table :data="categories" v-loading="categoryLoading" height="100%">
              <el-table-column prop="name" label="分类名称" min-width="140" fixed="left" />
              <el-table-column prop="description" label="说明" min-width="220" />
              <el-table-column prop="sort_order" label="排序" width="90" />
              <el-table-column label="状态" width="100">
                <template #default="{ row }">
                  <el-tag :type="row.status === 'active' ? 'success' : 'info'">
                    {{ categoryStatusText(row.status) }}
                  </el-tag>
                </template>
              </el-table-column>
              <el-table-column label="更新时间" min-width="170">
                <template #default="{ row }">{{ formatBeijingTime(row.updated_at) }}</template>
              </el-table-column>
              <el-table-column label="操作" width="100" fixed="right">
                <template #default="{ row }">
                  <el-button link type="primary" @click="openCategoryDialog(row)">编辑</el-button>
                </template>
              </el-table-column>
            </el-table>
          </div>
        </div>

        <div v-show="activeTab === 'tutorials'" class="admin-section">
          <div class="toolbar tutorial-toolbar">
            <div class="filter-row">
              <el-select v-model="tutorialFilters.category_id" clearable placeholder="分类" style="width: 150px">
                <el-option
                  v-for="category in categories"
                  :key="category.id"
                  :label="category.name"
                  :value="category.id"
                />
              </el-select>
              <el-select v-model="tutorialFilters.status" clearable placeholder="状态" style="width: 130px">
                <el-option label="草稿" value="draft" />
                <el-option label="已发布" value="published" />
                <el-option label="已隐藏" value="hidden" />
              </el-select>
              <el-select
                v-model="tutorialFilters.page_key"
                clearable
                filterable
                placeholder="关联页面"
                style="width: 180px"
              >
                <el-option
                  v-for="option in pageKeyOptions"
                  :key="option.value"
                  :label="option.label"
                  :value="option.value"
                />
              </el-select>
              <el-input v-model.trim="tutorialFilters.keyword" clearable placeholder="关键词" />
              <el-button @click="loadTutorials()">筛选</el-button>
            </div>
            <el-button type="primary" @click="openTutorialDialog()">新增教程</el-button>
          </div>
          <div class="table-scroll">
            <el-table :data="tutorials" v-loading="tutorialLoading" height="100%">
              <el-table-column prop="title" label="标题" min-width="180" fixed="left" />
              <el-table-column prop="category_name" label="分类" min-width="120" />
              <el-table-column prop="summary" label="摘要" min-width="220" />
              <el-table-column label="页面 key" min-width="180">
                <template #default="{ row }">{{ (row.page_keys || []).join(', ') || '-' }}</template>
              </el-table-column>
              <el-table-column prop="sort_order" label="排序" width="80" />
              <el-table-column label="状态" width="100">
                <template #default="{ row }">
                  <el-tag :type="tutorialStatusTag(row.status)">{{ tutorialStatusText(row.status) }}</el-tag>
                </template>
              </el-table-column>
              <el-table-column label="更新时间" min-width="170">
                <template #default="{ row }">{{ formatBeijingTime(row.updated_at) }}</template>
              </el-table-column>
              <el-table-column label="操作" width="230" fixed="right">
                <template #default="{ row }">
                  <el-button link type="primary" @click="openTutorialDialog(row)">编辑</el-button>
                  <el-button v-if="row.status !== 'published'" link type="success" @click="publish(row.id)">发布</el-button>
                  <el-button v-if="row.status !== 'hidden'" link type="warning" @click="hide(row.id)">隐藏</el-button>
                  <el-button v-if="row.status !== 'draft'" link @click="draft(row.id)">草稿</el-button>
                </template>
              </el-table-column>
            </el-table>
          </div>
          <div class="pagination-row">
            <el-pagination
              v-model:current-page="tutorialPage"
              :page-size="20"
              layout="prev, pager, next, total"
              :total="tutorialTotal"
              @current-change="loadTutorials()"
            />
          </div>
        </div>
      </div>
    </div>

    <el-dialog v-model="categoryDialogOpen" :title="editingCategory ? '编辑分类' : '新增分类'" width="520px">
      <el-form :model="categoryForm" label-position="top">
        <el-form-item label="分类名称">
          <el-input v-model.trim="categoryForm.name" maxlength="40" show-word-limit placeholder="例如：自动发送教程" />
        </el-form-item>
        <el-form-item label="说明">
          <el-input
            v-model="categoryForm.description"
            type="textarea"
            :rows="3"
            maxlength="500"
            show-word-limit
            placeholder="告诉管理员和用户这个分类主要放哪些教程。"
          />
        </el-form-item>
        <el-form-item label="排序">
          <el-input-number v-model="categoryForm.sort_order" :min="0" :step="1" />
        </el-form-item>
        <el-form-item label="状态">
          <el-segmented v-model="categoryForm.status" :options="categoryStatusOptions" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="categoryDialogOpen = false">取消</el-button>
        <el-button type="primary" :loading="saving" @click="saveCategory">保存</el-button>
      </template>
    </el-dialog>

    <el-dialog v-model="tutorialDialogOpen" :title="editingTutorial ? '编辑教程' : '新增教程'" width="860px">
      <el-form :model="tutorialForm" label-position="top">
        <div class="form-grid">
          <el-form-item label="教程分类">
            <el-select v-model="tutorialForm.category_id" placeholder="选择分类">
              <el-option
                v-for="category in categories"
                :key="category.id"
                :label="category.name"
                :value="category.id"
              />
            </el-select>
          </el-form-item>
          <el-form-item label="状态">
            <el-segmented v-model="tutorialForm.status" :options="tutorialStatusOptions" />
            <p class="field-help">草稿不会给普通用户看；发布后用户可见；隐藏后普通用户不可见。</p>
          </el-form-item>
        </div>
        <el-form-item label="标题">
          <el-input v-model.trim="tutorialForm.title" maxlength="80" show-word-limit placeholder="例如：如何配置发送任务" />
        </el-form-item>
        <el-form-item label="摘要">
          <el-input
            v-model="tutorialForm.summary"
            type="textarea"
            :rows="2"
            maxlength="300"
            show-word-limit
            placeholder="一句话说明这篇教程解决什么问题。"
          />
        </el-form-item>
        <div class="form-grid">
          <el-form-item label="关联页面（可选）">
            <el-select
              v-model="pageKeysValue"
              multiple
              filterable
              allow-create
              default-first-option
              placeholder="选择教程要出现在哪些页面的帮助抽屉里"
            >
              <el-option
                v-for="option in pageKeyOptions"
                :key="option.value"
                :label="option.label"
                :value="option.value"
              />
            </el-select>
            <p class="field-help">不选择时，教程只显示在教程中心；选择后，用户在对应页面点右上角帮助按钮也能看到。</p>
          </el-form-item>
          <el-form-item label="排序">
            <el-input-number v-model="tutorialForm.sort_order" :min="0" :step="1" />
            <p class="field-help">数字越小越靠前；不知道填什么就保持 0。</p>
          </el-form-item>
        </div>
        <el-form-item label="正文内容">
          <div class="content-tools">
            <span>可以直接写普通文字；也支持 Markdown 标题、列表和分段。</span>
            <el-button link type="primary" @click="insertTutorialTemplate">插入示例模板</el-button>
          </div>
          <el-input
            v-model="tutorialForm.content_markdown"
            type="textarea"
            :rows="12"
            maxlength="20000"
            show-word-limit
            placeholder="把教程步骤写在这里。普通文字也可以，不会写 Markdown 也没关系。"
          />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="tutorialDialogOpen = false">取消</el-button>
        <el-button type="primary" :loading="saving" @click="saveTutorial">保存</el-button>
      </template>
    </el-dialog>
  </section>
</template>

<script setup lang="ts">
import { onMounted, reactive, ref } from 'vue'
import { ElMessage } from 'element-plus'
import { errorText } from '@/api/http'
import {
  createAdminTutorial,
  createAdminTutorialCategory,
  draftAdminTutorial,
  getAdminTutorial,
  hideAdminTutorial,
  listAdminTutorialCategories,
  listAdminTutorials,
  publishAdminTutorial,
  updateAdminTutorial,
  updateAdminTutorialCategory,
} from '@/api/tutorials'
import type { Tutorial, TutorialCategory } from '@/api/types'
import { createCacheKey, readCache, writeCache } from '@/utils/cache'
import { formatBeijingTime } from '@/utils/time'

interface RecommendedTutorial {
  categoryName: string
  categoryDescription: string
  categorySort: number
  title: string
  summary: string
  pageKeys: string[]
  sortOrder: number
  content: string
}

const tabOptions = [
  { label: '教程文章', value: 'tutorials' },
  { label: '分类管理', value: 'categories' },
]
const pageKeyOptions = [
  { label: '仪表盘', value: 'dashboard' },
  { label: '抖音号列表 / 登录', value: 'douyin_account_login' },
  { label: '抖音号详情 / 发送任务配置', value: 'send_task_config' },
  { label: '消息中心', value: 'messages' },
  { label: '账号设置', value: 'account_settings' },
  { label: '我的兑换码', value: 'redeem_code' },
  { label: '活动广场', value: 'activity_square' },
  { label: '教程中心', value: 'tutorial_center' },
  { label: '管理员：登录态导入', value: 'storage_state_import' },
  { label: '管理员：抖音号管理', value: 'admin_douyin_accounts' },
  { label: '管理员：通知发布', value: 'admin_notices' },
  { label: '管理员：用户咨询', value: 'admin_support' },
  { label: '管理员：全局轮次管理', value: 'send_schedule_slots' },
  { label: '管理员：兑换码管理', value: 'admin_redeem_codes' },
  { label: '管理员：活动管理', value: 'admin_activities' },
  { label: '管理员：教程管理', value: 'tutorial_management' },
  { label: '管理员：账户管理', value: 'admin_users' },
]
const categoryStatusOptions = [
  { label: '显示', value: 'active' },
  { label: '隐藏', value: 'hidden' },
]
const tutorialStatusOptions = [
  { label: '草稿', value: 'draft' },
  { label: '发布', value: 'published' },
  { label: '隐藏', value: 'hidden' },
]

const activeTab = ref<'categories' | 'tutorials'>('tutorials')
const categories = ref<TutorialCategory[]>([])
const tutorials = ref<Tutorial[]>([])
const categoryLoading = ref(false)
const tutorialLoading = ref(false)
const saving = ref(false)
const importingRecommended = ref(false)
const tutorialPage = ref(1)
const tutorialTotal = ref(0)

const categoryDialogOpen = ref(false)
const tutorialDialogOpen = ref(false)
const editingCategory = ref<TutorialCategory | null>(null)
const editingTutorial = ref<Tutorial | null>(null)
const pageKeysValue = ref<string[]>([])

const tutorialFilters = reactive({
  category_id: '',
  status: '',
  page_key: '',
  keyword: '',
})
const CATEGORY_CACHE_TTL = 1000 * 60 * 5
const TUTORIAL_CACHE_TTL = 1000 * 60

function categoriesCacheKey() {
  return createCacheKey('admin-tutorial-categories:list:v1')
}

function tutorialsCacheKey() {
  return createCacheKey('admin-tutorials:list:v1', {
    page: tutorialPage.value,
    category_id: tutorialFilters.category_id || '',
    status: tutorialFilters.status || '',
    page_key: tutorialFilters.page_key || '',
    keyword: tutorialFilters.keyword || '',
  })
}
const categoryForm = reactive({
  name: '',
  description: '',
  status: 'active',
  sort_order: 0,
})
const tutorialForm = reactive({
  category_id: '',
  title: '',
  summary: '',
  content_markdown: '',
  status: 'draft',
  sort_order: 0,
})

const recommendedTutorials: RecommendedTutorial[] = [
  {
    categoryName: '自动发送与轮询',
    categoryDescription: '自动发送任务、轮次、轮询资格和不发送排查。',
    categorySort: 1,
    title: '成功参与自动发送轮询需要满足哪些条件',
    summary: '说明抖音号进入自动发送号池前必须同时满足的条件。',
    pageKeys: ['send_task_config', 'douyin_account_login'],
    sortOrder: 1,
    content: [
      '## 核心结论',
      '',
      '抖音号想成功参与自动发送轮询，不是只打开一个开关就可以。系统会在轮次到达时重新检查一遍当前配置，只有所有条件都满足，才会进入本轮自动发送。',
      '',
      '## 必须同时满足的条件',
      '',
      '- 抖音号状态是已启用。',
      '- 抖音号登录态正常，最近登录状态验证结果为正常。',
      '- 抖音号已经开通轮询资格，并且资格没有过期。',
      '- 自动发送开关已经开启。',
      '- 当前抖音号下至少有一个已启用的发送任务。',
      '- 发送任务已经选择至少一个管理员开放的启用轮次。',
      '- 当前时间到达了某个启用轮次的触发时间。',
      '- 发送目标规则能匹配到好友或群聊。',
      '',
      '## 哪些配置不会被自动删除',
      '',
      '- 轮询资格过期不会删除发送任务。',
      '- 登录态异常不会删除任务配置。',
      '- 管理员禁用轮次不会清空用户原来选择的轮次。',
      '- 管理员重新启用旧轮次时，原来手动选择过该轮次的任务会继续参与。',
      '',
      '## 常见不发送原因',
      '',
      '- 没有兑换轮询资格，或者资格已经过期。',
      '- 登录态失效，虽然配置还在，但浏览器检查时已经无法正常访问抖音。',
      '- 自动发送没有开启。',
      '- 发送任务处于暂停状态。',
      '- 没有选择任何启用轮次。',
      '- 管理员把轮次禁用了。',
      '- 好友备注或群聊名称没有匹配到填写的关键词。',
      '',
      '## 建议排查顺序',
      '',
      '1. 先查看抖音号详情里的轮询资格是否有效。',
      '2. 点击最近登录状态验证，确认登录态正常。',
      '3. 查看自动发送是否已开启。',
      '4. 打开发送任务，确认任务已启用并选择了轮次。',
      '5. 检查发送给好友和发送到群聊的匹配规则。',
      '6. 查看运行记录，确认最近一次是否有跳过或失败原因。',
    ].join('\n'),
  },
  {
    categoryName: '自动发送与轮询',
    categoryDescription: '自动发送任务、轮次、轮询资格和不发送排查。',
    categorySort: 1,
    title: '自动加入新增轮次是什么意思',
    summary: '解释自动加入新增轮次开关的影响范围。',
    pageKeys: ['send_task_config'],
    sortOrder: 2,
    content: [
      '## 这个开关控制什么',
      '',
      '自动加入新增轮次只影响管理员以后新建的启用轮次。开启后，当前抖音号下已经启用的发送任务，会自动参与管理员以后新增的启用轮次。',
      '',
      '## 它不会做什么',
      '',
      '- 不会立刻全选当前已经存在的轮次。',
      '- 不会自动加入管理员禁用后又重新启用的旧轮次。',
      '- 不会影响已经暂停的发送任务。',
      '- 不会替用户删除或锁定已经选择的轮次。',
      '',
      '## 举例说明',
      '',
      '假设现在已有 10:00、14:00、20:00 三个轮次。用户今天打开自动加入新增轮次，系统不会自动勾选这三个旧轮次。',
      '',
      '之后管理员新增一个 23:00 夜间轮次，并且状态是启用。这个新轮次会自动加入当前抖音号下已启用的发送任务。',
      '',
      '## 用户仍然可以手动调整',
      '',
      '自动加入后，用户仍然可以在发送任务的参与轮次里取消某个轮次。取消后，该任务就不会再参与这个轮次。',
    ].join('\n'),
  },
  {
    categoryName: '自动发送与轮询',
    categoryDescription: '自动发送任务、轮次、轮询资格和不发送排查。',
    categorySort: 1,
    title: '发送轮次应该怎么选择',
    summary: '说明固定时间轮次、间隔轮次和任务参与轮次的关系。',
    pageKeys: ['send_task_config', 'send_schedule_slots'],
    sortOrder: 3,
    content: [
      '## 轮次是谁创建的',
      '',
      '发送轮次由管理员统一维护。普通用户不能自己随便填写发送周期秒数，只能选择参与哪些管理员开放的轮次。',
      '',
      '## 固定时间轮次',
      '',
      '固定时间轮次会在每天指定时间触发，例如 10:00、14:00、20:00、23:00。',
      '',
      '适合每天固定时间执行的自动发送任务。',
      '',
      '## 间隔轮次',
      '',
      '间隔轮次按固定间隔触发，例如每 1 小时触发一次。',
      '',
      '适合需要较均匀触发的自动发送任务。',
      '',
      '## 勾选轮次后发生什么',
      '',
      '发送任务勾选某个轮次后，当前任务会在该轮次触发时参与自动发送。',
      '',
      '如果任务没有勾选任何轮次，即使抖音号和登录态都正常，也不会参与自动发送。',
      '',
      '## 管理员禁用轮次的影响',
      '',
      '- 禁用轮次不会删除用户原来的选择。',
      '- 禁用期间不会执行该轮次。',
      '- 管理员重新启用旧轮次后，原来手动选过它的任务会继续参与。',
    ].join('\n'),
  },
  {
    categoryName: '发送任务配置',
    categoryDescription: '发送话术、好友匹配、群聊匹配和默认配置。',
    categorySort: 2,
    title: '发送话术怎么填写',
    summary: '说明一行一句随机发送、变量替换和敏感内容建议。',
    pageKeys: ['send_task_config'],
    sortOrder: 1,
    content: [
      '## 一行一句话术',
      '',
      '发送话术是一组候选消息。一行代表一句话术，系统发送时会从多行里随机选择一行。',
      '',
      '如果只填写一行，每次都会发送这一句。',
      '',
      '## 支持的变量',
      '',
      '- `{{datetime}}`：完整日期时间，例如 2026-06-06 20:30。',
      '- `{{date}}`：日期，例如 2026-06-06。',
      '- `{{time}}`：时间，例如 20:30。',
      '- `{{hour}}`：小时，例如 20。',
      '- `{{minute}}`：分钟，例如 30。',
      '',
      '示例：',
      '',
      '```text',
      '你好，现在是 {{time}}',
      '你好呀，今天 {{date}}',
      '我这边确认一下状态',
      '```',
      '',
      '## 不建议填写的内容',
      '',
      '不建议填写链接、二维码、验证码、随机码、兑换码、福利、中奖、返现、扫码、点击等敏感或营销味很强的内容。',
      '',
      '## 恢复推荐默认设置',
      '',
      '如果不确定怎么写，可以使用恢复推荐默认设置。恢复后会填入一组更自然的话术、默认好友匹配和群聊匹配规则。',
    ].join('\n'),
  },
  {
    categoryName: '发送任务配置',
    categoryDescription: '发送话术、好友匹配、群聊匹配和默认配置。',
    categorySort: 2,
    title: '发送给好友的匹配模式怎么用',
    summary: '解释前缀匹配、包含匹配和精确匹配。',
    pageKeys: ['send_task_config'],
    sortOrder: 2,
    content: [
      '## 好友匹配看什么',
      '',
      '发送给好友时，系统会根据好友备注进行匹配。前端会把你选择的匹配模式和填写的关键词传给后端。',
      '',
      '## 前缀匹配',
      '',
      '备注以填写内容开头才会匹配成功。',
      '',
      '例如填写 `000_`，好友备注是 `000_张三` 可以匹配，备注是 `张三000_` 不匹配。',
      '',
      '使用前缀匹配时，注意不要在关键词前后多打空格。',
      '',
      '## 包含匹配',
      '',
      '备注任意位置包含填写内容就可以匹配。',
      '',
      '例如填写 `测试`，备注是 `张三测试号` 可以匹配。',
      '',
      '## 精确匹配',
      '',
      '备注与填写内容一致或接近一致时匹配。',
      '',
      '适合只想发给一个明确备注的好友。',
      '',
      '## 温馨提示',
      '',
      '不建议在匹配词里填写特殊符号。特殊符号容易造成用户以为能匹配，但实际备注并不一致。',
    ].join('\n'),
  },
  {
    categoryName: '发送任务配置',
    categoryDescription: '发送话术、好友匹配、群聊匹配和默认配置。',
    categorySort: 2,
    title: '发送到群聊的关键词怎么填写',
    summary: '说明群聊多个关键词、包含任意一个和同时包含全部。',
    pageKeys: ['send_task_config'],
    sortOrder: 3,
    content: [
      '## 群聊匹配看什么',
      '',
      '发送到群聊时，系统会根据群聊名称进行匹配。',
      '',
      '## 多个关键词怎么隔开',
      '',
      '多个关键词用空格隔开。空格数量没有特殊要求，前端会按空格拆分关键词。',
      '',
      '例如：',
      '',
      '```text',
      '测试 群聊',
      '```',
      '',
      '会被拆成 `测试` 和 `群聊` 两个关键词。',
      '',
      '## 包含任意一个关键词',
      '',
      '这是或运算。群名包含任意一个关键词就会匹配。',
      '',
      '例如关键词是 `测试 群聊`，群名包含 `测试` 或包含 `群聊` 都可以。',
      '',
      '## 同时包含全部关键词',
      '',
      '这是与运算。群名必须同时包含所有关键词才会匹配。',
      '',
      '例如关键词是 `测试 群聊`，群名必须同时包含 `测试` 和 `群聊`。',
      '',
      '## 温馨提示',
      '',
      '不建议填入特殊符号哦。特殊符号可能导致群名看起来相似，但实际匹配不上。',
    ].join('\n'),
  },
  {
    categoryName: '抖音号与登录态',
    categoryDescription: '扫码登录、远程浏览器登录、登录态验证和重新登录。',
    categorySort: 3,
    title: '如何新增或重新登录抖音号',
    summary: '说明扫码登录、远程浏览器登录和取消操作。',
    pageKeys: ['douyin_account_login'],
    sortOrder: 1,
    content: [
      '## 登录方式',
      '',
      '新增或重新登录抖音号时，控制台会先询问使用扫码登录还是远程浏览器登录，选择后才创建登录会话。',
      '',
      '扫码登录会在控制台展示后端生成的二维码；扫码后如需短信验证，可以直接在控制台提交验证码。遇到滑块或额外风控时，控制台会提供远程浏览器作为兜底。',
      '',
      '远程浏览器登录会打开 noVNC 页面，由你在远程窗口中完成扫码、滑块、短信验证和保存登录信息。',
      '',
      '## 基本流程',
      '',
      '1. 在控制台点击新增抖音号或重新登录。',
      '2. 选择扫码登录或远程浏览器登录。',
      '3. 按所选方式完成扫码、短信验证或额外风控。',
      '4. 控制台持续更新登录会话状态。',
      '5. 登录成功后自动刷新抖音号列表。',
      '',
      '## login_confirming 状态是什么意思',
      '',
      '远程浏览器模式进入确认阶段时，请检查远程窗口里是否还有未处理的滑块、风控提示或保存登录信息弹窗。',
      '',
      '确认远程窗口没有阻塞后，可以点击确认，提前结束等待。',
      '',
      '## 取消登录',
      '',
      '如果不想继续登录，请点击取消。取消会释放当前 Playwright 浏览器以及可能启动的远程浏览器资源。',
    ].join('\n'),
  },
  {
    categoryName: '抖音号与登录态',
    categoryDescription: '远程浏览器登录、登录态验证和重新登录。',
    categorySort: 3,
    title: '最近登录状态验证有什么用',
    summary: '解释登录态验证只能说明验证时刻是否正常。',
    pageKeys: ['send_task_config', 'douyin_account_login'],
    sortOrder: 2,
    content: [
      '## 验证登录态是什么',
      '',
      '验证登录态会让服务端启动浏览器检查当前抖音号的登录状态是否还正常。',
      '',
      '## 它能说明什么',
      '',
      '验证成功表示在验证那一刻，登录态可以正常使用。',
      '',
      '但它不能保证以后一直有效。抖音登录态可能因为风控、异地环境、长期未使用等原因失效。',
      '',
      '## 什么时候需要验证',
      '',
      '- 新增或重新登录抖音号后。',
      '- 开启自动发送前。',
      '- 运行记录显示登录态异常时。',
      '- 长时间没有发送过消息时。',
      '',
      '## 验证失败怎么办',
      '',
      '如果验证失败，建议重新发起远程浏览器登录。登录成功后再验证一次登录状态。',
    ].join('\n'),
  },
  {
    categoryName: '兑换码与轮询资格',
    categoryDescription: '兑换码领取、兑换、转赠和有效期规则。',
    categorySort: 4,
    title: '轮询资格和兑换码是什么关系',
    summary: '说明兑换码如何给抖音号增加轮询资格。',
    pageKeys: ['redeem_code', 'send_task_config', 'activity_square'],
    sortOrder: 1,
    content: [
      '## 轮询资格是什么',
      '',
      '轮询资格决定某个抖音号是否可以进入自动发送号池。没有有效资格的抖音号，即使任务和轮次配置正确，也不会参与自动发送。',
      '',
      '## 兑换码有什么用',
      '',
      '兑换码可以兑换到一个抖音号上，为这个抖音号增加轮询资格天数。',
      '',
      '一张兑换码只能兑换一次，只能兑换到一个抖音号。',
      '',
      '## 可以转赠吗',
      '',
      '可以。兑换码允许转赠，不限制只能本人使用。朋友拿到兑换码后，可以兑换到自己管理的抖音号。',
      '',
      '## 有效期怎么计算',
      '',
      '- 如果抖音号资格未过期，新兑换天数会顺延累加。',
      '- 如果资格已过期或未开通过，会从当前时间开始计算。',
      '',
      '## 资格过期会发生什么',
      '',
      '资格过期只是不再进入自动发送号池，不会删除发送任务，不会清空轮次绑定，也不会自动改掉用户配置。',
    ].join('\n'),
  },
  {
    categoryName: '兑换码与轮询资格',
    categoryDescription: '兑换码领取、兑换、转赠和有效期规则。',
    categorySort: 4,
    title: '活动广场怎么领取兑换码',
    summary: '说明活动领取规则和领取后的兑换流程。',
    pageKeys: ['activity_square', 'redeem_code'],
    sortOrder: 2,
    content: [
      '## 活动广场是什么',
      '',
      '活动广场用于领取管理员发布的兑换码活动。领取成功后，系统会给当前账户生成一张兑换码。',
      '',
      '## 领取规则',
      '',
      '- 每个账号每个活动通常只能领取一次。',
      '- 活动可能有库存限制。',
      '- 活动暂停、结束或库存已领完时不能继续领取。',
      '',
      '## 领取成功后在哪里看',
      '',
      '领取成功后，兑换码会出现在我的兑换码页面。',
      '',
      '## 下一步怎么做',
      '',
      '拿到兑换码后，需要去抖音号详情或自动发送设置里，把兑换码兑换到某个抖音号上。',
      '',
      '兑换成功后，这个抖音号才会获得或延长轮询资格。',
    ].join('\n'),
  },
  {
    categoryName: '消息与通知',
    categoryDescription: '系统通知、联系管理员和世界聊天窗口。',
    categorySort: 5,
    title: '消息中心三个选项分别是什么',
    summary: '说明系统通知、联系管理员、世界聊天窗口的用途。',
    pageKeys: ['messages'],
    sortOrder: 1,
    content: [
      '## 系统通知',
      '',
      '系统通知用于查看管理员发布的公告。比如维护提醒、规则变化、活动说明等。',
      '',
      '## 联系管理员',
      '',
      '联系管理员用于向管理员发起咨询。普通用户可以在这里留言，管理员会在用户咨询页面回复。',
      '',
      '## 世界聊天窗口',
      '',
      '世界聊天窗口是公开聊天区域。管理员可以撤回消息，也可以禁言或解除禁言用户。',
      '',
      '## 消息被撤回后怎么显示',
      '',
      '管理员视角可以看到已撤回消息和原消息内容。普通用户只能看到管理员撤回了一条消息。',
      '',
      '## 输入框怎么使用',
      '',
      '聊天输入框会随着内容行数自动向上扩展，到达最大高度后继续输入会在输入框内部滚动。',
    ].join('\n'),
  },
  {
    categoryName: '账户与安全',
    categoryDescription: '登录、注册、找回密码和账号设置。',
    categorySort: 6,
    title: '账户 ID、QQ 邮箱和找回密码',
    summary: '说明控制台登录方式和 QQ 邮箱的作用。',
    pageKeys: ['account_settings'],
    sortOrder: 1,
    content: [
      '## 登录方式',
      '',
      '控制台支持账户 ID 登录。管理员账户可以使用管理员 ID，也可以使用 Admin 代替 ID。',
      '',
      '## QQ 邮箱有什么用',
      '',
      'QQ 邮箱用于接收验证码，主要用于注册、绑定或更改邮箱、重置密码等流程。',
      '',
      'QQ 邮箱需要是标准数字 QQ 邮箱，例如 123456@qq.com。',
      '',
      '## 忘记密码怎么办',
      '',
      '当前后端支持 QQ 邮箱验证码重置密码。进入忘记密码页面后，输入 QQ 邮箱并获取验证码，再设置新密码。',
      '',
      '## 密码规则',
      '',
      '密码长度 6-20 位；至少包含 1 个数字和 1 个非数字字符；可用大小写字母、数字、英文点号、下划线、短横线。',
      '',
      '## 修改昵称和邮箱',
      '',
      '登录后可以在账号设置页面修改昵称和 QQ 邮箱。更改 QQ 邮箱需要验证码。',
    ].join('\n'),
  },
]

onMounted(async () => {
  await loadCategories()
  await loadTutorials()
})

async function loadCategories(force = false) {
  if (!force) {
    const cached = readCache<TutorialCategory[]>(categoriesCacheKey(), CATEGORY_CACHE_TTL)
    if (cached) {
      categories.value = cached
    }
    categoryLoading.value = !cached
  } else {
    categoryLoading.value = true
  }
  try {
    categories.value = await listAdminTutorialCategories()
    writeCache(categoriesCacheKey(), categories.value)
  } catch (error) {
    ElMessage.error(errorText(error))
  } finally {
    categoryLoading.value = false
  }
}

async function loadTutorials(force = false) {
  if (!force) {
    const cached = readCache<{ tutorials: Tutorial[]; total: number }>(
      tutorialsCacheKey(),
      TUTORIAL_CACHE_TTL,
    )
    if (cached) {
      tutorials.value = cached.tutorials
      tutorialTotal.value = cached.total
    }
    tutorialLoading.value = !cached
  } else {
    tutorialLoading.value = true
  }
  try {
    const data = await listAdminTutorials({
      page: tutorialPage.value,
      page_size: 20,
      category_id: tutorialFilters.category_id || undefined,
      status: tutorialFilters.status || undefined,
      page_key: tutorialFilters.page_key || undefined,
      keyword: tutorialFilters.keyword || undefined,
    })
    tutorials.value = data.items || []
    tutorialTotal.value = data.total || 0
    writeCache(tutorialsCacheKey(), {
      tutorials: tutorials.value,
      total: tutorialTotal.value,
    })
  } catch (error) {
    ElMessage.error(errorText(error))
  } finally {
    tutorialLoading.value = false
  }
}

async function importRecommendedTutorials() {
  importingRecommended.value = true
  try {
    await loadCategories(true)
    await loadTutorials(true)

    const categoryMap = new Map(categories.value.map((category) => [category.name, category]))
    const titleSet = new Set(tutorials.value.map((tutorial) => tutorial.title))
    let createdCategoryCount = 0
    let createdTutorialCount = 0
    let skippedTutorialCount = 0

    for (const item of recommendedTutorials) {
      let category = categoryMap.get(item.categoryName)
      if (!category) {
        category = await createAdminTutorialCategory({
          name: item.categoryName,
          description: item.categoryDescription,
          status: 'active',
          sort_order: item.categorySort,
        })
        categoryMap.set(category.name, category)
        createdCategoryCount += 1
      }

      if (titleSet.has(item.title)) {
        skippedTutorialCount += 1
        continue
      }

      await createAdminTutorial({
        category_id: category.id,
        title: item.title,
        summary: item.summary,
        content_markdown: item.content,
        page_keys: item.pageKeys,
        status: 'published',
        sort_order: item.sortOrder,
      })
      titleSet.add(item.title)
      createdTutorialCount += 1
    }

    ElMessage.success(
      `推荐教程导入完成：新增分类 ${createdCategoryCount} 个，新增教程 ${createdTutorialCount} 篇，跳过 ${skippedTutorialCount} 篇。`,
    )
    await loadCategories(true)
    await loadTutorials(true)
  } catch (error) {
    ElMessage.error(errorText(error))
  } finally {
    importingRecommended.value = false
  }
}

function openCategoryDialog(category?: TutorialCategory) {
  editingCategory.value = category || null
  categoryForm.name = category?.name || ''
  categoryForm.description = category?.description || ''
  categoryForm.status = category?.status || 'active'
  categoryForm.sort_order = category?.sort_order || 0
  categoryDialogOpen.value = true
}

async function saveCategory() {
  if (!categoryForm.name.trim()) {
    ElMessage.warning('请输入分类名称。')
    return
  }
  saving.value = true
  try {
    if (editingCategory.value) {
      await updateAdminTutorialCategory(editingCategory.value.id, categoryForm)
      ElMessage.success('分类已更新。')
    } else {
      await createAdminTutorialCategory(categoryForm)
      ElMessage.success('分类已新增。')
    }
    categoryDialogOpen.value = false
    await loadCategories(true)
  } catch (error) {
    ElMessage.error(errorText(error))
  } finally {
    saving.value = false
  }
}

async function openTutorialDialog(tutorial?: Tutorial) {
  let current = tutorial
  if (tutorial?.id) {
    try {
      current = await getAdminTutorial(tutorial.id)
    } catch (error) {
      ElMessage.error(errorText(error))
      return
    }
  }
  editingTutorial.value = current || null
  tutorialForm.category_id = current?.category_id || categories.value[0]?.id || ''
  tutorialForm.title = current?.title || ''
  tutorialForm.summary = current?.summary || ''
  tutorialForm.content_markdown = current?.content_markdown || ''
  tutorialForm.status = current?.status || 'draft'
  tutorialForm.sort_order = current?.sort_order || 0
  pageKeysValue.value = [...(current?.page_keys || [])]
  tutorialDialogOpen.value = true
}

function pageKeys() {
  return pageKeysValue.value
    .map((item) => item.trim())
    .filter(Boolean)
}

function insertTutorialTemplate() {
  if (tutorialForm.content_markdown.trim()) {
    ElMessage.warning('正文已有内容，示例模板没有覆盖。')
    return
  }
  tutorialForm.content_markdown = [
    '## 适用场景',
    '',
    '这里说明这篇教程适合用户在什么情况下查看。',
    '',
    '## 操作步骤',
    '',
    '1. 第一步做什么。',
    '2. 第二步在哪里点击。',
    '3. 保存后应该看到什么结果。',
    '',
    '## 注意事项',
    '',
    '- 这里写容易出错的地方。',
    '- 这里写用户需要确认的条件。',
  ].join('\n')
}

async function saveTutorial() {
  if (!tutorialForm.category_id) {
    ElMessage.warning('请选择分类。')
    return
  }
  if (!tutorialForm.title.trim()) {
    ElMessage.warning('请输入教程标题。')
    return
  }
  if (!tutorialForm.content_markdown.trim()) {
    ElMessage.warning('请输入 Markdown 正文。')
    return
  }
  saving.value = true
  try {
    const payload = { ...tutorialForm, page_keys: pageKeys() }
    if (editingTutorial.value) {
      await updateAdminTutorial(editingTutorial.value.id, payload)
      ElMessage.success('教程已更新。')
    } else {
      await createAdminTutorial(payload)
      ElMessage.success('教程已新增。')
    }
    tutorialDialogOpen.value = false
    await loadTutorials(true)
  } catch (error) {
    ElMessage.error(errorText(error))
  } finally {
    saving.value = false
  }
}

async function publish(id: string) {
  await changeTutorialStatus(() => publishAdminTutorial(id), '教程已发布。')
}

async function hide(id: string) {
  await changeTutorialStatus(() => hideAdminTutorial(id), '教程已隐藏。')
}

async function draft(id: string) {
  await changeTutorialStatus(() => draftAdminTutorial(id), '教程已改回草稿。')
}

async function changeTutorialStatus(action: () => Promise<Tutorial>, message: string) {
  try {
    await action()
    ElMessage.success(message)
    await loadTutorials(true)
  } catch (error) {
    ElMessage.error(errorText(error))
  }
}

function categoryStatusText(status?: string) {
  return status === 'hidden' ? '已隐藏' : '显示中'
}

function tutorialStatusText(status?: string) {
  if (status === 'published') return '已发布'
  if (status === 'hidden') return '已隐藏'
  return '草稿'
}

function tutorialStatusTag(status?: string) {
  if (status === 'published') return 'success'
  if (status === 'hidden') return 'info'
  return 'warning'
}
</script>

<style scoped>
.admin-tabs {
  margin-bottom: 16px;
}

.tutorial-admin-panel {
  height: calc(100vh - 132px);
  overflow: hidden;
}

.tutorial-admin-body {
  display: grid;
  grid-template-rows: auto auto minmax(0, 1fr);
  height: 100%;
  min-height: 0;
}

.usage-guide {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 10px;
  margin-bottom: 16px;
}

.usage-guide > div {
  display: grid;
  gap: 6px;
  padding: 12px;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  background: #f9fafb;
}

.usage-guide strong {
  color: #111827;
  font-size: 14px;
}

.usage-guide span,
.field-help {
  color: #6b7280;
  font-size: 12px;
  line-height: 1.6;
}

.admin-tabs :deep(.el-segmented-item__label) {
  font-weight: 700;
}

.admin-section {
  display: grid;
  grid-template-rows: auto minmax(0, 1fr) auto;
  gap: 14px;
  min-height: 0;
}

.tutorial-toolbar {
  align-items: flex-start;
}

.filter-row {
  display: grid;
  grid-template-columns: auto auto 150px 180px auto;
  gap: 8px;
}

.form-grid {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 180px;
  gap: 14px;
}

.table-scroll {
  min-height: 0;
  overflow: hidden;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
}

.field-help {
  margin: 6px 0 0;
}

.content-tools {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
  width: 100%;
  margin-bottom: 8px;
  color: #6b7280;
  font-size: 12px;
}

.pagination-row {
  display: flex;
  justify-content: flex-end;
}

@media (max-width: 900px) {
  .filter-row,
  .form-grid,
  .usage-guide {
    grid-template-columns: 1fr;
  }

  .content-tools {
    align-items: flex-start;
    flex-direction: column;
  }
}
</style>
