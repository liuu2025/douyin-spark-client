import { http } from './http'
import type { LoginSession } from './types'

function unwrapSession(data: unknown): LoginSession {
  if (data && typeof data === 'object' && 'session' in data) {
    return (data as { session: LoginSession }).session
  }
  return data as LoginSession
}

export async function createLoginSession() {
  const { data } = await http.post('/login-sessions')
  return unwrapSession(data)
}

export async function getLoginSession(id: string) {
  const { data } = await http.get(`/login-sessions/${id}`)
  return unwrapSession(data)
}

export async function confirmLoginSession(id: string) {
  const { data } = await http.post(`/login-sessions/${id}/confirm`)
  return unwrapSession(data)
}

export async function cancelLoginSession(id: string) {
  const { data } = await http.post(`/login-sessions/${id}/cancel`)
  return unwrapSession(data)
}
