import { useEffect } from 'react'
import { NavLink, Outlet, useLocation } from 'react-router-dom'

const REPO_URL = 'https://github.com/Break-Through-Tech/AWS-1A-climate-risk-modeling-for-supply-chain-resiliency'

const LINKS = [
  { to: '/', label: 'Home', end: true },
  { to: '/buoy-map', label: 'Buoy map' },
  { to: '/forecast', label: 'Forecast' },
  { to: '/results', label: 'Results' },
  { to: '/eda', label: 'EDA' },
]

export default function Layout() {
  const { pathname } = useLocation()

  // Start each page at the top, like a normal website.
  useEffect(() => {
    window.scrollTo(0, 0)
  }, [pathname])

  return (
    <>
      <header className="site-nav">
        <NavLink to="/" className="brand">
          <span className="brand-mark" aria-hidden="true" />
          ENSO Risk Explorer
        </NavLink>
        <nav aria-label="Main">
          <ul className="nav-links">
            {LINKS.map((link) => (
              <li key={link.to}>
                <NavLink to={link.to} end={link.end}>
                  {link.label}
                </NavLink>
              </li>
            ))}
            <li>
              <a className="nav-github" href={REPO_URL} target="_blank" rel="noreferrer">
                GitHub ↗
              </a>
            </li>
          </ul>
        </nav>
      </header>

      <main>
        <Outlet />
      </main>

      <footer className="site-footer">
        <div>
          <strong>ENSO Risk Explorer</strong>
          <p>Data: UCI Machine Learning Repository, El Niño dataset (ID 122)</p>
        </div>
        <div className="footer-right">
          <a href={REPO_URL} target="_blank" rel="noreferrer">
            View the code on GitHub
          </a>
          <p>Break Through Tech AI Studio · AWS challenge project</p>
        </div>
      </footer>
    </>
  )
}
