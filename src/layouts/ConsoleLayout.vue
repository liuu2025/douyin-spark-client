<template>
  <el-container class="console-shell">
    <el-aside
      :class="[
        'sidebar',
        {
          'sidebar-collapsed': sidebarCollapsed,
          'mobile-sidebar-open': mobileMenuOpen,
        },
      ]"
      :width="sidebarWidth"
    >
      <div class="brand">
        <img class="brand-mark" src="@/assets/douyin-icon.svg" alt="抖音" />
        <div v-show="!sidebarCollapsed" class="brand-copy">
          <div class="brand-name">douyin-spark</div>
          <div class="brand-subtitle">浏览器控制台</div>
        </div>
        <el-button
          class="mobile-sidebar-close"
          circle
          aria-label="关闭导航"
          @click="mobileMenuOpen = false"
        >
          <X :size="18" />
        </el-button>
      </div>

      <div class="sidebar-tools">
        <el-button
          class="sidebar-toggle"
          :aria-label="sidebarCollapsed ? '展开侧栏' : '收起侧栏'"
          @click="toggleSidebar"
        >
          <ChevronRight v-if="sidebarCollapsed" :size="16" />
          <ChevronLeft v-else :size="16" />
          <span v-show="!sidebarCollapsed">收起侧栏</span>
        </el-button>
      </div>

      <el-menu
        :collapse="menuCollapsed"
        :default-active="activeMenu"
        router
        class="side-menu"
        @select="mobileMenuOpen = false"
      >
        <el-menu-item index="/dashboard">
          <LayoutDashboard :size="18" />
          <span>仪表盘</span>
        </el-menu-item>
        <el-menu-item index="/douyin-accounts">
          <MonitorSmartphone :size="18" />
          <span>抖音号</span>
        </el-menu-item>
          <el-menu-item v-if="false" index="/messages">
            <span class="menu-item-with-badge">
              <MessageSquareText :size="18" />
              <span>消息中心</span>
              <el-badge v-if="hasUnread" is-dot class="menu-item-dot" />
            </span>
          </el-menu-item>
        <el-menu-item index="/assistant">
          <Bot :size="18" />
          <span>智能客服</span>
        </el-menu-item>
        <el-menu-item index="/account">
          <Settings :size="18" />
          <span>账号设置</span>
        </el-menu-item>
        <el-menu-item index="/redeem-codes">
          <Ticket :size="18" />
          <span>我的兑换码</span>
        </el-menu-item>
        <el-menu-item index="/activities">
          <Gift :size="18" />
          <span>活动广场</span>
        </el-menu-item>
        <el-menu-item index="/tutorials">
          <BookOpen :size="18" />
          <span>教程中心</span>
        </el-menu-item>
        <el-sub-menu v-if="auth.isAdmin" index="admin" class="admin-root-menu">
          <template #title>
            <ShieldCheck :size="18" />
            <span>管理员</span>
          </template>
          <el-sub-menu
            index="admin-douyin-send"
            class="admin-section-menu"
            popper-class="admin-menu-popper"
          >
            <template #title>抖音号与发送</template>
            <el-menu-item class="admin-leaf-item" index="/admin/douyin-accounts">
              抖音号管理
            </el-menu-item>
            <el-menu-item class="admin-leaf-item" index="/admin/storage-state-imports">
              登录态导入
            </el-menu-item>
            <el-menu-item class="admin-leaf-item" index="/admin/send-schedule/slots">
              全局轮次管理
            </el-menu-item>
            <el-menu-item class="admin-leaf-item" index="/admin/send-runs">
              全局发送记录
            </el-menu-item>
          </el-sub-menu>
          <el-sub-menu
            index="admin-users-rights"
            class="admin-section-menu"
            popper-class="admin-menu-popper"
          >
            <template #title>用户与权限</template>
            <el-menu-item class="admin-leaf-item" index="/admin/users">账户管理</el-menu-item>
            <el-menu-item class="admin-leaf-item" index="/admin/redeem-codes">
              兑换码管理
            </el-menu-item>
          </el-sub-menu>
          <el-sub-menu
            index="admin-content-ops"
            class="admin-section-menu"
            popper-class="admin-menu-popper"
          >
            <template #title>内容与运营</template>
            <el-menu-item v-if="false" class="admin-leaf-item" index="/admin/notices">通知发布</el-menu-item>
            <el-menu-item class="admin-leaf-item" index="/admin/activities">活动管理</el-menu-item>
            <el-menu-item class="admin-leaf-item" index="/admin/tutorials">教程管理</el-menu-item>
          </el-sub-menu>
          <el-sub-menu
            v-if="false"
            index="admin-support"
            class="admin-section-menu"
            popper-class="admin-menu-popper"
          >
            <template #title>客服</template>
            <el-menu-item class="admin-leaf-item" index="/admin/support">用户咨询</el-menu-item>
          </el-sub-menu>
        </el-sub-menu>
      </el-menu>
    </el-aside>

    <button
      v-if="mobileMenuOpen"
      class="sidebar-backdrop"
      type="button"
      aria-label="关闭导航"
      @click="mobileMenuOpen = false"
    />

    <el-container class="content-shell">
      <el-header class="topbar" height="64px">
        <div class="topbar-leading">
          <el-button
            class="mobile-menu-button"
            circle
            aria-label="打开导航"
            @click="mobileMenuOpen = true"
          >
            <Menu :size="19" />
          </el-button>
          <div class="topbar-title">控制台</div>
        </div>
        <div class="topbar-actions">
          <el-tooltip :content="isDarkMode ? '切换浅色模式' : '切换深色模式'">
            <el-button circle @click="toggleTheme">
              <Sun v-if="isDarkMode" :size="18" />
              <Moon v-else :size="18" />
            </el-button>
          </el-tooltip>
          <el-tooltip content="当前页面帮助">
            <el-button circle @click="helpOpen = true">
              <CircleHelp :size="18" />
            </el-button>
          </el-tooltip>
          <el-tooltip v-if="false" content="消息中心">
            <el-badge :hidden="!hasUnread" is-dot class="topbar-badge">
              <el-button circle @click="$router.push('/messages')">
                <Bell :size="18" />
              </el-button>
            </el-badge>
          </el-tooltip>
          <el-dropdown trigger="click" @command="handleCommand">
            <el-button class="account-button">
              <CircleUserRound :size="18" />
              <span class="account-name">{{ auth.displayName }}</span>
              <ChevronDown class="account-chevron" :size="16" />
            </el-button>
            <template #dropdown>
              <el-dropdown-menu>
                <el-dropdown-item command="account">账号设置</el-dropdown-item>
                <el-dropdown-item divided command="logout">退出登录</el-dropdown-item>
              </el-dropdown-menu>
            </template>
          </el-dropdown>
        </div>
      </el-header>
      <el-main class="main-area">
        <router-view />
      </el-main>
    </el-container>
    <HelpDrawer v-model="helpOpen" :page-key="currentPageKey" />
    <FloatingAssistantWidget />
    <AssistantAutoSendDialog />
  </el-container>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import {
  Bell,
  BookOpen,
  Bot,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  CircleHelp,
  CircleUserRound,
  Gift,
  LayoutDashboard,
  Menu,
  MessageSquareText,
  MonitorSmartphone,
  Moon,
  Settings,
  ShieldCheck,
  Sun,
  Ticket,
  X,
} from 'lucide-vue-next'
import { useAuthStore } from '@/stores/auth'
import AssistantAutoSendDialog from '@/components/AssistantAutoSendDialog.vue'
import FloatingAssistantWidget from '@/components/FloatingAssistantWidget.vue'
import HelpDrawer from '@/components/HelpDrawer.vue'
import { listNotices } from '@/api/notices'
import { listAdminSupportConversations, listSupportMessages } from '@/api/support'
import { hasAdminSupportUnread, hasNoticeUpdates, hasUserUnreadSupport, readSeenTimestamp } from '@/utils/unread'

