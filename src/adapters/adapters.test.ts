import { describe, it, expect, beforeEach, vi } from 'vitest'
import { StubAgentRunner } from './agentRunner'
import { StubAuthProvider } from './auth'
import { defaultCriteria, type SearchConfig } from '../lib/searchConfig'

const cfg: SearchConfig = {
  id: 'cfg-1',
  name: 'Northern Beaches',
  mapsUrl: 'https://www.google.com/maps/search/Real+estate+agent/@-33.79,151.26,14z',
  query: 'Real estate agent',
  focusSuburbs: ['Manly'],
  justOutsideSuburbs: [],
  criteria: defaultCriteria(),
  agencies: [],
  createdAt: '2026-09-22T00:00:00.000Z',
}

describe('StubAgentRunner', () => {
  beforeEach(() => vi.useFakeTimers())

  it('starts a run in the queued state and finishes it after its simulated duration', async () => {
    const runner = new StubAgentRunner({ durationMs: 1000 })
    const run = await runner.trigger(cfg)
    expect(run.status).toBe('queued')
    expect(run.configId).toBe('cfg-1')

    await vi.advanceTimersByTimeAsync(500)
    expect((await runner.status(run.id)).status).toBe('running')

    await vi.advanceTimersByTimeAsync(600)
    const done = await runner.status(run.id)
    expect(done.status).toBe('completed')
    expect(done.tokensUsed).toBeGreaterThan(0)
    expect(done.finishedAt).toBeDefined()
  })

  it('notifies subscribers on every status change', async () => {
    const runner = new StubAgentRunner({ durationMs: 1000 })
    const seen: string[] = []
    const run = await runner.trigger(cfg)
    runner.subscribe(run.id, (r) => seen.push(r.status))
    await vi.advanceTimersByTimeAsync(1100)
    expect(seen).toEqual(['running', 'completed'])
  })

  it('throws for an unknown run id', async () => {
    const runner = new StubAgentRunner()
    await expect(runner.status('nope')).rejects.toThrow(/unknown run/i)
  })

  it('exposes a stable provider name for the UI', () => {
    expect(new StubAgentRunner().name).toMatch(/stub|simulated/i)
  })
})

describe('StubAuthProvider', () => {
  beforeEach(() => localStorage.clear())

  it('starts signed out', async () => {
    expect(await new StubAuthProvider().currentUser()).toBeNull()
  })

  it('signs in with an email and remembers it across instances', async () => {
    await new StubAuthProvider().signIn('kim@example.com')
    const user = await new StubAuthProvider().currentUser()
    expect(user?.email).toBe('kim@example.com')
  })

  it('rejects an email without an @', async () => {
    await expect(new StubAuthProvider().signIn('not-an-email')).rejects.toThrow(/email/i)
  })

  it('signs out', async () => {
    const auth = new StubAuthProvider()
    await auth.signIn('kim@example.com')
    await auth.signOut()
    expect(await auth.currentUser()).toBeNull()
  })

  it('records token usage per user and reports the total', async () => {
    const auth = new StubAuthProvider()
    await auth.signIn('kim@example.com')
    await auth.recordUsage(1200)
    await auth.recordUsage(800)
    expect((await auth.usage()).tokens).toBe(2000)
  })

  it('reports zero usage when signed out', async () => {
    expect((await new StubAuthProvider().usage()).tokens).toBe(0)
  })
})
