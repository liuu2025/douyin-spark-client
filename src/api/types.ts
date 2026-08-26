export type UserRole = 'admin' | 'normal'

export interface User {
  id: string
  public_uid: string
  nickname?: string
  qq_email?: string
  role: UserRole
  status: string
}

export interface AuthResponse {
  status: string
  token: string
  user: User
}

export interface RegisterCodeResponse {
  status: string
  QQEmail: string
  ExpiresAt: string
}

export type LoginState =
  | 'not_checked'
  | 'ok'
  | 'not_logged_in'
  | 'missing_storage_state'
  | 'identity_mismatch'
  | 'check_failed'
  | 'transferred'

export type LoginMode = 'qr_sms' | 'remote_browser'

export type LoginSessionStatus =
  | 'created'
  | 'waiting_qr_scan'
  | 'waiting_sms_code'
  | 'sms_code_invalid'
  | 'sms_code_expired'
  | 'sms_retry_later'
  | 'remote_browser_required'
  | 'remote_browser_starting'
  | 'waiting_manual_login'
  | 'login_confirming'
  | 'finalizing'
  | 'logged_in'
  | 'cancelled'
  | 'failed'
  | 'timeout'
  | string

export interface DouyinAccount {
  douyin_id: string
  profile_nickname?: string
  owner_user_id?: string
  owner_public_uid?: string
  owner_nickname?: string
  display_name?: string
  status?: string
  login_state?: LoginState
  runner_state?: string
  auto_apply_new_slots?: boolean
  polling_eligible_until?: string
  polling_entitlement_status?: string
  send_task_count?: number
  active_send_task_count?: number
  paused_send_task_count?: number
  latest_task_id?: string
  latest_task_status?: string
  latest_task_last_run_at?: string
  latest_task_error_code?: string
  latest_task_error_message?: string
  last_login_at?: string
  last_check_at?: string
  last_error_code?: string
  last_error_message?: string
  created_at?: string
  updated_at?: string
}

export interface LoginStatusResponse {
  douyin_id: string
  profile_nickname?: string
  detected_douyin_id?: string
  login_state: LoginState
  display_text?: string
  last_checked_at?: string
  last_checked_text?: string
  need_relogin?: boolean
  can_verify?: boolean
  is_current_check_result?: boolean
}

export interface LoginSession {
  id: string
  user_id?: string
  status: LoginSessionStatus
  qr_image_url?: string
  qr_generated_at?: string
  masked_phone?: string
  resend_count?: number
  remote_status?: string
  remote_url?: string
  resolved_douyin_id?: string
  douyin_id?: string
  expires_at?: string
  last_error_code?: string
  last_error_message?: string
}

export interface SendTask {
  id: string
  task_id?: string
  douyin_id: string
  message_template: string
  datetime_format?: string
  target_rules_json?: string
  schedule_mode?: string
  cycle_seconds?: number
  slot_ids?: string[]
  enabled?: boolean
  status?: string
  last_run_at?: string
  last_error_code?: string
  last_error_message?: string
}

export interface SendRun {
  id: string
  task_id: string
  douyin_id: string
  profile_nickname?: string
  owner_user_id?: string
  owner_public_uid?: string
  slot_id?: string
  cycle_id?: string
  cycle_start_at?: string
  status: string
  started_at?: string
  finished_at?: string
  last_error_code?: string
  last_error_message?: string
  created_at?: string
  updated_at?: string
}

export interface StorageStateImport {
  id: string
  admin_user_id?: string
  target_user_id?: string
  status: string
  result?: string
  target_public_uid?: string
  detected_douyin_id?: string
  uploaded_state_path?: string
  final_storage_state_path?: string
  original_owner_user_id?: string
  original_owner_public_uid?: string
  final_owner_user_id?: string
  final_owner_public_uid?: string
  owner_changed?: boolean
  storage_state_replaced?: boolean
  last_error_code?: string
  last_error_message?: string
  created_at?: string
  completed_at?: string
  updated_at?: string
}

export interface Notice {
  id: string
  admin_user_id?: string
  title: string
  content: string
  status: string
  published_at?: string
  created_at?: string
  updated_at?: string
}

