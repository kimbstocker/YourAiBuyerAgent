import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import HomePage from './HomePage'
import { StubAgentRunner } from '../adapters/agentRunner'
import { StubAuthProvider } from '../adapters/auth'
import { LocalStorageConfigStore } from '../lib/searchConfig'

const MAPS = 'https://www.google.com/maps/search/Real+estate+agent/@-33.7955,151.2653,14z'

function renderHome(runner = new StubAgentRunner({ durationMs: 50 })) {
  return render(
    <MemoryRouter>
      <HomePage runner={runner} auth={new StubAuthProvider()} store={new LocalStorageConfigStore()} />
    </MemoryRouter>,
  )
}

async function fillValidForm(user: ReturnType<typeof userEvent.setup>) {
  await user.type(screen.getByLabelText(/search name/i), 'Northern Beaches')
  await user.type(screen.getByLabelText(/google maps/i), MAPS)
  await user.type(screen.getByLabelText(/focus suburbs/i), 'Manly, Balgowlah')
  await user.type(screen.getByLabelText(/just outside/i), 'Seaforth')
}

describe('HomePage', () => {
  beforeEach(() => localStorage.clear())

  it('shows step by step instructions that mention the Real estate agent keyword', () => {
    renderHome()
    const steps = screen.getByRole('list', { name: /how to/i })
    expect(within(steps).getAllByRole('listitem').length).toBeGreaterThanOrEqual(3)
    expect(steps).toHaveTextContent(/Real estate agent/)
    expect(steps).toHaveTextContent(/copy.*(url|link|address bar)/i)
  })

  it('shows what it read from the Maps link as soon as it is pasted', async () => {
    const user = userEvent.setup()
    renderHome()
    await user.type(screen.getByLabelText(/google maps/i), MAPS)
    const preview = screen.getByTestId('maps-preview')
    expect(preview).toHaveTextContent('Real estate agent')
    expect(preview).toHaveTextContent('-33.7955')
  })

  it('explains when a pasted link cannot be read', async () => {
    const user = userEvent.setup()
    renderHome()
    await user.type(screen.getByLabelText(/google maps/i), 'https://maps.app.goo.gl/xyz')
    expect(screen.getByRole('alert')).toHaveTextContent(/short link/i)
  })

  it('does not generate anything until the form is valid, and says why', async () => {
    const user = userEvent.setup()
    renderHome()
    await user.click(screen.getByRole('button', { name: /generate/i }))
    expect(screen.getByRole('alert')).toHaveTextContent(/name/i)
    expect(screen.queryByTestId('skill-output')).not.toBeInTheDocument()
  })

  it('generates the JSON config and a SKILL.md draft from a valid form and saves the config', async () => {
    const user = userEvent.setup()
    renderHome()
    await fillValidForm(user)
    await user.click(screen.getByRole('button', { name: /generate/i }))

    const out = screen.getByTestId('skill-output')
    expect(within(out).getByRole('tab', { name: /skill\.md/i })).toBeInTheDocument()
    expect(within(out).getByRole('tab', { name: /json/i })).toBeInTheDocument()
    expect(out).toHaveTextContent('northern-beaches-house-watch')
    expect(out).toHaveTextContent('Manly, Balgowlah')

    await user.click(within(out).getByRole('tab', { name: /json/i }))
    expect(out).toHaveTextContent('"focusSuburbs"')

    expect(new LocalStorageConfigStore().load()?.name).toBe('Northern Beaches')
  })

  it('restores a previously saved config into the form', async () => {
    new LocalStorageConfigStore().save({
      id: 'cfg-1',
      name: 'Saved search',
      mapsUrl: MAPS,
      query: 'Real estate agent',
      focusSuburbs: ['Fairlight'],
      justOutsideSuburbs: [],
      criteria: { minBeds: 4, minBaths: 2, minCars: 2, maxPrice: 3_000_000, propertyTypes: ['house'] },
      agencies: [],
      createdAt: '2026-09-22T00:00:00.000Z',
    })
    renderHome()
    expect(screen.getByLabelText(/search name/i)).toHaveValue('Saved search')
    expect(screen.getByLabelText(/focus suburbs/i)).toHaveValue('Fairlight')
    expect(screen.getByLabelText(/min.*bed/i)).toHaveValue(4)
  })

  it('keeps the run button disabled until a config has been generated', async () => {
    const user = userEvent.setup()
    renderHome()
    expect(screen.getByRole('button', { name: /run.*now/i })).toBeDisabled()
    await fillValidForm(user)
    await user.click(screen.getByRole('button', { name: /generate/i }))
    expect(screen.getByRole('button', { name: /run.*now/i })).toBeEnabled()
  })

  it('shows run progress and then a link to the listings page when the run completes', async () => {
    const user = userEvent.setup()
    renderHome(new StubAgentRunner({ durationMs: 30 }))
    await fillValidForm(user)
    await user.click(screen.getByRole('button', { name: /generate/i }))
    await user.click(screen.getByRole('button', { name: /run.*now/i }))

    const status = screen.getByRole('status')
    expect(status).toHaveTextContent(/queued|running/i)

    const link = await screen.findByRole('link', { name: /view listings/i }, { timeout: 2000 })
    expect(link).toHaveAttribute('href', '/listings')
    expect(status).toHaveTextContent(/completed/i)
  })

  it('lets a visitor sign in with an email and shows their token usage after a run', async () => {
    const user = userEvent.setup()
    renderHome(new StubAgentRunner({ durationMs: 30 }))
    await user.type(screen.getByLabelText(/^email$/i), 'kim@example.com')
    await user.click(screen.getByRole('button', { name: /sign in/i }))
    expect(screen.getByTestId('account')).toHaveTextContent('kim@example.com')
    expect(screen.getByTestId('account')).toHaveTextContent(/0 tokens/i)

    await fillValidForm(user)
    await user.click(screen.getByRole('button', { name: /generate/i }))
    await user.click(screen.getByRole('button', { name: /run.*now/i }))
    await screen.findByRole('link', { name: /view listings/i }, { timeout: 2000 })
    expect(screen.getByTestId('account')).not.toHaveTextContent(/\b0 tokens/i)
  })

  it('offers to download the SKILL.md', async () => {
    const user = userEvent.setup()
    const createObjectURL = vi.fn(() => 'blob:skill')
    const revoke = vi.fn()
    Object.assign(URL, { createObjectURL, revokeObjectURL: revoke })
    renderHome()
    await fillValidForm(user)
    await user.click(screen.getByRole('button', { name: /generate/i }))
    const dl = screen.getByRole('link', { name: /download skill\.md/i })
    expect(dl).toHaveAttribute('download', 'northern-beaches-house-watch.SKILL.md')
    expect(dl).toHaveAttribute('href', 'blob:skill')
  })
})
