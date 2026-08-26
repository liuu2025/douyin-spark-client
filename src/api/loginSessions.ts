import { http } from './http'
import type { LoginMode, LoginSession } from './types'

function unwrapSession(data: unknown): LoginSession {
  if (data && typeof data === 'object' && 'session' in data) {
    return (data as { session: LoginSession }).session
  }
  return data as LoginSession
}

export async function createLoginSession(loginMode: LoginMode) {
  const { data } = await http.post('/login-sessions', { login_mode: loginMode })
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

export async function submitLoginSMSCode(id: string, code: string) {
  await http.post(`/login-sessions/${id}/sms-code`, { code })
}

export async function resendLoginSMSCode(id: string) {
  await http.post(`/login-sessions/${id}/resend-sms`)
}

export async function getLoginQRCode(imageURL: string) {
  const path = imageURL.startsWith('/api/v1') ? imageURL.slice('/api/v1'.length) : imageURL
  const { data } = await http.get<Blob>(path, { responseType: 'blob' })
  return data
}