export interface SupportMessage {
  id: string
  user_id: string
  sender: 'user' | 'admin' | string
  content: string
  created_at?: string
}

export interface SupportConversation {
  user_id: string
  public_uid: string
  nickname?: string
  last_message: string
  last_sender: 'user' | 'admin' | string
  last_message_at?: string
  message_count: number
}

export interface WorldMessage {
  id: string
  user_id: string
  public_uid: string
  nickname?: string
  content: string
  status: 'visible' | 'recalled' | string
  created_at?: string
  recalled_at?: string
}

export interface WorldMute {
  user_id: string
  public_uid: string
  nickname?: string
  muted_by: string
  reason?: string
  created_at?: string
  updated_at?: string
}

export type SendScheduleSlotMode = 'fixed_time' | 'interval' | string
export type SendScheduleSlotStatus = 'active' | 'disabled' | string

export interface SendScheduleSlot {
  id: string
  name: string
  mode: SendScheduleSlotMode
  time_of_day?: string
  interval_seconds?: number
  status: SendScheduleSlotStatus
  created_at?: string
  updated_at?: string
}

export interface SchedulePreferences {
  douyin_id: string
  auto_apply_new_slots: boolean
}

export type RedeemCodeStatus = 'unused' | 'redeemed' | 'disabled' | 'expired' | string

export interface RedeemCode {
  id?: string
  code_id?: string
  code?: string
  masked_code?: string
  type?: string
  code_type?: string
  days?: number
  status: RedeemCodeStatus
  assigned_user_id?: string
  assigned_public_uid?: string
  created_by_admin_id?: string
  owner_user_id?: string
  owner_public_uid?: string
  target_public_uid?: string
  redeemed_by_user_id?: string
  redeemed_by_public_uid?: string
  redeemed_douyin_id?: string
  douyin_id?: string
  redeemed_at?: string
  disabled_at?: string
  created_at?: string
  updated_at?: string
}

export interface RedeemResult {
  douyin_id: string
  polling_eligible_until?: string
  polling_entitlement_status?: string
}

export type TutorialCategoryStatus = 'active' | 'hidden' | string
export type TutorialStatus = 'draft' | 'published' | 'hidden' | string

export interface TutorialCategory {
  id: string
  name: string
  description?: string
  status: TutorialCategoryStatus
  sort_order?: number
  created_at?: string
  updated_at?: string
}

export interface Tutorial {
  id: string
  category_id: string
  category_name?: string
  title: string
  summary?: string
  content_markdown: string
  page_keys?: string[]
  status: TutorialStatus
  sort_order?: number
  is_read?: boolean
  read_at?: string
  published_at?: string
  created_at?: string
  updated_at?: string
}

export interface TutorialReadRecord {
  tutorial_id: string
  user_id: string
  read_at: string
}

export interface AdminUserSummary {
  id: string
  public_uid: string
  nickname?: string
  qq_email?: string
  role: UserRole | string
  status: string
  douyin_account_count?: number
  send_task_count?: number
  redeem_code_count?: number
  created_at?: string
  updated_at?: string
}

export interface AdminUserDetail {
  user: AdminUserSummary
  douyin_accounts: DouyinAccount[]
  redeem_codes: RedeemCode[]
}

export type ActivityStatus = 'draft' | 'published' | 'paused' | 'ended' | string
export type ActivityClaimStatus =
  | 'available'
  | 'claimed'
  | 'not_started'
  | 'ended'
  | 'paused'
  | 'out_of_stock'
  | string

export interface Activity {
  id: string
  title: string
  description?: string
  status: ActivityStatus
  reward_type?: string
  reward_days: number
  stock_total: number
  claimed_count: number
  remaining_count?: number
  per_user_limit?: number
  claim_status?: ActivityClaimStatus
  my_claim_id?: string
  starts_at?: string
  ends_at?: string
  published_at?: string
  created_at?: string
  updated_at?: string
}

export interface ActivityClaim {
  id: string
  activity_id: string
  user_id?: string
  public_uid?: string
  nickname?: string
  redeem_code_id?: string
  redeem_code_days?: number
  redeem_code?: RedeemCode
  created_at?: string
}

export interface ActivityClaimResult {
  activity: Partial<Activity>
  claim: ActivityClaim
  code?: RedeemCode
}
