import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import ListingsMap from './ListingsMap'
import type { Listing } from '../lib/listings'

const rows: Listing[] = [
  { num: 1, group: 'focus', address: 'Beach House, Freshwater', bbc: '5/4/2', price: 'Undisclosed', agency: 'Belle', url: 'https://example.com/1', lat: -33.7751, lng: 151.2845, exact: false },
  { num: 2, group: 'focus', address: '30 Woodland Street, Balgowlah Heights', bbc: '3/2/1', price: 'Auction', agency: 'Clarke & Humel', url: 'https://example.com/2', lat: -33.8066, lng: 151.2604, exact: true },
  { num: 3, group: 'nearMiss', address: 'No coordinates, Manly', bbc: '3/2/2', price: 'Contact agent', agency: 'Whitehouse', url: 'https://example.com/3' },
]

describe('ListingsMap', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })

  it('renders one pin per listing that has coordinates', () => {
    render(<ListingsMap listings={rows} center={[-33.79, 151.268]} zoom={14} />)
    expect(screen.getAllByTestId('listing-pin')).toHaveLength(2)
  })

  it('labels each pin with its listing number so it matches the # column', () => {
    render(<ListingsMap listings={rows} center={[-33.79, 151.268]} zoom={14} />)
    expect(screen.getAllByTestId('listing-pin').map((p) => p.getAttribute('data-num'))).toEqual(['1', '2'])
  })

  it('colours pins red when exact and orange when approximate', () => {
    render(<ListingsMap listings={rows} center={[-33.79, 151.268]} zoom={14} />)
    const pins = screen.getAllByTestId('listing-pin')
    expect(pins[0]).toHaveAttribute('data-exact', 'false')
    expect(pins[1]).toHaveAttribute('data-exact', 'true')
  })

  it('opens the agency listing in a new tab when a pin is clicked', async () => {
    const open = vi.spyOn(window, 'open').mockImplementation(() => null)
    render(<ListingsMap listings={rows} center={[-33.79, 151.268]} zoom={14} />)
    await userEvent.click(screen.getAllByTestId('listing-pin')[1])
    expect(open).toHaveBeenCalledWith('https://example.com/2', '_blank', 'noopener,noreferrer')
  })

  it('renders nothing but the map when no listing has coordinates', () => {
    render(<ListingsMap listings={[rows[2]]} center={[-33.79, 151.268]} zoom={14} />)
    expect(screen.queryAllByTestId('listing-pin')).toHaveLength(0)
    expect(screen.getByTestId('map-container')).toBeInTheDocument()
  })

  it('credits OpenStreetMap for the tiles', () => {
    render(<ListingsMap listings={rows} center={[-33.79, 151.268]} zoom={14} />)
    expect(screen.getByTestId('tile-layer')).toHaveAttribute('data-attribution', expect.stringContaining('OpenStreetMap'))
  })
})
