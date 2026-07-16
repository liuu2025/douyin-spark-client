import axios, { type AxiosError } from 'axios'

const TOKEN_KEY = 'douyin_spark_token'

export interface ApiErrorPayload {
  error?: {
    code?: string
    message?: string
  }
}

export class ApiError extends Error {
  code: string
  status?: number

  constructor(message: string, code = 'unknown_error', status?: number) {
    super(message)
    this.name = 'ApiError'
    this.code = code
    this.status = status
  }
}

export const http = axios.create({
  baseURL: '/api/v1',
  timeout: 30000,
})

http.interceptors.request.use((config) => {
  const token = localStorage.getItem(TOKEN_KEY)
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

http.interceptors.response.use(
  (response) => response,
  (error: AxiosError<ApiErrorPayload>) => {
    const payload = error.response?.data
    const code = error.code === 'ECONNABORTED' ? 'request_timeout' : (payload?.error?.code ?? 'request_failed')
    const message = payload?.error?.message ?? error.message ?? '请求失败'
    return Promise.reject(new ApiError(message, code, error.response?.status))
  },
)

export function getStoredToken() {
  return localStorage.getItem(TOKEN_KEY)
}

export function setStoredToken(token: string) {
  localStorage.setItem(TOKEN_KEY, token)
}

export function clearStoredToken() {
  localStorage.removeItem(TOKEN_KEY)
}

export function errorText(error: unknown) {
  if (error instanceof ApiError) {
    return translateError(error.code, error.message)
  }
  if (error instanceof Error) {
    return error.message
  }
  return '操作失败'
}

export function translateError(code: string, fallback?: string) {
  const normalizedFallback = fallback?.toLowerCase()
  if (normalizedFallback?.includes('qq email must be a standard numeric qq.com address')) {
    return 'QQ 邮箱必须是标准的数字 qq.com 地址，例如 123456789@qq.com。'
  }
  const map: Record<string, string> = {
    unauthorized: '登录已失效，请重新登录。',
    not_found: '资源不存在，或不属于当前账号。',
    conflict: '当前资源状态冲突。注册时通常表示该 QQ 邮箱已注册，请切换到登录或换一个邮箱。',
    invalid: '验证码错误、账号不存在或密码不正确。',
    expired: '验证码已过期，请重新获取。',
    too_many_attempts: '验证码错误次数过多，请重新获取验证码。',
    login_failed: '账号或密码不正确。',
    register_failed: '注册失败，请检查验证码、邮箱和密码格式。',
    change_qq_email_failed: 'QQ 邮箱更改失败，请检查验证码和邮箱格式。',
    request_failed: '请求失败，请检查后端服务是否已启动。',
    request_timeout: '请求等待时间较长，后端可能仍在处理，请稍后刷新状态。',
    assistant_unavailable: '智能客服服务暂时不可用，请稍后再试。',
    assistant_proxy_failed: '智能客服请求处理失败，请稍后再试。',
    invalid_json: '提交内容格式不正确。',
    admin_required: '当前操作需要管理员权限。',
    remote_login_disabled: '远程浏览器登录未启用。',
    remote_login_session_limit: '当前正在添加抖音号人数较多，请稍后再试。',
    remote_browser_starting: '远程浏览器正在启动，请稍后。',
    browser_startup_failure: '远程浏览器启动失败，服务器显示环境异常，请稍后重试或联系管理员。',
    waiting_manual_login: '请在远程浏览器中完成登录。',
    login_confirming: '已检测到登录成功，请确认远程窗口没有未处理提示。',
    run_browser_required: '真实运行发送任务需要显式确认。',
    login_state_not_ok: '抖音登录状态不可用，请先验证或重新登录。',
    normal_user_required: '该接口只允许普通用户调用。',
    target_user_must_be_normal: '客服会话目标必须是普通用户。',
    target_user_disabled: '目标客户端账号已禁用。',
    world_chat_muted: '当前账号已被禁言，不能发送世界聊天消息。',
    redeem_code_invalid: '兑换码无效或不存在。',
    redeem_code_used: '兑换码已被兑换。',
    redeem_code_already_used: '兑换码已被兑换。',
    redeem_code_already_settled: '已兑换的兑换码不可撤回或禁用。',
    redeem_code_disabled: '兑换码已禁用。',
    polling_entitlement_required: '当前抖音号没有有效轮询资格，无法进入自动发送号池。',
  }
  return map[code] ?? fallback ?? code
}
