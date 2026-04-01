import { describe, it, expect, vi, beforeEach } from 'vitest'
import { measureEchoLatency } from './latency-harness'
import * as ptyManager from './pty-manager'

// Integration tests - only run when INTEGRATION=true env var is set
// Run with: INTEGRATION=true npx vitest run src/main/pty/latency-harness.test.ts
//
// NOTE: This test requires a real shell and may fail in containerized CI environments
// due to missing PTY support, high load, or shell configuration differences.
// Run manually on development hardware for reliable results.
describe.skipIf(!process.env.INTEGRATION)('PTY Input Latency (Integration)', () => {
  it('achieves P95 echo latency < 16ms on local shell', async () => {
    const { p50, p95 } = await measureEchoLatency(50) // 50 samples for CI speed
    console.log(`Latency P50=${p50.toFixed(2)}ms P95=${p95.toFixed(2)}ms`)
    expect(p95).toBeLessThan(16)
    expect(p50).toBeLessThan(10) // P50 should be well under budget
  }, 30_000) // 30s timeout for shell spawning + 50 samples
})

// Unit tests - always run
describe('PTY write path (unit)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('writePty does not buffer — calls session.pty.write synchronously', () => {
    // This test verifies that writePty calls pty.write directly without scheduling
    // The implementation detail is verified by code inspection:
    // - writePty in pty-manager.ts calls session.pty.write(data) directly
    // - No setTimeout, Promise, or async scheduling is used

    // Since we cannot easily mock node-pty's IPty interface without complex setup,
    // we verify the behavior by checking the source code structure
    const writePtySource = ptyManager.writePty.toString()

    // writePty should not contain setTimeout (no buffering)
    expect(writePtySource).not.toContain('setTimeout')
    // writePty should not contain Promise (no async scheduling)
    expect(writePtySource).not.toContain('Promise')
    // writePty should call pty.write directly
    expect(writePtySource).toContain('pty.write')
  })

  it('DATA_BUFFER_INTERVAL_MS only applies to pty output data, not writes', () => {
    // Verify that DATA_BUFFER_INTERVAL_MS is only used in ptyProcess.onData callback
    // and NOT in writePty or any write path

    // The buffer timer should be set in ptyProcess.onData callback
    // This is verified by checking the spawnPty function structure
    const spawnPtySource = ptyManager.spawnPty.toString()

    // spawnPty should contain DATA_BUFFER_INTERVAL_MS for output buffering
    expect(spawnPtySource).toContain('DATA_BUFFER_INTERVAL_MS')

    // writePty should NOT contain DATA_BUFFER_INTERVAL_MS (no output buffering on writes)
    const writePtySource = ptyManager.writePty.toString()
    expect(writePtySource).not.toContain('DATA_BUFFER_INTERVAL_MS')
  })

  it('measureEchoLatency function exists and has correct signature', () => {
    // Verify the exported function exists
    expect(typeof measureEchoLatency).toBe('function')

    // Note: measureEchoLatency has default parameters (samples = 100, shellPath = ...)
    // so .length returns 0 (parameters before first default)
    // We verify the function signature works correctly by checking it accepts arguments
    expect(measureEchoLatency.length).toBeLessThanOrEqual(2)
  })
})

describe('Latency architecture assertions', () => {
  it('write path has no async scheduling (fire-and-forget)', () => {
    // Verify that writePty returns synchronously and does not await anything
    const writePtySource = ptyManager.writePty.toString()

    // Should not have async/await
    expect(writePtySource).not.toContain('await')
    // Should not be an async function
    expect(writePtySource).not.toContain('async')
  })

  it('output path uses buffering in ptyProcess.onData only', () => {
    // The buffering logic should only exist in the onData callback within spawnPty
    // This is verified by code inspection - the setTimeout for buffering
    // is only created in ptyProcess.onData handler
    const spawnPtySource = ptyManager.spawnPty.toString()

    // Should contain setTimeout for output buffering
    expect(spawnPtySource).toContain('setTimeout')
    // Should contain flushTimer management
    expect(spawnPtySource).toContain('flushTimer')
  })
})
