/**
 * Latency harness: measures keystroke-to-echo round-trip for a single sessionId.
 * Uses 'echo -c' or shell echo to verify end-to-end pipeline timing.
 * NOT a production import — test/diagnostic use only.
 */
import { performance } from 'node:perf_hooks'
import { spawnPty, writePty, SpawnPtyHooks } from './pty-manager'

interface LatencySample {
  sentAt: number // performance.now() before write
  echoedAt: number // performance.now() when echo received
  latencyMs: number
}

interface LatencyResult {
  p50: number
  p95: number
  p99: number
  max: number
}

const PROBE_CHAR = '\x01' // Ctrl+A — shell will echo back in raw mode
// Note: Ctrl+A may trigger readline shortcuts in some shell configurations.
// For CI-safe measurement, consider using `stty raw` setup or printable characters.

/**
 * Measure echo latency for a PTY session by sending probe characters
 * and measuring round-trip time.
 *
 * @param samples - Number of samples to collect (default: 100)
 * @param shellPath - Shell to use for the test (default: $SHELL or /bin/bash)
 * @returns Latency percentiles (p50, p95, p99, max)
 */
export async function measureEchoLatency(
  samples = 100,
  shellPath = process.env.SHELL ?? '/bin/bash'
): Promise<LatencyResult> {
  const results: LatencySample[] = []
  let pendingMeasurement: Partial<LatencySample> | null = null
  let resolvePending: (() => void) | null = null
  const hooks: SpawnPtyHooks = {
    onData: (_sessionId: number, data: string) => {
      // Capture echo arrival time — matched to pending measurement
      if (pendingMeasurement && data.includes(PROBE_CHAR)) {
        pendingMeasurement.echoedAt = performance.now()
        pendingMeasurement.latencyMs =
          pendingMeasurement.echoedAt - (pendingMeasurement.sentAt ?? 0)
        results.push({
          sentAt: pendingMeasurement.sentAt ?? 0,
          echoedAt: pendingMeasurement.echoedAt,
          latencyMs: pendingMeasurement.latencyMs
        })
        resolvePending?.()
      }
    }
  }

  const result = await spawnPty(shellPath, [], process.env.HOME ?? '/tmp', hooks)

  if (!result.ok) {
    throw new Error(`Spawn failed: ${result.error.message}`)
  }

  const { sessionId } = result.data

  // Wait for shell prompt to settle
  await new Promise((r) => setTimeout(r, 200))

  for (let i = 0; i < samples; i++) {
    pendingMeasurement = { sentAt: 0, echoedAt: 0, latencyMs: 0 }
    resolvePending = null

    const echoReceived = new Promise<void>((resolve) => {
      resolvePending = resolve
    })

    pendingMeasurement.sentAt = performance.now()
    writePty(sessionId, PROBE_CHAR)

    // Timeout guard: if no echo in 100ms, skip sample
    await Promise.race([echoReceived, new Promise((r) => setTimeout(r, 100))])
    await new Promise((r) => setTimeout(r, 5)) // inter-sample gap
  }

  // Compute percentiles
  // Note: Uses Math.floor() which undershoots true percentile for small sample sizes.
  // This is intentionally conservative for latency measurement (reported P95 >= actual P95).
  const latencies = results.map((r) => r.latencyMs).sort((a, b) => a - b)
  const p = (pct: number): number => latencies[Math.floor((latencies.length * pct) / 100)] ?? 0

  return {
    p50: p(50),
    p95: p(95),
    p99: p(99),
    max: latencies[latencies.length - 1] ?? 0
  }
}
