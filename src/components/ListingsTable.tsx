import { statusLabel, displayAddress, type Listing } from '../lib/listings'

interface ListingsTableProps {
  title: string
  rows: Listing[]
  /** Show the # column, which matches the map pin numbers. Only the latest run is numbered. */
  numbered?: boolean
  /** Show the Status column (sold / under offer / withdrawn); used for the seen tables. */
  showStatus?: boolean
}

export default function ListingsTable({ title, rows, numbered = false, showStatus = false }: ListingsTableProps) {
  return (
    <div className="table-block">
      <h3>{title}</h3>
      <div className="table-scroll">
        <table>
          <thead>
            <tr>
              {numbered && <th className="num">#</th>}
              <th>Address</th>
              <th>Bed/Bath/Car</th>
              <th>Price</th>
              {showStatus && <th>Status</th>}
              <th>Agency</th>
              <th>Link</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row, i) => (
              <tr key={`${row.address}-${row.url}`} className={[i % 2 ? 'alt' : '', row.status === 'sold' || row.status === 'withdrawn' ? row.status : ''].filter(Boolean).join(' ')}>
                {numbered && <td className="num">{row.num}</td>}
                <td>{displayAddress(row)}</td>
                <td>{row.bbc}</td>
                <td>{row.price}</td>
                {showStatus && <td>{statusLabel(row)}</td>}
                <td>{row.agency}</td>
                <td>
                  {row.url && (
                    <a href={row.url} target="_blank" rel="noopener noreferrer">
                      Open listing
                    </a>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
