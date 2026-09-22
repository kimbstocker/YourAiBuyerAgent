import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import type { AgentRunner, AgentRun } from '../adapters/agentRunner'
import type { AuthProvider, User, Usage } from '../adapters/auth'
import { parseMapsUrl } from '../lib/mapsUrl'
import {
  defaultCriteria,
  newConfigId,
  parseSuburbList,
  validateConfig,
  type ConfigStore,
  type Criteria,
  type PropertyType,
  type SearchConfig,
} from '../lib/searchConfig'
import { renderConfigJson, renderSkillMarkdown, skillFileName } from '../lib/skillDraft'

interface HomePageProps {
  runner: AgentRunner
  auth: AuthProvider
  store: ConfigStore
}

const PROPERTY_TYPES: { id: PropertyType; label: string }[] = [
  { id: 'house', label: 'House' },
  { id: 'townhouse', label: 'Townhouse' },
  { id: 'apartment', label: 'Apartment' },
  { id: 'land', label: 'Land' },
]

interface FormState {
  name: string
  mapsUrl: string
  focus: string
  outside: string
  criteria: Criteria
}

function formFromConfig(cfg: SearchConfig | null): FormState {
  return {
    name: cfg?.name ?? '',
    mapsUrl: cfg?.mapsUrl ?? '',
    focus: cfg?.focusSuburbs.join(', ') ?? '',
    outside: cfg?.justOutsideSuburbs.join(', ') ?? '',
    criteria: cfg?.criteria ?? defaultCriteria(),
  }
}

