import { Link } from 'react-router-dom'

// Placeholder for pages that are designed in Figma but not built yet.
export default function ComingSoon({ title }) {
  return (
    <section className="section coming-soon">
      <p className="kicker">Coming soon</p>
      <h1>{title}</h1>
      <p className="lead">This page is designed and will be built next. In the meantime, see what the data showed us.</p>
      <Link className="button button-primary" to="/eda">
        Explore the EDA →
      </Link>
    </section>
  )
}
