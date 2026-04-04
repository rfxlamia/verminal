import { describe, it, expect, beforeEach, vi } from 'vitest'

describe('command-center-store', () => {
  beforeEach(() => {
    // Reset modules to get fresh state for each test
    vi.resetModules()
  })

  describe('commandCenterState', () => {
    it('isOpen defaults to true', async () => {
      const { commandCenterState } = await import('./command-center-store.svelte')
      expect(commandCenterState.isOpen).toBe(true)
    })
  })

  describe('closeCommandCenter()', () => {
    it('sets isOpen to false', async () => {
      const { commandCenterState, closeCommandCenter } = await import(
        './command-center-store.svelte'
      )
      // Ensure it starts open
      expect(commandCenterState.isOpen).toBe(true)
      closeCommandCenter()
      expect(commandCenterState.isOpen).toBe(false)
    })

    it('is idempotent when already closed', async () => {
      const { commandCenterState, closeCommandCenter } = await import(
        './command-center-store.svelte'
      )
      closeCommandCenter()
      expect(commandCenterState.isOpen).toBe(false)
      closeCommandCenter()
      expect(commandCenterState.isOpen).toBe(false)
    })
  })

  describe('openCommandCenter()', () => {
    it('sets isOpen to true', async () => {
      const { commandCenterState, openCommandCenter, closeCommandCenter } = await import(
        './command-center-store.svelte'
      )
      // First close it
      closeCommandCenter()
      expect(commandCenterState.isOpen).toBe(false)
      // Then open it
      openCommandCenter()
      expect(commandCenterState.isOpen).toBe(true)
    })

    it('is idempotent when already open', async () => {
      const { commandCenterState, openCommandCenter } = await import(
        './command-center-store.svelte'
      )
      expect(commandCenterState.isOpen).toBe(true)
      openCommandCenter()
      expect(commandCenterState.isOpen).toBe(true)
    })
  })
})
