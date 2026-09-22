import type { SearchConfig } from '../lib/searchConfig'

export type RunStatus = 'queued' | 'running' | 'completed' | 'failed'

export interface AgentRun {
  id: string
  configId: string
  status: RunStatus
  startedAt: string
  finishedAt?: string
  /** Tokens the AI agent consumed, for usage based billing. */
  tokensUsed?: number
  message?: string
}

export type RunListener = (run: AgentRun) => void

/**
 * Something that can execute a house watch for a config. The UI only depends
 * on this interface, so a hosted agent service (scheduled or on demand) can be
 * plugged in later without touching the pages.
 */
export interface AgentRunner {
  readonly name: string
  trigger(config: SearchConfig): Promise<AgentRun>
  status(runId: string): Promise<AgentRun>
  subscribe(runId: string, listener: RunListener): () => void
}

interface StubOptions {
  /** How long a simulated run takes end to end. */
  durationMs?: number
}

/** Simulates a run locally so the flow can be exercised before a real agent exists. */
export class StubAgentRunner implements AgentRunner {
  readonly name = 'Simulated agent (stub)'
  private runs = new Map<string, AgentRun>()
  private listeners = new Map<string, Set<RunListener>>()
  private durationMs: number

  constructor(opts: StubOptions = {}) {
    this.durationMs = opts.durationMs ?? 4000
  }

  async trigger(config: SearchConfig): Promise<AgentRun> {
    const run: AgentRun = {
      id: `run-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`,
      configId: config.id,
      status: 'queued',
      startedAt: new Date().toISOString(),
    }
    this.runs.set(run.id, run)

    setTimeout(() => this.update(run.id, { status: 'running', message: `Checking ${Math.max(config.agencies.length, 1)} agency site(s)` }), this.durationMs * 0.25)
    setTimeout(
      () =>
        this.update(run.id, {
          status: 'completed',
          finishedAt: new Date().toISOString(),
          tokensUsed: 1500 + Math.floor(Math.random() * 1000),
          message: 'Run finished. Listings page updated.',
        }),
      this.durationMs,
    )
    return run
  }

  async status(runId: string): Promise<AgentRun> {
    const run = this.runs.get(runId)
    if (!run) throw new Error(`Unknown run ${runId}`)
    return run
  }

  subscribe(runId: string, listener: RunListener): () => void {
    const set = this.listeners.get(runId) ?? new Set<RunListener>()
    set.add(listener)
    this.listeners.set(runId, set)
    return () => set.delete(listener)
  }

  private update(runId: string, patch: Partial<AgentRun>) {
    const run = this.runs.get(runId)
    if (!run) return
    const next = { ...run, ...patch }
    this.runs.set(runId, next)
    this.listeners.get(runId)?.forEach((l) => l(next))
  }
}
