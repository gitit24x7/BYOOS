import { BrowserRouter, Routes, Route } from 'react-router-dom'
import LandingPage from './pages/LandingPage'
import ChapterPage from './pages/ChapterPage'
// Note: App.css removed — using index.css + Tailwind v4 only

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/chapter/:moduleId" element={<ChapterPage />} />
      </Routes>
    </BrowserRouter>
  )
}
