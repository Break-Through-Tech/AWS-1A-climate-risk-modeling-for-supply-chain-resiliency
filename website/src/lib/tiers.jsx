// The five risk tiers, in order from coolest to warmest, with their colors.
export const TIERS = ['Extreme Cool', 'Moderate Cool', 'Neutral', 'Moderate Warm', 'Extreme Warm']

export const TIER_STYLE = {
  'Extreme Cool': { bg: '#2b5ba8', fg: '#ffffff' },
  'Moderate Cool': { bg: '#8fb4e3', fg: '#0b1b2b' },
  Neutral: { bg: '#6e8297', fg: '#0b1b2b' },
  'Moderate Warm': { bg: '#f2a27a', fg: '#2a1208' },
  'Extreme Warm': { bg: '#c8432b', fg: '#ffffff' },
}

export function TierPill({ tier, large = false }) {
  const style = TIER_STYLE[tier] ?? TIER_STYLE.Neutral
  return (
    <span className={`tier-pill${large ? ' tier-pill-large' : ''}`} style={{ background: style.bg, color: style.fg }}>
      {tier}
    </span>
  )
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

/** '1995-11' -> 'Nov 1995' */
export function formatMonth(ym) {
  const [year, month] = ym.split('-').map(Number)
  return `${MONTHS[month - 1]} ${year}`
}

/** -1.07 -> '−1.07' (a real minus sign, which reads better than a hyphen) */
export function formatNumber(value) {
  if (value === null || value === undefined) return 'n/a'
  return `${value < 0 ? '−' : ''}${Math.abs(value).toFixed(2)}`
}

/** 1.8 -> '+1.80 °C', -1.8 -> '−1.80 °C' (with a real minus sign) */
export function formatTemp(value) {
  const sign = value > 0 ? '+' : value < 0 ? '−' : ''
  return `${sign}${Math.abs(value).toFixed(2)} °C`
}
