import { render, screen, fireEvent } from '@testing-library/svelte'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import SaveLayoutSurface from './SaveLayoutSurface.svelte'
import * as store from '../../stores/save-layout-store.svelte'

vi.mock('../../stores/save-layout-store.svelte', () => ({
  saveLayoutState: { isOpen: false, nameInput: '', validationError: '', isSaving: false },
  closeSaveLayout: vi.fn(),
  saveCurrent: vi.fn().mockResolvedValue({ ok: true, data: undefined }),
  validateName: vi.fn().mockReturnValue('')
}))

describe('SaveLayoutSurface', () => {
  beforeEach(() => {
    vi.resetAllMocks()
    // Default: open state
    ;(store.saveLayoutState as Record<string, unknown>).isOpen = true
    ;(store.saveLayoutState as Record<string, unknown>).nameInput = ''
    ;(store.saveLayoutState as Record<string, unknown>).validationError = ''
    ;(store.saveLayoutState as Record<string, unknown>).isSaving = false
  })

  it('does not render when isOpen is false', () => {
    ;(store.saveLayoutState as Record<string, unknown>).isOpen = false
    render(SaveLayoutSurface, { props: { onSaved: vi.fn() } })
    expect(screen.queryByRole('dialog')).toBeNull()
  })

  it('renders input and confirm button when isOpen is true', () => {
    render(SaveLayoutSurface, { props: { onSaved: vi.fn() } })
    expect(screen.getByRole('dialog')).toBeTruthy()
    expect(screen.getByRole('textbox')).toBeTruthy()
  })

  it('calls closeSaveLayout on Escape key', () => {
    render(SaveLayoutSurface, { props: { onSaved: vi.fn() } })
    const dialog = screen.getByRole('dialog')
    fireEvent.keyDown(dialog, { key: 'Escape' })
    expect(store.closeSaveLayout).toHaveBeenCalled()
  })

  it('calls saveCurrent on Enter key and fires onSaved callback with name', async () => {
    const onSaved = vi.fn()
    ;(store.saveCurrent as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: true,
      data: 'my-layout'
    })
    render(SaveLayoutSurface, { props: { onSaved } })
    const input = screen.getByRole('textbox')
    fireEvent.keyDown(input, { key: 'Enter' })
    // Wait for both async operations to complete in sequence
    await vi.waitFor(() => {
      expect(store.saveCurrent).toHaveBeenCalled()
      expect(onSaved).toHaveBeenCalledWith('my-layout')
    })
  })

  it('shows inline validation error when validationError is set', () => {
    ;(store.saveLayoutState as Record<string, unknown>).validationError = 'Name cannot be empty'
    render(SaveLayoutSurface, { props: { onSaved: vi.fn() } })
    expect(screen.getByText('Name cannot be empty')).toBeTruthy()
  })

  it('disables input and button while isSaving', () => {
    ;(store.saveLayoutState as Record<string, unknown>).isSaving = true
    render(SaveLayoutSurface, { props: { onSaved: vi.fn() } })
    const input = screen.getByRole('textbox') as HTMLInputElement
    expect(input.disabled).toBe(true)
  })

  it('closes on backdrop click', () => {
    render(SaveLayoutSurface, { props: { onSaved: vi.fn() } })
    const backdrop = screen.getByRole('dialog').parentElement!
    fireEvent.click(backdrop)
    expect(store.closeSaveLayout).toHaveBeenCalled()
  })
})
