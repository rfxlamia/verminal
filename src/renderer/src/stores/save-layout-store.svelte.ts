/**
 * Copyright 2026 V
 * SPDX-License-Identifier: Apache-2.0
 *
 * Save Layout Store - Svelte 5 runes state for Save Layout Surface
 */
import { serializeLayoutForSave } from '../lib/layout-serializer'
import { layoutState } from './layout-store.svelte'
import type { Result } from '../../../shared/ipc-contract'

export interface SaveLayoutState {
  isOpen: boolean
  nameInput: string
  validationError: string
  isSaving: boolean
}

export const saveLayoutState = $state<SaveLayoutState>({
  isOpen: false,
  nameInput: '',
  validationError: '',
  isSaving: false
})

function hasActiveWorkspace(): boolean {
  return layoutState.layoutName.trim().length > 0 && layoutState.panes.length > 0
}

/**
 * Client-side validation mirroring main's isValidLayoutName().
 * Returns error message string or '' if valid.
 */
export function validateName(name: string): string {
  if (!name || name.trim().length === 0) return 'Layout name cannot be empty'
  if (name.trim() !== name) return 'Name cannot have leading or trailing spaces'
  if (name.includes('/') || name.includes('\\')) return 'Name cannot contain path separators'
  if (name.includes('..')) return 'Name cannot contain ".."'
  if (name.startsWith('.')) return 'Name cannot start with a dot'
  if (name.includes('\0')) return 'Name contains invalid characters'
  if (name.length > 255) return 'Name is too long (max 255 characters)'
  return ''
}

/**
 * Opens the Save Layout Surface and resets form state.
 * Returns false if there is no active workspace to save.
 */
export function openSaveLayout(): boolean {
  if (!hasActiveWorkspace()) {
    return false
  }

  saveLayoutState.isOpen = true
  saveLayoutState.nameInput = ''
  saveLayoutState.validationError = ''
  saveLayoutState.isSaving = false
  return true
}

/** Closes the Save Layout Surface. */
export function closeSaveLayout(): void {
  saveLayoutState.isOpen = false
}

/**
 * Validates name, calls window.api.layout.save(), closes surface on success.
 * Returns Result<string> where data is the saved layout name (for caller status msg).
 */
export async function saveCurrent(): Promise<Result<string>> {
  if (!hasActiveWorkspace()) {
    const message = 'No active workspace to save'
    saveLayoutState.validationError = message
    return { ok: false, error: { code: 'NO_ACTIVE_LAYOUT', message } }
  }

  const name = saveLayoutState.nameInput
  const err = validateName(name)
  if (err) {
    saveLayoutState.validationError = err
    return { ok: false, error: { code: 'VALIDATION_ERROR', message: err } }
  }

  saveLayoutState.validationError = ''
  saveLayoutState.isSaving = true

  try {
    const data = serializeLayoutForSave(name, layoutState)
    const result = await window.api.layout.save(name, data)

    if (!result.ok) {
      saveLayoutState.validationError = result.error.message
      return { ok: false, error: result.error }
    }

    closeSaveLayout()
    return { ok: true, data: name }
  } finally {
    saveLayoutState.isSaving = false
  }
}
