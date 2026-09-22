import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import ListingsTable from './ListingsTable'
import type { Listing } from '../lib/listings'

const rows: Listing[] = [
  {
    num: 1,
    group: 'focus',
    address: '30 Woodland Street, Balgowlah Heights',
    bbc: '3/2/1',
    price: 'Undisclosed (Auction)',
    agency: 'Clarke & Humel',
    url: 'https://clarkeandhumel.com.au/buying/for-sale/30-woodland-street/',
  },
  {
    num: 2,
    group: 'focus',
    address: '1 Nowhere Lane, Manly',
    bbc: '4/2/2',
    price: 'Contact agent',
    agency: 'Test Agency',
    url: '',
  },
]

describe('ListingsTable', () => {
  it('renders the section title and one row per listing', () => {
    render(<ListingsTable title="Focus suburbs" rows={rows} />)
    expect(screen.getByRole('heading', { name: 'Focus suburbs' })).toBeInTheDocument()
    expect(screen.getAllByRole('row')).toHaveLength(rows.length + 1)
  })

  it('shows the same columns as the PDF report', () => {
    render(<ListingsTable title="Focus suburbs" rows={rows} />)
    const headers = screen.getAllByRole('columnheader').map((h) => h.textContent)
    expect(headers).toEqual(['Address', 'Bed/Bath/Car', 'Price', 'Agency', 'Link'])
  })

  it('adds the # column only when numbered', () => {
    const { unmount } = render(<ListingsTable title="Focus suburbs" rows={rows} numbered />)
    expect(screen.getAllByRole('columnheader')[0]).toHaveTextContent('#')
    expect(screen.getByRole('cell', { name: '1' })).toBeInTheDocument()
    unmount()
    render(<ListingsTable title="Focus suburbs" rows={rows} />)
    expect(screen.getAllByRole('columnheader')[0]).not.toHaveTextContent('#')
  })

  it('links each listing to its agency page in a new tab', () => {
    render(<ListingsTable title="Focus suburbs" rows={rows} />)
    const link = screen.getByRole('link', { name: 'Open listing' })
    expect(link).toHaveAttribute('href', rows[0].url)
    expect(link).toHaveAttribute('target', '_blank')
    expect(link).toHaveAttribute('rel', expect.stringContaining('noopener'))
  })

  it('renders no link when a listing has no url instead of an empty anchor', () => {
    render(<ListingsTable title="Focus suburbs" rows={rows} />)
    expect(screen.getAllByRole('link')).toHaveLength(1)
  })

  it('shows the listing details in the row', () => {
    render(<ListingsTable title="Focus suburbs" rows={rows} />)
    expect(screen.getByText('30 Woodland Street, Balgowlah Heights')).toBeInTheDocument()
    expect(screen.getByText('Undisclosed (Auction)')).toBeInTheDocument()
    expect(screen.getByText('Clarke & Humel')).toBeInTheDocument()
  })
})
