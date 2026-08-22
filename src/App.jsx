import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from './hooks/useAuth'
import Auth from './pages/Auth.jsx'
import Rooms from './pages/Rooms.jsx'
import Room from './pages/Room.jsx'
import JoinLink from './pages/JoinLink.jsx'
import { HoopoeMark } from './components/Icons.jsx'

export default function App() {
  const { session, profile, loading, setProfile } = useAuth()

  if (loading) {
    return (
      <div className="screen" style={{ alignItems: 'center', justifyContent: 'center' }}>
        <HoopoeMark size={54} />
      </div>
    )
  }

  const needsProfile = session && !profile

  return (
    <Routes>
      <Route
        path="/"
        element={
          !session || needsProfile
            ? <Auth needsProfile={needsProfile} onProfileSaved={setProfile} />
            : <Navigate to="/rooms" replace />
        }
      />
      <Route
        path="/rooms"
        element={session && profile ? <Rooms profile={profile} /> : <Navigate to="/" replace />}
      />
      <Route
        path="/room/:roomId"
        element={session && profile ? <Room profile={profile} /> : <Navigate to="/" replace />}
      />
      <Route
        path="/join/:code"
        element={session && profile ? <JoinLink profile={profile} /> : <Navigate to="/" replace />}
      />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
