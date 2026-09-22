import '@testing-library/jest-dom/vitest'
import { vi } from 'vitest'

// react-leaflet needs a real browser canvas and layout engine, neither of which
// jsdom provides. These stand-ins keep the component's own contract visible to
// the tests (which pins exist, what number they carry, where a click goes)
// without pulling in Leaflet's DOM machinery.
vi.mock('react-leaflet', () => {
  const React = require('react')
  return {
    MapContainer: ({ children, center, zoom }: any) =>
      React.createElement(
        'div',
        { 'data-testid': 'map-container', 'data-center': JSON.stringify(center), 'data-zoom': zoom },
        children,
      ),
    TileLayer: ({ attribution, url }: any) =>
      React.createElement('div', { 'data-testid': 'tile-layer', 'data-attribution': attribution, 'data-url': url }),
    Marker: ({ children, position, eventHandlers, icon }: any) =>
      React.createElement(
        'button',
        {
          'data-testid': 'listing-pin',
          'data-position': JSON.stringify(position),
          'data-num': icon?.options?.num,
          'data-exact': String(icon?.options?.exact),
          onClick: eventHandlers?.click,
        },
        children,
      ),
    Tooltip: ({ children }: any) => React.createElement('div', { 'data-testid': 'pin-tooltip' }, children),
  }
})

vi.mock('leaflet/dist/leaflet.css', () => ({}))
