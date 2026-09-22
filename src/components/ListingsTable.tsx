import type { Listing } from '../lib/listings'

interface ListingsTableProps {
  title: string
  rows: Listing[]
  /** Show the # column, which matches the map pin numbers. Only the latest run is numbered. */
  numbered?: boolean
}

export default function ListingsTable({ title, rows, numbered = false }: ListingsTableProps) {
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
              <th>Agency</th>
              <th>Link</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row, i) => (
              <tr key={`${row.address}-${row.url}`} className={i % 2 ? 'alt' : ''}>
                {numbered && <td className="num">{row.num}</td>}
                <td>{row.address}</td>
                <td>{row.bbc}</td>
                <td>{row.price}</td>
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
