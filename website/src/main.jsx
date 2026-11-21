import React from 'react'
import ReactDOM from 'react-dom/client'
import { HashRouter, Route, Routes } from 'react-router-dom'
import Layout from './components/Layout.jsx'
import ComingSoon from './pages/ComingSoon.jsx'
import Eda from './pages/Eda.jsx'
import './styles.css'

// HashRouter keeps every page working on a static host (GitHub Pages, S3)
// without server-side rewrite rules.
ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <HashRouter>
      <Routes>
        <Route element={<Layout />}>
          <Route index element={<ComingSoon title="See El Niño coming, three months early" />} />
          <Route path="buoy-map" element={<ComingSoon title="Buoy map" />} />
          <Route path="forecast" element={<ComingSoon title="Try the forecast" />} />
          <Route path="results" element={<ComingSoon title="Results" />} />
          <Route path="eda" element={<Eda />} />
          <Route path="*" element={<ComingSoon title="Page not found" />} />
        </Route>
      </Routes>
    </HashRouter>
  </React.StrictMode>,
)
