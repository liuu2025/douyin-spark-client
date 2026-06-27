import { http } from './http'
import type { Activity, ActivityClaim, ActivityClaimResult, ActivityStatus } from './types'

export interface ActivityListParams {
  page?: number
  page_size?: number
  status?: ActivityStatus
}

export interface ActivityListResponse {
  items: Activity[]
  total: number
  page: number
  page_size: number
}

export interface ActivityPayload {
  title: string
  description?: string
  status?: ActivityStatus
  reward_days: number
  stock_total: number
  starts_at?: string
  ends_at?: string
}

export interface ActivityClaimListResponse {
  items: ActivityClaim[]
}

function unwrapClaims(data: ActivityClaimListResponse | ActivityClaim[]) {
  return Array.isArray(data) ? data : data.items || []
}

export async function listActivities(params: ActivityListParams = {}) {
  const { data } = await http.get<ActivityListResponse>('/activities', { params })
  return data
}

export async function getActivity(activityId: string) {
  const { data } = await http.get<Activity>(`/activities/${activityId}`)
  return data
}

export async function claimActivity(activityId: string) {
  const { data } = await http.post<ActivityClaimResult>(`/activities/${activityId}/claim`)
  return data
}

export async function listMyActivityClaims() {
  const { data } = await http.get<ActivityClaimListResponse | ActivityClaim[]>('/activities/my-claims')
  return unwrapClaims(data)
}

export async function listAdminActivities(params: ActivityListParams = {}) {
  const { data } = await http.get<ActivityListResponse>('/admin/activities', { params })
  return data
}

export async function createAdminActivity(payload: ActivityPayload) {
  const { data } = await http.post<Activity>('/admin/activities', payload)
  return data
}

export async function getAdminActivity(activityId: string) {
  const { data } = await http.get<Activity>(`/admin/activities/${activityId}`)
  return data
}

export async function updateAdminActivity(activityId: string, payload: Partial<ActivityPayload>) {
  const { data } = await http.patch<Activity>(`/admin/activities/${activityId}`, payload)
  return data
}

export async function publishAdminActivity(activityId: string) {
  const { data } = await http.post<Activity>(`/admin/activities/${activityId}/publish`)
  return data
}

export async function pauseAdminActivity(activityId: string) {
  const { data } = await http.post<Activity>(`/admin/activities/${activityId}/pause`)
  return data
}

export async function endAdminActivity(activityId: string) {
  const { data } = await http.post<Activity>(`/admin/activities/${activityId}/end`)
  return data
}

export async function listAdminActivityClaims(activityId: string, limit = 100) {
  const { data } = await http.get<ActivityClaimListResponse | ActivityClaim[]>(
    `/admin/activities/${activityId}/claims`,
    { params: { limit } },
  )
  return unwrapClaims(data)
}