const route = useRoute()
const router = useRouter()
const auth = useAuthStore()
const helpOpen = ref(false)
const isDarkMode = ref(false)
const sidebarCollapsed = ref(false)
const mobileMenuOpen = ref(false)
const isCompactLayout = ref(false)
const hasUnread = ref(false)
const unreadTimer = ref<number | null>(null)
const unreadBusy = ref(false)
const sidebarWidth = computed(() => (sidebarCollapsed.value ? '72px' : '236px'))
const menuCollapsed = computed(() => sidebarCollapsed.value && !isCompactLayout.value)
let compactMediaQuery: MediaQueryList | null = null

onMounted(() => {
  const storedTheme = localStorage.getItem('douyin-spark-theme')
  isDarkMode.value = storedTheme !== 'light'
  sidebarCollapsed.value = localStorage.getItem('douyin-spark-sidebar') === 'collapsed'
  compactMediaQuery = window.matchMedia('(max-width: 1100px)')
  syncCompactLayout(compactMediaQuery)
  compactMediaQuery.addEventListener('change', syncCompactLayout)
  applyTheme()
})

watch(
  () => [auth.user?.public_uid, auth.user?.id, auth.isAdmin],
  () => {
    void refreshUnreadState()
    syncUnreadPolling()
  },
  { immediate: true },
)

