import { BrowserRouter, Route, Routes } from 'react-router-dom'
import ComparisonPage from './pages/ComparisonPage'
import HistoryComparePage from './pages/HistoryComparePage'
import HistoryDetailPage from './pages/HistoryDetailPage'
import HistoryPage from './pages/HistoryPage'
import HomePage from './pages/HomePage'
import ProgressPage from './pages/ProgressPage'
import ResultPage from './pages/ResultPage'
import SettingsPage from './pages/SettingsPage'
import TopicPage from './pages/TopicPage'
import TrainingPage from './pages/TrainingPage'

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/topics" element={<TopicPage />} />
        <Route path="/train" element={<TrainingPage />} />
        <Route path="/result" element={<ResultPage />} />
        <Route path="/compare" element={<ComparisonPage />} />
        <Route path="/settings" element={<SettingsPage />} />
        <Route path="/history" element={<HistoryPage />} />
        <Route path="/history/compare/:sessionId" element={<HistoryComparePage />} />
        <Route path="/history/:attemptId" element={<HistoryDetailPage />} />
        <Route path="/progress" element={<ProgressPage />} />
        <Route path="*" element={<HomePage />} />
      </Routes>
    </BrowserRouter>
  )
}
