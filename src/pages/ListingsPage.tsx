import rawData from '../data/listings.json'
import ListingsMap from '../components/ListingsMap'
import ListingsTable from '../components/ListingsTable'
import { groupListings, groupBySuburb, suburbOrder, formatRunSummary, type SiteData } from '../lib/listings'

const data = rawData as unknown as SiteData

export default function ListingsPage() {
  const { latestRun, seen, groups } = data
  const seenOrder = suburbOrder(data.prioritySuburbs ?? [], data.focusSuburbs, data.justOutsideSuburbs)
  const focusSet = new Set(data.focusSuburbs)

  return (
    <div className="page">
      <header className="hero">
        <h1>{data.title}</h1>
        <p className="sub">
          Latest run: <strong>{latestRun.label}</strong> · {formatRunSummary(latestRun.listings.length)}
        </p>
        <p className="criteria">
          {data.criteria} Focus suburbs: {data.focusSuburbs.join(', ')}. Just outside: {data.justOutsideSuburbs.join(', ')}.
        </p>
      </header>

      <section className="map-section">
        <ListingsMap listings={latestRun.listings} center={data.mapCenter} zoom={data.mapZoom} />
        <p className="legend">
          Pin numbers match the # column below. Click a pin to open the listing.
          <span className="dot red" /> house, exact coordinates
          <span className="dot blue" /> near miss (wrong dwelling type), exact coordinates
          <span className="dot orange" /> street or suburb level (approximate).
        </p>
      </section>

      <section>
        <h2>New listings this run</h2>
        {latestRun.listings.length === 0 && <p>No new listings this run.</p>}
        {groupListings(latestRun.listings, groups).map((group) => (
          <ListingsTable key={group.id} title={group.label} rows={group.rows} numbered />
        ))}
      </section>

      <section>
        <h2>All listings seen so far</h2>
        {groupBySuburb(seen, seenOrder).map((group) => (
          <ListingsTable
            key={group.suburb}
            title={`${group.suburb} (${focusSet.has(group.suburb) ? 'focus suburb' : 'just outside'})`}
            rows={group.rows}
            showStatus
          />
        ))}
        <p className="excluded">
          <strong>Excluded</strong> (over $4m or wrong type): {data.excluded}
        </p>
      </section>

      <footer>Base map © OpenStreetMap contributors. Listing data from the agency websites linked above.</footer>
    </div>
  )
}
