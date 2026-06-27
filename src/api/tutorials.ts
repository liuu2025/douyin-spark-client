import { http } from './http'
import type { Tutorial, TutorialCategory, TutorialReadRecord, TutorialStatus } from './types'

export interface TutorialListParams {
  page?: number
  page_size?: number
  category_id?: string
  page_key?: string
  keyword?: string
  status?: TutorialStatus
}

export interface TutorialListResponse {
  items: Tutorial[]
  total: number
  page: number
  page_size: number
}

export interface TutorialCategoryListResponse {
  items: TutorialCategory[]
}

export interface TutorialCategoryPayload {
  name: string
  description?: string
  status?: string
  sort_order?: number
}

export interface TutorialPayload {
  category_id: string
  title: string
  summary?: string
  content_markdown: string
  page_keys?: string[]
  status?: TutorialStatus
  sort_order?: number
}

type TutorialResponse = Tutorial | { tutorial: Tutorial }

function unwrapTutorial(data: TutorialResponse) {
  return 'tutorial' in data ? data.tutorial : data
}

export async function listTutorialCategories() {
  const { data } = await http.get<TutorialCategoryListResponse>('/tutorial-categories')
  return data.items || []
}

export async function listTutorials(params: TutorialListParams = {}) {
  const { data } = await http.get<TutorialListResponse>('/tutorials', { params })
  return data
}

export async function getTutorial(tutorialId: string) {
  const { data } = await http.get<TutorialResponse>(`/tutorials/${tutorialId}`)
  return unwrapTutorial(data)
}

export async function markTutorialRead(tutorialId: string) {
  const { data } = await http.post<{ read_record: TutorialReadRecord }>(
    `/tutorials/${tutorialId}/mark-read`,
  )
  return data.read_record
}

export async function listAdminTutorialCategories(params: { status?: string } = {}) {
  const { data } = await http.get<TutorialCategoryListResponse>('/admin/tutorial-categories', {
    params,
  })
  return data.items || []
}

export async function createAdminTutorialCategory(payload: TutorialCategoryPayload) {
  const { data } = await http.post<TutorialCategory>('/admin/tutorial-categories', payload)
  return data
}

export async function getAdminTutorialCategory(categoryId: string) {
  const { data } = await http.get<TutorialCategory>(`/admin/tutorial-categories/${categoryId}`)
  return data
}

export async function updateAdminTutorialCategory(
  categoryId: string,
  payload: Partial<TutorialCategoryPayload>,
) {
  const { data } = await http.patch<TutorialCategory>(
    `/admin/tutorial-categories/${categoryId}`,
    payload,
  )
  return data
}

export async function listAdminTutorials(params: TutorialListParams = {}) {
  const { data } = await http.get<TutorialListResponse>('/admin/tutorials', { params })
  return data
}

export async function createAdminTutorial(payload: TutorialPayload) {
  const { data } = await http.post<TutorialResponse>('/admin/tutorials', payload)
  return unwrapTutorial(data)
}

export async function getAdminTutorial(tutorialId: string) {
  const { data } = await http.get<TutorialResponse>(`/admin/tutorials/${tutorialId}`)
  return unwrapTutorial(data)
}

export async function updateAdminTutorial(tutorialId: string, payload: Partial<TutorialPayload>) {
  const { data } = await http.patch<TutorialResponse>(`/admin/tutorials/${tutorialId}`, payload)
  return unwrapTutorial(data)
}

export async function publishAdminTutorial(tutorialId: string) {
  const { data } = await http.post<TutorialResponse>(`/admin/tutorials/${tutorialId}/publish`)
  return unwrapTutorial(data)
}

export async function hideAdminTutorial(tutorialId: string) {
  const { data } = await http.post<TutorialResponse>(`/admin/tutorials/${tutorialId}/hide`)
  return unwrapTutorial(data)
}

export async function draftAdminTutorial(tutorialId: string) {
  const { data } = await http.post<TutorialResponse>(`/admin/tutorials/${tutorialId}/draft`)
  return unwrapTutorial(data)
}
