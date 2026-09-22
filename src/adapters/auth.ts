export interface User {
  id: string
  email: string
}

export interface Usage {
  /** Total AI tokens consumed by this user's runs. */
  tokens: number
  runs: number
}

/**
 * Identity and usage accounting. The stub keeps everything in the browser;
 * a real provider (Supabase, Clerk, Auth0...) implements the same surface.
 */
export interface AuthProvider {
  readonly name: string
  currentUser(): Promise<User | null>
  signIn(email: string): Promise<User>
  signOut(): Promise<void>
  usage(): Promise<Usage>
  recordUsage(tokens: number): Promise<void>
}

const USER_KEY = 'yourAiBuyerAgent.auth.user'
const usageKey = (userId: string) => `yourAiBuyerAgent.usage.${userId}`

function read<T>(key: string): T | null {
  try {
    const raw = localStorage.getItem(key)
    return raw ? (JSON.parse(raw) as T) : null
  } catch {
    return null
  }
}

function write(key: string, value: unknown) {
  try {
    localStorage.setItem(key, JSON.stringify(value))
  } catch {
    // storage unavailable; state lives for this page only
  }
}

export class StubAuthProvider implements AuthProvider {
  readonly name = 'Local account (stub)'

  async currentUser(): Promise<User | null> {
    return read<User>(USER_KEY)
  }

  async signIn(email: string): Promise<User> {
    const clean = email.trim().toLowerCase()
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(clean)) throw new Error('Enter a valid email address.')
    const user: User = { id: `user-${clean}`, email: clean }
    write(USER_KEY, user)
    return user
  }

  async signOut(): Promise<void> {
    try {
      localStorage.removeItem(USER_KEY)
    } catch {
      // ignore
    }
  }

  async usage(): Promise<Usage> {
    const user = await this.currentUser()
    if (!user) return { tokens: 0, runs: 0 }
    return read<Usage>(usageKey(user.id)) ?? { tokens: 0, runs: 0 }
  }

  async recordUsage(tokens: number): Promise<void> {
    const user = await this.currentUser()
    if (!user) return
    const current = await this.usage()
    write(usageKey(user.id), { tokens: current.tokens + tokens, runs: current.runs + 1 })
  }
}
