import { MapContainer, TileLayer, Marker, Tooltip } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { hasCoords, isExactPin, pinColor, type Listing } from '../lib/listings'

const OSM_ATTRIBUTION = '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'

interface PinIconOptions extends L.DivIconOptions {
  num: number
  exact: boolean
}

/** A numbered droplet pin, matching the # column in the tables below the map. */
function pinIcon(num: number, exact: boolean): L.DivIcon {
  const color = pinColor(exact)
  const html = `
    <svg width="44" height="58" viewBox="0 0 44 58" role="img" aria-label="Listing ${num}">
      <path d="M22 56 C22 56 4 34 4 21 A18 18 0 0 1 40 21 C40 34 22 56 22 56 Z"
            fill="${color}" stroke="white" stroke-width="3"/>
      <text x="22" y="27" text-anchor="middle" font-family="Helvetica, Arial, sans-serif"
            font-weight="700" font-size="18" fill="white">${num}</text>
    </svg>`

  return L.divIcon({
    html,
    className: 'pin-icon',
    iconSize: [44, 58],
    iconAnchor: [22, 56],
    tooltipAnchor: [0, -50],
    num,
    exact,
  } as PinIconOptions)
}

interface ListingsMapProps {
  listings: Listing[]
  center: [number, number]
  zoom: number
}

export default function ListingsMap({ listings, center, zoom }: ListingsMapProps) {
  const pins = listings.filter(hasCoords)

  return (
    <MapContainer center={center} zoom={zoom} scrollWheelZoom={false} className="map">
      <TileLayer attribution={OSM_ATTRIBUTION} url="https://tile.openstreetmap.org/{z}/{x}/{y}.png" />
      {pins.map((listing) => {
        const exact = isExactPin(listing)
        return (
          <Marker
            key={listing.num}
            position={[listing.lat, listing.lng]}
            icon={pinIcon(listing.num, exact)}
            eventHandlers={{ click: () => window.open(listing.url, '_blank', 'noopener,noreferrer') }}
          >
            <Tooltip direction="top">
              <strong>#{listing.num}</strong> {listing.address}
              <br />
              {listing.bbc} · {listing.price}
              <br />
              <em>{listing.agency}</em>
            </Tooltip>
          </Marker>
        )
      })}
    </MapContainer>
  )
}
