import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import {
  changeQqEmail as changeQqEmailApi,
  login as loginApi,
  logout as logoutApi,
  me,
  register as registerApi,
  updateNickname as updateNicknameApi,
} from '@/api/account'
import type { LoginPayload } from '@/api/account'
import { clearStoredToken, getStoredToken, setStoredToken } from '@/api/http'
import type { User } from '@/api/types'

export const useAuthStore = defineStore('auth', () => {
  const user = ref<User | null>(null)
  const bootstrapped = ref(false)
  const loading = ref(false)

  const token = ref<string | null>(getStoredToken())
  const isAuthed = computed(() => Boolean(token.value && user.value))
  const isAdmin = computed(() => user.value?.role === 'admin')
  const displayName = computed(() => {
    if (!user.value) return ''
    return user.value.nickname || defaultNickname(user.value)
  })
  const nickname = computed(() => user.value?.nickname || '')

  function defaultNickname(currentUser: User) {
    if (currentUser.role === 'admin') return 'Admin'
    return `UID ${currentUser.public_uid}`
  }

  function syncUser(nextUser: User | null) {
    user.value = nextUser
  }

  async function updateNickname(value: string) {
    const nextNickname = value.trim()
    const nextUser = await updateNicknameApi(nextNickname)
    syncUser(nextUser)
  }

  async function changeQqEmail(payload: { newQqEmail: string; code: string }) {
    const nextUser = await changeQqEmailApi(payload)
    syncUser(nextUser)
  }

  async function bootstrap() {
    const storedToken = getStoredToken()
    token.value = storedToken
    if (!storedToken) {
      bootstrapped.value = true
      return
    }
    try {
      syncUser(await me())
    } catch {
      clearStoredToken()
      token.value = null
      syncUser(null)
    } finally {
      bootstrapped.value = true
    }
  }

  async function login(payload: LoginPayload) {
    loading.value = true
    try {
      const result = await loginApi(payload)
      setStoredToken(result.token)
      token.value = result.token
      syncUser(result.user)
      return result.user
    } finally {
      loading.value = false
    }
  }

  async function register(payload: { qqEmail: string; code: string; password: string }) {
    loading.value = true
    try {
      const result = await registerApi(payload)
      setStoredToken(result.token)
      token.value = result.token
      syncUser(result.user)
      return result.user
    } finally {
      loading.value = false
    }
  }

  async function logout() {
    try {
      if (getStoredToken()) {
        await logoutApi()
      }
    } catch {
      // Local logout should still succeed when the server token already expired.
    } finally {
      clearStoredToken()
      token.value = null
      syncUser(null)
    }
  }

  return {
    user,
    bootstrapped,
    loading,
    token,
    isAuthed,
    isAdmin,
    displayName,
    nickname,
    bootstrap,
    login,
    register,
    logout,
    updateNickname,
    changeQqEmail,
  }
})
