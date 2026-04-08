import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { render, cleanup } from '@testing-library/svelte'
import StatusBar from './StatusBar.svelte'
import { setFocusMode, setFocusedPaneId } from '../../stores/workspace-ui-store.svelte'
import { layoutState } from '../../stores/layout-store.svelte'

describe('Focus Mode Status Display', () => {
  beforeEach(() => {
    setFocusMode(false)
    setFocusedPaneId(null)
    layoutState.panes = []
    layoutState.layoutName = ''
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
    cleanup()
    document.body.innerHTML = ''
  })

  it('does not show focus indicator when focus mode is inactive', async () => {
    layoutState.panes = [
      { paneId: 1, sessionId: 101, name: 'Server' },
      { paneId: 2, sessionId: 102, name: 'Logs' }
    ]

    const { container } = render(StatusBar)

    await vi.runAllTimersAsync()

    const focusIndicator = container.querySelector('[data-testid="focus-indicator"]')
    expect(focusIndicator).toBeFalsy()
  })

  it('shows [FOCUS: <pane-name>] when focus mode is active', async () => {
    layoutState.panes = [
      { paneId: 1, sessionId: 101, name: 'Server' },
      { paneId: 2, sessionId: 102, name: 'Logs' }
    ]
    setFocusedPaneId(1)
    setFocusMode(true)

    const { container } = render(StatusBar)

    await vi.runAllTimersAsync()

    const focusIndicator = container.querySelector('[data-testid="focus-indicator"]')
    expect(focusIndicator).toBeTruthy()
    expect(focusIndicator?.textContent).toBe('[FOCUS: Server]')
  })

  it('updates focus indicator when focused pane changes', async () => {
    layoutState.panes = [
      { paneId: 1, sessionId: 101, name: 'Server' },
      { paneId: 2, sessionId: 102, name: 'Logs' }
    ]
    setFocusedPaneId(1)
    setFocusMode(true)

    const { container } = render(StatusBar)
    await vi.runAllTimersAsync()

    // Change focused pane
    setFocusedPaneId(2)
    await vi.runAllTimersAsync()

    const focusIndicator = container.querySelector('[data-testid="focus-indicator"]')
    expect(focusIndicator?.textContent).toBe('[FOCUS: Logs]')
  })

  it('removes focus indicator when focus mode exits', async () => {
    layoutState.panes = [{ paneId: 1, sessionId: 101, name: 'Server' }]
    setFocusedPaneId(1)
    setFocusMode(true)

    const { container } = render(StatusBar)
    await vi.runAllTimersAsync()

    // Exit focus mode
    setFocusMode(false)
    setFocusedPaneId(null)
    await vi.runAllTimersAsync()

    const focusIndicator = container.querySelector('[data-testid="focus-indicator"]')
    expect(focusIndicator).toBeFalsy()
  })

  it('shows default name for unnamed pane', async () => {
    layoutState.panes = [
      { paneId: 1, sessionId: 101, name: '' } // empty name
    ]
    // Default name format: "Pane 1"
    setFocusedPaneId(1)
    setFocusMode(true)

    const { container } = render(StatusBar)
    await vi.runAllTimersAsync()

    const focusIndicator = container.querySelector('[data-testid="focus-indicator"]')
    expect(focusIndicator?.textContent).toBe('[FOCUS: Pane 1]')
  })

  it('focus indicator has no animation (respects prefers-reduced-motion)', async () => {
    layoutState.panes = [{ paneId: 1, sessionId: 101, name: 'Server' }]
    setFocusedPaneId(1)
    setFocusMode(true)

    const { container } = render(StatusBar)
    await vi.runAllTimersAsync()

    const focusIndicator = container.querySelector('[data-testid="focus-indicator"]')
    expect(focusIndicator).toBeTruthy()
    // Verify no transition/animation is explicitly set (empty string = no animation CSS defined)
    const style = window.getComputedStyle(focusIndicator!)
    expect(style.transition || '').toBe('')
    expect(style.animation || '').toBe('')
  })
})
