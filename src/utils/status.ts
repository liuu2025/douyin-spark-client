import type { LoginSessionStatus, LoginState } from '@/api/types'

export function loginStateText(state?: LoginState | string) {
  const map: Record<string, string> = {
    not_checked: '未验证',
    ok: '有效',
    not_logged_in: '已失效',
    missing_storage_state: '登录文件缺失',
    identity_mismatch: '账号不匹配',
    check_failed: '验证失败',
    transferred: '已转移',
  }
  return state ? map[state] ?? state : '未验证'
}

export function loginStateTag(state?: LoginState | string) {
  if (state === 'ok') return 'success'
  if (state === 'not_checked' || !state) return 'info'
  if (state === 'check_failed') return 'warning'
  return 'danger'
}

export function sessionStatusText(status?: LoginSessionStatus) {
  const map: Record<string, string> = {
    remote_browser_starting: '正在启动远程浏览器',
    waiting_manual_login: '等待用户在远程浏览器中完成登录',
    login_confirming: '已检测到登录成功，等待确认',
    finalizing: '正在保存最终登录状态',
    logged_in: '登录完成',
    cancelled: '已取消',
    failed: '登录失败',
    timeout: '会话超时',
  }
  return status ? map[status] ?? status : '未开始'
}

export function runStatusText(status?: string) {
  const map: Record<string, string> = {
    idle: '空闲',
    sending: '发送中',
    running: '运行中',
    sent: '已发送',
    partial_success: '部分成功',
    skipped: '已跳过',
    failed: '失败',
    active: '启用',
    paused: '暂停',
    disabled: '禁用',
  }
  return status ? map[status] ?? status : '-'
}

export function runnerStateText(state?: string) {
  const map: Record<string, string> = {
    idle: '空闲',
    sending: '发送中',
    running: '运行中',
    paused: '已暂停',
    failed: '异常',
  }
  return state ? map[state] ?? state : '-'
}

export function enabledStatusText(status?: string) {
  const map: Record<string, string> = {
    active: '已开启',
    paused: '已暂停',
    disabled: '已禁用',
    transferred: '已转移',
  }
  return status ? map[status] ?? status : '-'
}

export function enabledStatusTag(status?: string) {
  if (status === 'active') return 'success'
  if (status === 'paused') return 'info'
  return 'warning'
}
