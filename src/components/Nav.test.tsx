import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import Nav from './Nav'

const renderNav = (path = '/') =>
  render(
    <MemoryRouter initialEntries={[path]}>
      <Nav />
    </MemoryRouter>,
  )

describe('Nav', () => {
  it('shows a hamburger button with an accessible name and a closed menu', () => {
    renderNav()
    const button = screen.getByRole('button', { name: /menu/i })
    expect(button).toHaveAttribute('aria-expanded', 'false')
    expect(screen.queryByRole('navigation', { name: /main/i })).not.toBeInTheDocument()
  })

  it('opens the menu with links to Home and Listings', async () => {
    renderNav()
    await userEvent.click(screen.getByRole('button', { name: /menu/i }))
    expect(screen.getByRole('button', { name: /menu/i })).toHaveAttribute('aria-expanded', 'true')
    const nav = screen.getByRole('navigation', { name: /main/i })
    expect(nav).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Home' })).toHaveAttribute('href', '/')
    expect(screen.getByRole('link', { name: 'Listings' })).toHaveAttribute('href', '/listings')
  })

  it('closes the menu when a link is chosen', async () => {
    renderNav()
    await userEvent.click(screen.getByRole('button', { name: /menu/i }))
    await userEvent.click(screen.getByRole('link', { name: 'Listings' }))
    expect(screen.queryByRole('navigation', { name: /main/i })).not.toBeInTheDocument()
  })

  it('marks the current page', async () => {
    renderNav('/listings')
    await userEvent.click(screen.getByRole('button', { name: /menu/i }))
    expect(screen.getByRole('link', { name: 'Listings' })).toHaveAttribute('aria-current', 'page')
    expect(screen.getByRole('link', { name: 'Home' })).not.toHaveAttribute('aria-current')
  })

  it('closes on Escape', async () => {
    renderNav()
    await userEvent.click(screen.getByRole('button', { name: /menu/i }))
    await userEvent.keyboard('{Escape}')
    expect(screen.queryByRole('navigation', { name: /main/i })).not.toBeInTheDocument()
  })
})
