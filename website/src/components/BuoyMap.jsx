// A simple map of the tropical Pacific with one dot per buoy.
// Reusable: the Forecast page colors dots by forecast tier; the Buoy map page can
// color them by deployment year.

const WIDTH = 1000
const HEIGHT = 420
const LON_MIN = 130 // degrees east, 0–360
const LON_MAX = 272
const LAT_MIN = -10
const LAT_MAX = 10

// Longitudes in the data run -180..180; the Pacific crosses the date line, so use 0..360.
const toEast = (lon) => (lon < 0 ? lon + 360 : lon)
const x = (lon) => ((toEast(lon) - LON_MIN) / (LON_MAX - LON_MIN)) * WIDTH
const y = (lat) => ((LAT_MAX - lat) / (LAT_MAX - LAT_MIN)) * HEIGHT

const lonLabel = (lonEast) => (lonEast < 180 ? `${lonEast}°E` : lonEast === 180 ? '180°' : `${360 - lonEast}°W`)

export default function BuoyMap({ buoys, selectedId, onSelect, colorFor, title }) {
  const handleKey = (event, id) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault()
      onSelect?.(id)
    }
  }

  return (
    <svg className="buoy-map" viewBox={`0 0 ${WIDTH} ${HEIGHT}`} role="group" aria-label={title}>
      <rect width={WIDTH} height={HEIGHT} className="map-ocean" />

      {[-5, 0, 5].map((lat) => (
        <g key={lat}>
          <line x1={0} x2={WIDTH} y1={y(lat)} y2={y(lat)} className={lat === 0 ? 'map-equator' : 'map-grid'} />
          <text x={x(152)} y={y(lat) - 6} className="map-label">
            {lat === 0 ? 'Equator' : `${Math.abs(lat)}°${lat > 0 ? 'N' : 'S'}`}
          </text>
        </g>
      ))}
      {[140, 160, 180, 200, 220, 240, 260].map((lon) => (
        <g key={lon}>
          <line x1={x(lon)} x2={x(lon)} y1={0} y2={HEIGHT} className="map-grid" />
          <text x={x(lon) + 5} y={HEIGHT - 10} className="map-label">
            {lonLabel(lon)}
          </text>
        </g>
      ))}

      {/* Rough land shapes for orientation, not exact coastlines. */}
      <rect x={-30} y={y(-1.5)} width={x(150) + 30} height={HEIGHT} rx={28} className="map-land" />
      <text x={14} y={y(-1.5) + 22} className="map-land-label">
        New Guinea
      </text>
      <rect x={x(-96)} y={-30} width={WIDTH} height={y(7.5) + 30} rx={28} className="map-land" />

      {buoys.map((buoy) => {
        const selected = buoy.id === selectedId
        // A style (not the fill attribute) so theme variables like var(--map-dot) work.
        const fill = colorFor?.(buoy.id) ?? 'var(--map-dot)'
        return (
          <g
            key={buoy.id}
            className="map-buoy"
            role={onSelect ? 'button' : undefined}
            tabIndex={onSelect ? 0 : undefined}
            aria-label={buoy.label}
            aria-pressed={onSelect ? selected : undefined}
            onClick={() => onSelect?.(buoy.id)}
            onKeyDown={(event) => handleKey(event, buoy.id)}
          >
            <title>{buoy.label}</title>
            {selected && <circle cx={x(buoy.lon)} cy={y(buoy.lat)} r={17} className="map-selected-ring" />}
            <circle cx={x(buoy.lon)} cy={y(buoy.lat)} r={selected ? 10 : 8} style={{ fill }} className="map-dot" />
          </g>
        )
      })}
    </svg>
  )
}
