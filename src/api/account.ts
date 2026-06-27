import { ApiError, http } from './http'
import type { AuthResponse, RegisterCodeResponse, User } from './types'

export type LoginMode = 'account' | 'qq_email'

export interface LoginPayload {
  mode: LoginMode
  identifier: string
  password: string
}

export async function login(payload: LoginPayload) {
  const identifier = payload.identifier.trim()
  const body =
    payload.mode === 'qq_email'
      ? { qq_email: identifier, password: payload.password }
      : /^\d{6}$/.test(identifier)
        ? { public_uid: identifier, password: payload.password }
        : { account: identifier, password: payload.password }
  const { data } = await http.post<AuthResponse>('/account/login', body)
  if (data.status !== 'verified' || !data.token) {
    throw new ApiError('账号或密码不正确。', data.status || 'login_failed')
  }
  return data
}

export async function logout() {
  await http.post('/account/logout')
}

export async function me() {
  const { data } = await http.get<User | { user: User }>('/account/me')
  if (data && typeof data === 'object' && 'user' in data) {
    return data.user
  }
  return data
}

export async function updateNickname(nickname: string) {
  const { data } = await http.post<User | { user: User }>('/account/nickname', { nickname })
  if (data && typeof data === 'object' && 'user' in data) {
    return data.user
  }
  return data
}

export async function requestRegisterCode(qqEmail: string) {
  const { data } = await http.post<RegisterCodeResponse>('/account/register-code', {
    qq_email: qqEmail,
  })
  return data
}

export async function requestResetPasswordCode(qqEmail: string) {
  const { data } = await http.post<RegisterCodeResponse>('/account/reset-password-code', {
    qq_email: qqEmail,
  })
  return data
}

export async function requestChangeQqEmailCode(newQqEmail: string) {
  const { data } = await http.post<RegisterCodeResponse>('/account/change-qq-email-code', {
    new_qq_email: newQqEmail,
  })
  return data
}

export async function register(payload: {
  qqEmail: string
  code: string
  password: string
}) {
  const { data } = await http.post<AuthResponse>('/account/register', {
    qq_email: payload.qqEmail,
    code: payload.code,
    password: payload.password,
  })
  if (data.status !== 'verified') {
    throw new ApiError('验证码错误、已过期或注册信息不符合要求。', data.status || 'register_failed')
  }
  return data
}

export async function resetPassword(payload: {
  qqEmail: string
  code: string
  newPassword: string
}) {
  await http.post('/account/reset-password', {
    qq_email: payload.qqEmail,
    code: payload.code,
    new_password: payload.newPassword,
  })
}

export async function changeQqEmail(payload: { newQqEmail: string; code: string }) {
  const { data } = await http.post<AuthResponse>('/account/change-qq-email', {
    new_qq_email: payload.newQqEmail,
    code: payload.code,
  })
  if (data.status !== 'verified') {
    throw new ApiError('验证码错误、已过期或换绑信息不符合要求。', data.status || 'change_qq_email_failed')
  }
  return data.user
}