watch(
  () => route.path,
  () => {
    mobileMenuOpen.value = false
  },
)

function userKey() {
  return auth.user?.public_uid || auth.user?.id || ''
}

function stopUnreadPolling() {
  if (unreadTimer.value !== null) {
    window.clearInterval(unreadTimer.value)
    unreadTimer.value = null
  }
}

function syncUnreadPolling() {
  stopUnreadPolling()
  if (!auth.isAuthed || !userKey()) {
    hasUnread.value = false
    return
  }
  if (document.hidden) return
  unreadTimer.value = window.setInterval(() => {
    void refreshUnreadState(true)
  }, 30000)
}

async function refreshUnreadState(silent = false) {
  if (unreadBusy.value || document.hidden) return
  if (!auth.isAuthed || !userKey()) {
    hasUnread.value = false
    return
  }
  unreadBusy.value = true
  try {
    const key = userKey()
    if (auth.isAdmin) {
      const conversations = await listAdminSupportConversations(50)
      const seenAt = readSeenTimestamp('admin-support', key)
      hasUnread.value = hasAdminSupportUnread(conversations, seenAt)
      return
    }

    const [messages, notices] = await Promise.all([listSupportMessages(20), listNotices(20)])
    const supportSeenAt = readSeenTimestamp('support', key)
    const noticeSeenAt = readSeenTimestamp('notices', key)
    hasUnread.value =
      hasUserUnreadSupport(messages, supportSeenAt) || hasNoticeUpdates(notices, noticeSeenAt)
  } catch {
    if (!silent) {
      hasUnread.value = false
    }
  } finally {
    unreadBusy.value = false
  }
}

function handleVisibilityChange() {
  if (document.hidden) {
    stopUnreadPolling()
    return
  }
  void refreshUnreadState(true)
  syncUnreadPolling()
}

function handleSeenUpdated() {
  void refreshUnreadState(true)
}

onMounted(() => {
  document.addEventListener('visibilitychange', handleVisibilityChange)
  window.addEventListener('douyin-spark:seen-updated', handleSeenUpdated)
})

onBeforeUnmount(() => {
  stopUnreadPolling()
  compactMediaQuery?.removeEventListener('change', syncCompactLayout)
  document.removeEventListener('visibilitychange', handleVisibilityChange)
  window.removeEventListener('douyin-spark:seen-updated', handleSeenUpdated)
})

const activeMenu = computed(() => {
  if (route.path.startsWith('/douyin-accounts')) return '/douyin-accounts'
  if (route.path.startsWith('/admin/storage-state-imports')) return '/admin/storage-state-imports'
  if (route.path.startsWith('/admin/douyin-accounts')) return '/admin/douyin-accounts'
  if (route.path.startsWith('/admin/notices')) return '/admin/notices'
  if (route.path.startsWith('/admin/support')) return '/admin/support'
  if (route.path.startsWith('/admin/send-schedule/slots')) return '/admin/send-schedule/slots'
  if (route.path.startsWith('/admin/send-runs')) return '/admin/send-runs'
  if (route.path.startsWith('/admin/redeem-codes')) return '/admin/redeem-codes'
  if (route.path.startsWith('/admin/activities')) return '/admin/activities'
  if (route.path.startsWith('/admin/tutorials')) return '/admin/tutorials'
  if (route.path.startsWith('/admin/users')) return '/admin/users'
  if (route.path.startsWith('/redeem-codes')) return '/redeem-codes'
  if (route.path.startsWith('/activities')) return '/activities'
  if (route.path.startsWith('/tutorials')) return '/tutorials'
  if (route.path.startsWith('/assistant')) return '/assistant'
  return route.path
})