export default function HomePage({ runner, auth, store }: HomePageProps) {
  const saved = useMemo(() => store.load(), [store])
  const [form, setForm] = useState<FormState>(() => formFromConfig(saved))
  const [config, setConfig] = useState<SearchConfig | null>(saved)
  const [problems, setProblems] = useState<string[]>([])
  const [tab, setTab] = useState<'skill' | 'json'>('skill')
  const [run, setRun] = useState<AgentRun | null>(null)
  const [user, setUser] = useState<User | null>(null)
  const [usage, setUsage] = useState<Usage>({ tokens: 0, runs: 0 })
  const [email, setEmail] = useState('')
  const [authError, setAuthError] = useState<string | null>(null)

  const parsed = useMemo(() => (form.mapsUrl.trim() ? parseMapsUrl(form.mapsUrl) : null), [form.mapsUrl])

  useEffect(() => {
    let alive = true
    auth.currentUser().then((u) => {
      if (!alive) return
      setUser(u)
      if (u) auth.usage().then((us) => alive && setUsage(us))
    })
    return () => {
      alive = false
    }
  }, [auth])

  const skillMd = config ? renderSkillMarkdown(config) : ''
  const skillUrl = useMemo(() => {
    if (!skillMd || typeof URL.createObjectURL !== 'function') return null
    try {
      return URL.createObjectURL(new Blob([skillMd], { type: 'text/markdown' }))
    } catch {
      return null
    }
  }, [skillMd])
  useEffect(
    () => () => {
      if (skillUrl && typeof URL.revokeObjectURL === 'function') {
        try {
          URL.revokeObjectURL(skillUrl)
        } catch {
          // nothing to release
        }
      }
    },
    [skillUrl],
  )

  function update<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((f) => ({ ...f, [key]: value }))
  }
  function updateCriteria<K extends keyof Criteria>(key: K, value: Criteria[K]) {
    setForm((f) => ({ ...f, criteria: { ...f.criteria, [key]: value } }))
  }
  function toggleType(t: PropertyType) {
    const has = form.criteria.propertyTypes.includes(t)
    updateCriteria('propertyTypes', has ? form.criteria.propertyTypes.filter((x) => x !== t) : [...form.criteria.propertyTypes, t])
  }

  function generate() {
    const ok = parsed?.ok ? parsed.value : null
    const cfg: SearchConfig = {
      id: config?.id ?? newConfigId(),
      name: form.name.trim(),
      mapsUrl: form.mapsUrl.trim(),
      query: ok?.query ?? '',
      center: ok?.center,
      zoom: ok?.zoom,
      focusSuburbs: parseSuburbList(form.focus),
      justOutsideSuburbs: parseSuburbList(form.outside),
      criteria: form.criteria,
      agencies: config?.agencies ?? [],
      createdAt: config?.createdAt ?? new Date().toISOString(),
    }
    const found = validateConfig(cfg)
    if (parsed && !parsed.ok) found.unshift(parsed.error)
    setProblems(found)
    if (found.length) {
      setConfig(null)
      return
    }
    store.save(cfg)
    setConfig(cfg)
    setRun(null)
  }

  async function triggerRun() {
    if (!config) return
    const started = await runner.trigger(config)
    setRun(started)
    runner.subscribe(started.id, async (r) => {
      setRun(r)
      if (r.status === 'completed' && r.tokensUsed) {
        await auth.recordUsage(r.tokensUsed)
        setUsage(await auth.usage())
      }
    })
  }

  async function signIn() {
    setAuthError(null)
    try {
      const u = await auth.signIn(email)
      setUser(u)
      setUsage(await auth.usage())
      setEmail('')
    } catch (e) {
      setAuthError(e instanceof Error ? e.message : 'Could not sign in.')
    }
  }

  async function signOut() {
    await auth.signOut()
    setUser(null)
    setUsage({ tokens: 0, runs: 0 })
  }

  return (
    <div className="page home">
      <header className="hero">
        <h1>Your AI buyer's agent</h1>
        <p className="sub">
          Tell it where you want to buy. It drafts the instructions an AI agent follows to watch every local agency's website and
          report only the listings you have not seen.
        </p>
      </header>

      <section className="card">
        <h2>How to set up your search</h2>
        <ol className="steps" aria-label="How to set up your search">
          <li>
            Open <a href="https://www.google.com/maps" target="_blank" rel="noopener noreferrer">Google Maps</a> and move the map to the
            suburbs you want to buy in.
          </li>
          <li>
            Search for <strong>Real estate agent</strong>. Zoom so the results cover your whole area; the agencies shown are the
            websites that will be watched.
          </li>
          <li>Copy the full URL from the browser address bar (or Share, then Copy link) and paste it below.</li>
          <li>Name the search, list your suburbs and set your criteria, then generate the config and skill.</li>
        </ol>
      </section>

      <section className="card">
        <h2>Your search</h2>
        <div className="form-grid">
          <label>
            Search name
            <input value={form.name} onChange={(e) => update('name', e.target.value)} placeholder="e.g. Northern Beaches" />
          </label>

          <label className="wide">
            Google Maps link
            <textarea
              rows={2}
              value={form.mapsUrl}
              onChange={(e) => update('mapsUrl', e.target.value)}
              placeholder="https://www.google.com/maps/search/Real+estate+agent/@-33.79,151.26,14z"
            />
          </label>

          {parsed && parsed.ok && (
            <div className="preview wide" data-testid="maps-preview">
              <strong>Read from the link:</strong> search "{parsed.value.query}"
              {parsed.value.center && (
                <>
                  {' '}
                  around {parsed.value.center[0]}, {parsed.value.center[1]}
                </>
              )}
              {parsed.value.zoom !== undefined && <> at zoom {parsed.value.zoom}</>}.
              {parsed.value.warnings.map((w) => (
                <div key={w} className="warn">
                  {w}
                </div>
              ))}
            </div>
          )}
          {parsed && !parsed.ok && (
            <div className="error wide" role="alert">
              {parsed.error}
            </div>
          )}

          <label>
            Focus suburbs
            <textarea rows={2} value={form.focus} onChange={(e) => update('focus', e.target.value)} placeholder="Manly, Balgowlah, Fairlight" />
          </label>
          <label>
            Just outside (optional)
            <textarea rows={2} value={form.outside} onChange={(e) => update('outside', e.target.value)} placeholder="Seaforth, Clontarf" />
          </label>

          <label>
            Min bedrooms
            <input type="number" min={0} value={form.criteria.minBeds} onChange={(e) => updateCriteria('minBeds', Number(e.target.value))} />
          </label>
          <label>
            Min bathrooms
            <input type="number" min={0} value={form.criteria.minBaths} onChange={(e) => updateCriteria('minBaths', Number(e.target.value))} />
          </label>
          <label>
            Min car spaces
            <input type="number" min={0} value={form.criteria.minCars} onChange={(e) => updateCriteria('minCars', Number(e.target.value))} />
          </label>
          <label>
            Max price (AUD)
            <input type="number" min={0} step={50000} value={form.criteria.maxPrice} onChange={(e) => updateCriteria('maxPrice', Number(e.target.value))} />
          </label>

          <fieldset className="wide">
            <legend>Property types</legend>
            {PROPERTY_TYPES.map((t) => (
              <label key={t.id} className="check">
                <input type="checkbox" checked={form.criteria.propertyTypes.includes(t.id)} onChange={() => toggleType(t.id)} />
                {t.label}
              </label>
            ))}
          </fieldset>
        </div>

        {problems.length > 0 && !(parsed && !parsed.ok && problems.length === 1) && (
          <ul className="error" role="alert">
            {problems.map((p) => (
              <li key={p}>{p}</li>
            ))}
          </ul>
        )}

        <div className="actions">
          <button type="button" className="primary" onClick={generate}>
            Generate config and skill
          </button>
        </div>
      </section>

      {config && (
        <section className="card" data-testid="skill-output">
          <h2>Generated for "{config.name}"</h2>
          <p className="muted">
            The SKILL.md is what an AI agent follows on each run. The JSON is the same search as data, for the service that schedules
            those runs.
          </p>
          <div role="tablist" className="tabs">
            <button role="tab" type="button" aria-selected={tab === 'skill'} onClick={() => setTab('skill')}>
              SKILL.md
            </button>
            <button role="tab" type="button" aria-selected={tab === 'json'} onClick={() => setTab('json')}>
              JSON config
            </button>
          </div>
          <pre className="code" role="tabpanel">
            {tab === 'skill' ? skillMd : renderConfigJson(config)}
          </pre>
          <div className="actions">
            <button type="button" onClick={() => navigator.clipboard?.writeText(tab === 'skill' ? skillMd : renderConfigJson(config))}>
              Copy {tab === 'skill' ? 'SKILL.md' : 'JSON'}
            </button>
            {skillUrl && (
              <a className="button" href={skillUrl} download={skillFileName(config.name)}>
                Download SKILL.md
              </a>
            )}
          </div>
        </section>
      )}

      <section className="card">
        <h2>Run the watch</h2>
        <p className="muted">
          Runs are executed by an AI agent ({runner.name}). Later this will be a scheduled service you can also trigger by hand.
        </p>
        <div className="actions">
          <button type="button" className="primary" disabled={!config || (run !== null && run.status !== 'completed' && run.status !== 'failed')} onClick={triggerRun}>
            Run now
          </button>
          {run?.status === 'completed' && (
            <Link className="button" to="/listings">
              View listings
            </Link>
          )}
        </div>
        <p role="status" className={`run-status ${run?.status ?? ''}`}>
          {run ? (
            <>
              Run {run.status}
              {run.message ? `: ${run.message}` : ''}
              {run.tokensUsed ? ` (${run.tokensUsed.toLocaleString()} tokens)` : ''}
            </>
          ) : (
            'No run started yet.'
          )}
        </p>
      </section>

      <section className="card" data-testid="account">
        <h2>Account</h2>
        {user ? (
          <>
            <p>
              Signed in as <strong>{user.email}</strong>. Usage: {usage.tokens.toLocaleString()} tokens across {usage.runs} run
              {usage.runs === 1 ? '' : 's'}.
            </p>
            <p className="muted">Usage is what you would be billed on. Your search config stays in your own account.</p>
            <button type="button" onClick={signOut}>
              Sign out
            </button>
          </>
        ) : (
          <>
            <p className="muted">
              Sign in to keep your searches and see the AI usage each run costs. ({auth.name}; a real provider replaces this later.)
            </p>
            <div className="inline-form">
              <label>
                Email
                <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" />
              </label>
              <button type="button" onClick={signIn}>
                Sign in
              </button>
            </div>
            {authError && (
              <p className="error" role="alert">
                {authError}
              </p>
            )}
          </>
        )}
      </section>
    </div>
  )
}
