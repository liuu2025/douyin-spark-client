import { http } from './http'
import type { StorageStateImport } from './types'

export interface StorageStateImportListParams {
  page?: number
  page_size?: number
  status?: string
  target_public_uid?: string
  detected_douyin_id?: string
}

export interface StorageStateImportListResponse {
  items: StorageStateImport[]
  total: number
  page: number
  page_size: number
}

export async function importStorageState(targetPublicUid: string, file: File) {
  const form = new FormData()
  form.append('target_public_uid', targetPublicUid)
  form.append('storage_state', file)
  const { data } = await http.post<{ import: StorageStateImport }>(
    '/admin/storage-state-imports',
    form,
    { headers: { 'Content-Type': 'multipart/form-data' } },
  )
  return data.import
}

export async function listStorageStateImports(params: StorageStateImportListParams = {}) {
  const { data } = await http.get<StorageStateImportListResponse>(
    '/admin/storage-state-imports',
    { params },
  )
  return data
}

export async function getStorageStateImport(importId: string) {
  const { data } = await http.get<{ import: StorageStateImport }>(
    `/admin/storage-state-imports/${importId}`,
  )
  return data.import
}
