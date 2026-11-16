import { Navigate, Route, Routes, useLocation } from 'react-router-dom'
import { UserProvider } from './context/UserContext.jsx'
import Layout from './components/Layout.jsx'
import Dashboard from './pages/Dashboard.jsx'
import ReportForm from './pages/ReportForm.jsx'
import Feed from './pages/Feed.jsx'
import Alerts from './pages/Alerts.jsx'
import Insights from './pages/Insights.jsx'
import About from './pages/About.jsx'
import NotFound from './pages/NotFound.jsx'
import Login from './pages/Login.jsx'
import { useUser } from './context/UserContext.jsx'

function Protected({ children }) {
  const { current, loading } = useUser()
  const location = useLocation()
  if (loading) return <p>Checking your session…</p>
  return current ? children : <Navigate to="/login" state={{ from: location.pathname }} replace />
}

export default function App() {
  return (
    <UserProvider>
      <Routes>
        <Route element={<Layout />}>
          <Route index element={<Dashboard />} />
          <Route path="login" element={<Login />} />
          <Route path="report" element={<Protected><ReportForm /></Protected>} />
          <Route path="feed" element={<Protected><Feed /></Protected>} />
          <Route path="alerts" element={<Alerts />} />
          <Route path="insights" element={<Insights />} />
          <Route path="about" element={<About />} />
          <Route path="*" element={<NotFound />} />
        </Route>
      </Routes>
    </UserProvider>
  )
}
