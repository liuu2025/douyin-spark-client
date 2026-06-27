import { createRouter, createWebHistory, type RouteRecordRaw } from 'vue-router'
import { useAuthStore } from '@/stores/auth'

const routes: RouteRecordRaw[] = [
  {
    path: '/login',
    name: 'login',
    component: () => import('@/views/LoginView.vue'),
    meta: { public: true },
  },
  {
    path: '/',
    component: () => import('@/layouts/ConsoleLayout.vue'),
    children: [
      { path: '', redirect: '/dashboard' },
      {
        path: 'dashboard',
        name: 'dashboard',
        component: () => import('@/views/DashboardView.vue'),
      },
      {
        path: 'douyin-accounts',
        name: 'douyinAccounts',
        component: () => import('@/views/DouyinAccountsView.vue'),
      },
      {
        path: 'douyin-accounts/:douyinId',
        name: 'douyinAccountDetail',
        component: () => import('@/views/DouyinAccountDetailView.vue'),
        props: true,
      },
      {
        path: 'messages',
        name: 'messages',
        component: () => import('@/views/MessagesView.vue'),
      },
      {
        path: 'account',
        name: 'account',
        component: () => import('@/views/AccountSettingsView.vue'),
      },
      {
        path: 'redeem-codes',
        name: 'myRedeemCodes',
        component: () => import('@/views/MyRedeemCodesView.vue'),
      },
      {
        path: 'activities',
        name: 'activities',
        component: () => import('@/views/ActivitiesView.vue'),
      },
      {
        path: 'tutorials',
        name: 'tutorialCenter',
        component: () => import('@/views/TutorialCenterView.vue'),
      },
      {
        path: 'admin/storage-state-imports',
        name: 'adminStorageStateImports',
        component: () => import('@/views/AdminStorageStateImportsView.vue'),
        meta: { admin: true },
      },
      {
        path: 'admin/douyin-accounts',
        name: 'adminDouyinAccounts',
        component: () => import('@/views/AdminDouyinAccountsView.vue'),
        meta: { admin: true },
      },
      {
        path: 'admin/notices',
        name: 'adminNotices',
        component: () => import('@/views/AdminNoticesView.vue'),
        meta: { admin: true },
      },
      {
        path: 'admin/support',
        name: 'adminSupport',
        component: () => import('@/views/AdminSupportView.vue'),
        meta: { admin: true },
      },
      {
        path: 'admin/send-schedule/slots',
        name: 'adminScheduleSlots',
        component: () => import('@/views/AdminScheduleSlotsView.vue'),
        meta: { admin: true },
      },
      {
        path: 'admin/send-runs',
        name: 'adminSendRuns',
        component: () => import('@/views/AdminSendRunsView.vue'),
        meta: { admin: true },
      },
      {
        path: 'admin/redeem-codes',
        name: 'adminRedeemCodes',
        component: () => import('@/views/AdminRedeemCodesView.vue'),
        meta: { admin: true },
      },
      {
        path: 'admin/activities',
        name: 'adminActivities',
        component: () => import('@/views/AdminActivitiesView.vue'),
        meta: { admin: true },
      },
      {
        path: 'admin/tutorials',
        name: 'adminTutorials',
        component: () => import('@/views/AdminTutorialsView.vue'),
        meta: { admin: true },
      },
      {
        path: 'admin/users',
        name: 'adminUsers',
        component: () => import('@/views/AdminUsersView.vue'),
        meta: { admin: true },
      },
    ],
  },
  { path: '/:pathMatch(.*)*', redirect: '/dashboard' },
]

const router = createRouter({
  history: createWebHistory(),
  routes,
})

router.beforeEach(async (to) => {
  const auth = useAuthStore()
  if (!auth.bootstrapped) {
    await auth.bootstrap()
  }

  if (to.meta.public) {
    if (auth.isAuthed && to.name === 'login') return '/dashboard'
    return true
  }

  if (!auth.isAuthed) return '/login'
  if (to.meta.admin && !auth.isAdmin) return '/dashboard'
  return true
})

export default router
