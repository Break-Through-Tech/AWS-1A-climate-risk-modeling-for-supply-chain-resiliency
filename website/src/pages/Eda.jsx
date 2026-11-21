import { moreCharts, storyCharts } from '../content/eda.js'

const imageUrl = (file) => `${import.meta.env.BASE_URL}eda/${file}`

function ChartImage({ chart }) {
  return (
    <figure className="chart-card">
      <a href={imageUrl(chart.image)} target="_blank" rel="noreferrer" title="Open the full-size chart">
        <img src={imageUrl(chart.image)} alt={chart.alt ?? chart.title} loading="lazy" />
      </a>
    </figure>
  )
}

function Credit({ author }) {
  return (
    <p className="credit">
      Chart: {author.name} · <code>{author.notebook}</code>
    </p>
  )
}

function StoryText({ chart, number }) {
  return (
    <div className="story-text">
      <span className="step-number">{number}</span>
      {chart.featured && <span className="tag-featured">Featured</span>}
      <h2>{chart.title}</h2>
      <p>{chart.body}</p>
      <div className="decision">
        <span>What it changed</span>
        <p>{chart.decision}</p>
      </div>
      <Credit author={chart.author} />
    </div>
  )
}

export default function Eda() {
  return (
    <>
      <section className="section page-heading">
        <p className="kicker">Exploratory data analysis</p>
        <h1>What the data showed us</h1>
        <p className="lead">
          Before training anything, we explored 18 years of Pacific buoy data, and five charts shaped how we built the
          model.
        </p>
      </section>

      {storyCharts.map((chart, i) => {
        const number = i + 1
        const banded = i % 2 === 1

        if (chart.featured) {
          return (
            <section key={chart.image} className={`section story story-featured${banded ? ' band' : ''}`}>
              <StoryText chart={chart} number={number} />
              <ChartImage chart={chart} />
            </section>
          )
        }

        // Charts 3 and 5 sit on the left, so the page zigzags like a story.
        const chartFirst = number > 1 && number % 2 === 1
        return (
          <section key={chart.image} className={`section story${banded ? ' band' : ''}${chartFirst ? ' chart-first' : ''}`}>
            <StoryText chart={chart} number={number} />
            <ChartImage chart={chart} />
          </section>
        )
      })}

      <section className="section band">
        <details className="more-charts">
          <summary>
            <span className="summary-title">More charts for technical readers</span>
            <span className="summary-count">{moreCharts.length} charts</span>
          </summary>
          <div className="more-grid">
            {moreCharts.map((chart) => (
              <article key={chart.image} className="more-item">
                <ChartImage chart={chart} />
                <h3>{chart.title}</h3>
                <p>{chart.caption}</p>
                <Credit author={chart.author} />
              </article>
            ))}
          </div>
        </details>
        <p className="note">Jennifer’s buoy-location chart will power the Buoy map page instead of appearing here.</p>
      </section>
    </>
  )
}
