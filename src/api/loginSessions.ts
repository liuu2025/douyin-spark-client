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

// 读取当前登录二维码反解出的抖音官方唤端链接（内含一次性扫码 token）。
// 手机浏览器访问该链接可唤起抖音 App 直达登录确认页；解码失败时后端返回
// qr_link_unavailable，前端应隐藏“唤醒抖音免扫码”按钮并回退为普通扫码。
export async function getLoginSessionQRLink(id: string) {
  const { data } = await http.get<{ qr_link: string }>(`/login-sessions/${id}/qr-link`)
  return data.qr_link
}
