import { useState } from 'react'

// Switches between the dark ("deep ocean") and light themes and remembers the choice.
// index.html sets the starting theme on <html data-theme="..."> before React loads.
export default function ThemeToggle() {
  const [theme, setTheme] = useState(() => document.documentElement.dataset.theme || 'dark')
  const next = theme === 'dark' ? 'light' : 'dark'

  const toggle = () => {
    document.documentElement.dataset.theme = next
    setTheme(next)
    try {
      localStorage.setItem('theme', next)
    } catch {
      // Storage can be blocked (private mode); the theme still switches for this visit.
    }
  }

  return (
    <button type="button" className="theme-toggle" onClick={toggle} aria-label={`Switch to ${next} mode`} title={`Switch to ${next} mode`}>
      {theme === 'dark' ? (
        // Sun: shown in dark mode, switches to light
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
          <circle cx="12" cy="12" r="4" />
          <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41" />
        </svg>
      ) : (
        // Moon: shown in light mode, switches to dark
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
        </svg>
      )}
    </button>
  )
}