const currentPageKey = computed(() => {
  const path = route.path
  if (path.startsWith('/douyin-accounts/') && path !== '/douyin-accounts') return 'send_task_config'
  if (path.startsWith('/douyin-accounts')) return 'douyin_account_login'
  if (path.startsWith('/redeem-codes')) return 'redeem_code'
  if (path.startsWith('/admin/douyin-accounts')) return 'admin_douyin_accounts'
  if (path.startsWith('/admin/send-schedule/slots')) return 'send_schedule_slots'
  if (path.startsWith('/admin/send-runs')) return 'admin_send_runs'
  if (path.startsWith('/admin/storage-state-imports')) return 'storage_state_import'
  if (path.startsWith('/admin/redeem-codes')) return 'admin_redeem_codes'
  if (path.startsWith('/admin/activities')) return 'admin_activities'
  if (path.startsWith('/admin/tutorials')) return 'tutorial_management'
  if (path.startsWith('/admin/users')) return 'admin_users'
  if (path.startsWith('/activities')) return 'activity_square'
  if (path.startsWith('/messages')) return 'messages'
  if (path.startsWith('/assistant')) return 'assistant'
  if (path.startsWith('/account')) return 'account_settings'
  if (path.startsWith('/tutorials')) return 'tutorial_center'
  return 'dashboard'
})

async function handleCommand(command: string) {
  if (command === 'account') {
    await router.push('/account')
    return
  }
  if (command === 'logout') {
    await auth.logout()
    await router.push('/login')
  }
}

function toggleTheme() {
  isDarkMode.value = !isDarkMode.value
  localStorage.setItem('douyin-spark-theme', isDarkMode.value ? 'dark' : 'light')
  applyTheme()
}

function toggleSidebar() {
  sidebarCollapsed.value = !sidebarCollapsed.value
  localStorage.setItem(
    'douyin-spark-sidebar',
    sidebarCollapsed.value ? 'collapsed' : 'expanded',
  )
}

function syncCompactLayout(event: MediaQueryList | MediaQueryListEvent) {
  isCompactLayout.value = event.matches
  if (!event.matches) mobileMenuOpen.value = false
}

function applyTheme() {
  document.documentElement.classList.toggle('dark', isDarkMode.value)
}
</script>

<style scoped>
.console-shell {
  height: 100vh;
  height: 100dvh;
  overflow: hidden;
}

.content-shell {
  min-width: 0;
}

.sidebar {
  border-right: 1px solid var(--app-border);
  background: var(--app-surface);
  transition: width 0.2s ease;
  overflow: hidden auto;
  scrollbar-gutter: stable;
}

.brand {
  display: flex;
  align-items: center;
  gap: 12px;
  height: 64px;
  padding: 0 18px;
  border-bottom: 1px solid var(--app-border);
}

.sidebar-collapsed .brand {
  justify-content: center;
  gap: 0;
  padding: 0 10px;
}

.brand-mark {
  width: 36px;
  height: 36px;
  border-radius: 8px;
  object-fit: contain;
}

.brand-copy {
  min-width: 0;
}

.mobile-sidebar-close,
.mobile-menu-button,
.sidebar-backdrop {
  display: none;
}

.brand-name {
  color: var(--app-text);
  font-size: 15px;
  font-weight: 700;
  white-space: nowrap;
}

.brand-subtitle {
  margin-top: 2px;
  color: var(--app-text-muted);
  font-size: 12px;
  white-space: nowrap;
}

.sidebar-tools {
  display: flex;
  padding: 10px 10px 0;
}

.sidebar-toggle {
  display: inline-flex;
  align-items: center;
  justify-content: flex-start;
  gap: 10px;
  flex: 0 0 auto;
  width: 100%;
  height: 42px;
  padding: 0 20px;
  border: 0;
  border-radius: 8px;
  background: transparent;
  color: var(--app-text);
  font-size: 14px;
  white-space: nowrap;
}

.sidebar-toggle:hover,
.sidebar-toggle:focus {
  background: var(--app-surface-hover);
  color: var(--el-color-primary);
}

.sidebar-collapsed .sidebar-tools {
  padding: 10px 8px 0;
}

.sidebar-collapsed .sidebar-toggle {
  justify-content: center;
  height: 42px;
  padding: 0;
}

.side-menu {
  border-right: 0;
  padding: 8px 10px 10px;
}

.sidebar-collapsed .side-menu {
  padding: 8px 8px 10px;
}

.side-menu:not(.el-menu--collapse) {
  width: 100%;
}

