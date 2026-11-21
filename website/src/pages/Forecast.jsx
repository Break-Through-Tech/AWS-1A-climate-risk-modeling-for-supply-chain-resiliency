import { useEffect, useMemo, useState } from 'react'
import BuoyMap from '../components/BuoyMap.jsx'
import { TIER_STYLE, TierPill, formatMonth, formatNumber, formatTemp } from '../lib/tiers.jsx'

// A verified example from model_explainability.ipynb, so the page opens on a real, interesting forecast.
const DEFAULT_BUOY = '-2_-125'
const DEFAULT_MONTH = '1995-11'

const TIER_MEANING = {
  'Extreme Cool': 'at least 1.1 °C colder than normal',
  'Moderate Cool': 'between 0.4 and 1.1 °C colder than normal',
  Neutral: 'close to normal (within about 0.4 °C)',
  'Moderate Warm': 'between 0.35 and 1.0 °C warmer than normal',
  'Extreme Warm': 'at least 1.0 °C warmer than normal',
}

function useForecastData() {
  const [state, setState] = useState({ data: null, error: null })
  useEffect(() => {
    let cancelled = false
    fetch(`${import.meta.env.BASE_URL}forecasts/forecasts.json`)
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`)
        return res.json()
      })
      .then((data) => !cancelled && setState({ data, error: null }))
      .catch((error) => !cancelled && setState({ data: null, error }))
    return () => {
      cancelled = true
    }
  }, [])
  return state
}

function TierScale({ today, forecast, thresholds }) {
  const min = -2.5
  const max = 2.0
  const pos = (v) => `${((Math.min(max, Math.max(min, v)) - min) / (max - min)) * 100}%`
  const bands = [
    [min, thresholds.extreme_cool, 'Extreme Cool'],
    [thresholds.extreme_cool, thresholds.moderate_cool, 'Moderate Cool'],
    [thresholds.moderate_cool, thresholds.moderate_warm, 'Neutral'],
    [thresholds.moderate_warm, thresholds.extreme_warm, 'Moderate Warm'],
    [thresholds.extreme_warm, max, 'Extreme Warm'],
  ]
  return (
    <div className="tier-scale" aria-hidden="true">
      <div className="tier-scale-markers">
        <span className="marker marker-today" style={{ left: pos(today) }} title="Today" />
        <span className="marker marker-forecast" style={{ left: pos(forecast) }} title="Forecast" />
      </div>
      <div className="tier-scale-bands">
        {bands.map(([from, to, tier]) => (
          <span key={tier} style={{ width: `${((to - from) / (max - min)) * 100}%`, background: TIER_STYLE[tier].bg }} />
        ))}
      </div>
      <div className="tier-scale-ticks">
        {[thresholds.extreme_cool, thresholds.moderate_cool, thresholds.moderate_warm, thresholds.extreme_warm].map((t) => (
          <span key={t} style={{ left: pos(t) }}>
            {t > 0 ? '+' : '−'}
            {Math.abs(t)}
          </span>
        ))}
      </div>
      <div className="tier-scale-legend">
        <span>
          <i className="legend-today" /> Today
        </span>
        <span>
          <i className="legend-forecast" /> Forecast
        </span>
      </div>
    </div>
  )
}

function Verdict({ correct }) {
  return <span className={`verdict ${correct ? 'verdict-correct' : 'verdict-missed'}`}>{correct ? 'Correct' : 'Missed'}</span>
}

export default function Forecast() {
  const { data, error } = useForecastData()
  const [draft, setDraft] = useState({ buoy: DEFAULT_BUOY, month: DEFAULT_MONTH })
  const [query, setQuery] = useState({ buoy: DEFAULT_BUOY, month: DEFAULT_MONTH })

  const buoyById = useMemo(() => Object.fromEntries((data?.buoys ?? []).map((b) => [b.id, b])), [data])
  const monthsForDraft = data?.forecasts[draft.buoy]?.map((f) => f.month) ?? []
  const result = data?.forecasts[query.buoy]?.find((f) => f.month === query.month)
  const buoy = buoyById[query.buoy]
  const outOfDate = draft.buoy !== query.buoy || draft.month !== query.month

  // Color every buoy by its forecast tier for the month being shown.
  const tierAt = useMemo(() => {
    const map = {}
    for (const [id, rows] of Object.entries(data?.forecasts ?? {})) {
      const row = rows.find((f) => f.month === query.month)
      if (row) map[id] = row.tier
    }
    return map
  }, [data, query.month])

  const chooseBuoy = (id) => {
    const months = data.forecasts[id].map((f) => f.month)
    // Keep the chosen month if this buoy has it; otherwise use the closest month it does have.
    const target = Date.parse(draft.month)
    const distance = (m) => Math.abs(Date.parse(m) - target)
    const month = months.includes(draft.month)
      ? draft.month
      : months.reduce((best, m) => (distance(m) < distance(best) ? m : best))
    setDraft({ buoy: id, month })
  }

  if (error) {
    return (
      <section className="section">
        <h1>Try the forecast</h1>
        <p className="lead">The forecast data could not be loaded ({error.message}). Run scripts/export_forecasts.py and reload.</p>
      </section>
    )
  }

  if (!data || !result) {
    return (
      <section className="section">
        <h1>Try the forecast</h1>
        <p className="lead">{data ? 'No forecast for that buoy and month.' : 'Loading forecasts…'}</p>
      </section>
    )
  }

  const maxShap = Math.max(...(result?.reasons ?? []).map((r) => Math.abs(r.shap)), 0.01)

  return (
    <section className="section forecast-page">
      <form
        className="panel forecast-inputs"
        onSubmit={(event) => {
          event.preventDefault()
          setQuery(draft)
        }}
      >
        <h1>Try the forecast</h1>
        <p className="muted">
          Pick a buoy and a starting month from the validation years (1994–96). These months already happened, so you can
          check the model’s answer.
        </p>

        <fieldset className="field">
          <legend>Data source</legend>
          <div className="source-options">
            <label className="source-option source-active">
              <input type="radio" name="source" value="validation" defaultChecked /> Validation 1994–96
            </label>
            <label className="source-option source-disabled">
              <input type="radio" name="source" value="live" disabled /> Live NOAA data
              <span className="soon">Coming soon</span>
            </label>
          </div>
          <p className="hint">Live forecasts from the latest TAO/TRITON buoy readings are on the roadmap.</p>
        </fieldset>

        <label className="field">
          <span>1 · Buoy</span>
          <select value={draft.buoy} onChange={(e) => chooseBuoy(e.target.value)}>
            {data.buoys.map((b) => (
              <option key={b.id} value={b.id}>
                {b.label}
              </option>
            ))}
          </select>
          <span className="hint">or click a buoy on the map</span>
        </label>

        <label className="field">
          <span>2 · Starting month</span>
          <select value={draft.month} onChange={(e) => setDraft({ ...draft, month: e.target.value })}>
            {monthsForDraft.map((m) => (
              <option key={m} value={m}>
                {formatMonth(m)}
              </option>
            ))}
          </select>
          <span className="hint">{monthsForDraft.length} months with data at this buoy</span>
        </label>

        <div className="field">
          <span>3 · Forecast horizon</span>
          <div className="fixed-value">
            3 months ahead <em>fixed</em>
          </div>
        </div>

        <label className="field">
          <span>Model</span>
          <select defaultValue="xgboost">
            <option value="xgboost">XGBoost (current best)</option>
            <option value="lightgbm" disabled>
              LightGBM (coming soon)
            </option>
          </select>
        </label>

        <button type="submit" className="button button-primary button-block">
          Run forecast
        </button>
        {outOfDate && <p className="hint">Press Run forecast to see the result for your new choice.</p>}
        <p className="hint fine-print">Test years (1997–98) stay hidden until the final model is chosen.</p>
      </form>

      <div className="forecast-middle">
        <div className="panel map-panel">
          <BuoyMap
            buoys={data.buoys}
            selectedId={draft.buoy}
            onSelect={chooseBuoy}
            colorFor={(id) => (tierAt[id] ? TIER_STYLE[tierAt[id]].bg : 'var(--map-nodata)')}
            title="Buoys colored by forecast risk tier"
          />
          <p className="map-caption">
            Forecast tier for {formatMonth(result.targetMonth)} at every buoy · dark dots have no data that month
          </p>
        </div>

        <h2 className="subhead">How this forecast was made</h2>
        <ol className="steps">
          <li>
            <span>Today ({formatMonth(result.month)})</span>
            <strong>{formatTemp(result.today)}</strong>
            <small>{result.todayTier}</small>
          </li>
          <li>
            <span>Predicted change</span>
            <strong>{formatTemp(result.delta)}</strong>
            <small>XGBoost residual model</small>
          </li>
          <li>
            <span>Forecast ({formatMonth(result.targetMonth)})</span>
            <strong>{formatTemp(result.forecast)}</strong>
            <small>today + change</small>
          </li>
          <li>
            <span>Risk tier</span>
            <TierPill tier={result.tier} />
            <small>calibrated thresholds</small>
          </li>
        </ol>

        <div className="panel why-panel">
          <h2 className="subhead">Why the model said this</h2>
          {result.reasons.map((reason) => {
            const width = (Math.abs(reason.shap) / maxShap) * 50
            return (
              <div key={reason.feature} className="why-row">
                <span className="why-label">
                  {data.featureLabels[reason.feature]} <em>({formatNumber(reason.value)})</em>
                </span>
                <span className="why-bar" aria-hidden="true">
                  <span
                    className={reason.shap > 0 ? 'push-warm' : 'push-cool'}
                    style={reason.shap > 0 ? { left: '50%', width: `${width}%` } : { right: '50%', width: `${width}%` }}
                  />
                </span>
                <strong>{formatTemp(reason.shap)}</strong>
              </div>
            )
          })}
          <p className="hint">Red pushes the forecast warmer, blue cooler. Values are SHAP contributions to the predicted change.</p>
        </div>
      </div>

      <aside className="panel forecast-result" aria-live="polite">
        <p className="kicker">Forecast for {formatMonth(result.targetMonth)}</p>
        <TierPill tier={result.tier} large />
        <p className="result-sentence">
          The sea surface at {buoy.label} is expected to be {TIER_MEANING[result.tier]} (forecast:{' '}
          {formatTemp(result.forecast)}).
        </p>

        <TierScale today={result.today} forecast={result.forecast} thresholds={data.thresholds} />

        <dl className="result-rows">
          <div>
            <dt>Today</dt>
            <dd>
              {formatTemp(result.today)} <TierPill tier={result.todayTier} />
            </dd>
          </div>
          <div>
            <dt>Forecast</dt>
            <dd>
              {formatTemp(result.forecast)} <TierPill tier={result.tier} />
            </dd>
          </div>
        </dl>

        <div className="actual-box">
          <div className="actual-head">
            <span>What actually happened</span>
            <Verdict correct={result.tier === result.actualTier} />
          </div>
          <dl className="result-rows">
            <div>
              <dt>{formatMonth(result.targetMonth)}</dt>
              <dd>
                {formatTemp(result.actual)} <TierPill tier={result.actualTier} />
              </dd>
            </div>
          </dl>
        </div>

        <dl className="result-rows">
          <div>
            <dt>Persistence guess (“no change”)</dt>
            <dd>
              <TierPill tier={result.persistenceTier} /> <Verdict correct={result.persistenceTier === result.actualTier} />
            </dd>
          </div>
        </dl>
        <p className="hint">
          Across all {data.metrics.rows.toLocaleString()} validation forecasts, the model scores {data.metrics.macroF1} macro F1
          vs {data.metrics.persistenceMacroF1} for persistence: a small edge.
        </p>
      </aside>
    </section>
  )
}
