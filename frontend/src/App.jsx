import { Route, Routes } from 'react-router-dom'
import { UserProvider } from './context/UserContext.jsx'
import Layout from './components/Layout.jsx'
import Dashboard from './pages/Dashboard.jsx'
import ReportForm from './pages/ReportForm.jsx'
import Feed from './pages/Feed.jsx'
import Alerts from './pages/Alerts.jsx'
import Insights from './pages/Insights.jsx'
import About from './pages/About.jsx'
import NotFound from './pages/NotFound.jsx'

export default function App() {
  return (
    <UserProvider>
      <Routes>
        <Route element={<Layout />}>
          <Route index element={<Dashboard />} />
          <Route path="report" element={<ReportForm />} />
          <Route path="feed" element={<Feed />} />
          <Route path="alerts" element={<Alerts />} />
          <Route path="insights" element={<Insights />} />
          <Route path="about" element={<About />} />
          <Route path="*" element={<NotFound />} />
        </Route>
      </Routes>
    </UserProvider>
  )
}