.side-menu.el-menu--collapse {
  width: 56px;
}

.side-menu :deep(.el-menu-item),
.side-menu :deep(.el-sub-menu__title) {
  gap: 10px;
  height: 42px;
  border-radius: 8px;
}

.side-menu:not(.el-menu--collapse) :deep(.admin-section-menu > .el-sub-menu__title) {
  height: 38px;
  padding-left: 48px !important;
  color: var(--app-text-muted);
  font-size: 13px;
}

.side-menu:not(.el-menu--collapse) :deep(.admin-section-menu .admin-leaf-item) {
  height: 38px;
  padding-left: 70px !important;
  font-size: 14px;
}

.side-menu.el-menu--collapse :deep(.el-menu-item),
.side-menu.el-menu--collapse :deep(.el-sub-menu__title) {
  justify-content: center;
  padding: 0 !important;
}

.topbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  border-bottom: 1px solid var(--app-border);
  background: var(--app-surface);
}

.topbar-leading {
  display: flex;
  min-width: 0;
  align-items: center;
  gap: 10px;
}

.topbar-title {
  color: var(--app-text);
  font-weight: 700;
}

.topbar-actions {
  display: flex;
  align-items: center;
  gap: 10px;
}

.topbar-badge {
  line-height: 0;
}

.menu-item-with-badge {
  display: inline-flex;
  align-items: center;
  gap: 10px;
  width: 100%;
}

.menu-item-dot {
  margin-left: auto;
}

.account-button {
  display: inline-flex;
  align-items: center;
  gap: 8px;
}

.main-area {
  height: calc(100vh - 64px);
  height: calc(100dvh - 64px);
  min-width: 0;
  padding: 22px;
  background: var(--app-bg);
  overflow: auto;
  overscroll-behavior: contain;
}

@media (max-width: 1100px) {
  .sidebar {
    position: fixed;
    inset: 0 auto 0 0;
    z-index: 100;
    width: min(86vw, 320px) !important;
    max-width: 320px;
    transform: translateX(-100%);
    transition: transform 0.2s ease;
    box-shadow: 16px 0 36px rgba(15, 23, 42, 0.18);
  }

  .sidebar.mobile-sidebar-open {
    transform: translateX(0);
  }

  .sidebar.sidebar-collapsed .brand {
    justify-content: flex-start;
    gap: 12px;
    padding: 0 18px;
  }

  .sidebar .brand-copy {
    display: block !important;
  }

  .sidebar-tools {
    display: none;
  }

  .sidebar .side-menu,
  .sidebar .side-menu.el-menu--collapse {
    width: 100%;
    padding: 10px;
  }

  .sidebar .side-menu :deep(.el-menu-item),
  .sidebar .side-menu :deep(.el-sub-menu__title) {
    justify-content: flex-start;
    min-height: 44px;
    padding: 0 20px !important;
  }

  .sidebar .side-menu :deep(.el-menu-item span),
  .sidebar .side-menu :deep(.el-sub-menu__title span) {
    display: inline-flex;
    visibility: visible;
  }

  .sidebar .side-menu :deep(.admin-section-menu > .el-sub-menu__title) {
    padding-left: 42px !important;
  }

  .sidebar .side-menu :deep(.admin-section-menu .admin-leaf-item) {
    padding-left: 58px !important;
  }

  .mobile-sidebar-close {
    display: inline-flex;
    flex: 0 0 auto;
    margin-left: auto;
  }

  .sidebar-backdrop {
    position: fixed;
    inset: 0;
    z-index: 99;
    display: block;
    width: 100%;
    height: 100%;
    padding: 0;
    border: 0;
    background: rgba(15, 23, 42, 0.48);
  }

  .mobile-menu-button {
    display: inline-flex;
    flex: 0 0 auto;
  }

  .topbar {
    padding: 0 14px;
  }

  .topbar-actions {
    gap: 6px;
  }

  .main-area {
    padding: 16px;
  }
}

@media (max-width: 560px) {
  .topbar {
    padding: 0 10px;
  }

  .topbar-title {
    font-size: 14px;
  }

  .topbar-actions {
    gap: 4px;
  }

  .topbar-actions :deep(.el-button + .el-button) {
    margin-left: 0;
  }

  .account-button {
    width: 40px;
    padding: 0;
  }

  .account-name,
  .account-chevron {
    display: none;
  }

  .main-area {
    padding: 12px;
  }
}
</style>
