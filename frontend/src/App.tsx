import { BrowserRouter, Routes, Route, Navigate, Outlet } from "react-router-dom"
import { AuthProvider, useAuth } from "./context/AuthContext"
import PublicLayout from "./layouts/PublicLayout"
import AuthorityLayout from "./layouts/AuthorityLayout"
import Home from "./pages/public/Home"
import About from "./pages/public/About"
import HowItWorks from "./pages/public/HowItWorks"
import Safety from "./pages/public/Safety"
import Contact from "./pages/public/Contact"
import Login from "./pages/authority/Login"
import Dashboard from "./pages/authority/Dashboard"
import LiveDetection from "./pages/authority/LiveDetection"
import PhotoDetection from "./pages/authority/PhotoDetection"
import VideoDetection from "./pages/authority/VideoDetection"
import Violations from "./pages/authority/Violations"
import MapView from "./pages/authority/MapView"
import Analytics from "./pages/authority/Analytics"
import Navigation from "./pages/authority/Navigation"
import Cameras from "./pages/authority/Cameras"
import CameraFeed from "./pages/authority/CameraFeed"
import Settings from "./pages/authority/Settings"
import TrafficRules from "./pages/authority/TrafficRules"
import InterStationHub from "./pages/authority/InterStationHub"

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route element={<PublicLayout />}>
            <Route path="/" element={<Home />} />
            <Route path="/about" element={<About />} />
            <Route path="/how-it-works" element={<HowItWorks />} />
            <Route path="/safety" element={<Safety />} />
            <Route path="/contact" element={<Contact />} />
            <Route path="/login" element={<Login />} />
          </Route>

          <Route element={<ProtectedRoute />}>
            <Route element={<AuthorityLayout />}>
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/detect/live" element={<LiveDetection />} />
            <Route path="/detect/photo" element={<PhotoDetection />} />
            <Route path="/detect/video" element={<VideoDetection />} />
            <Route path="/violations" element={<Violations />} />
            <Route path="/map" element={<MapView />} />
            <Route path="/navigation" element={<Navigation />} />
            <Route path="/cameras" element={<Cameras />} />
            <Route path="/cameras/:id" element={<CameraFeed />} />
            <Route path="/analytics" element={<Analytics />} />
            <Route path="/settings" element={<Settings />} />
            <Route path="/traffic-rules" element={<TrafficRules />} />
            <Route path="/stations" element={<InterStationHub />} />
            <Route path="*" element={<Navigate to="/dashboard" replace />} />
            </Route>
          </Route>
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  )
}

function ProtectedRoute() {
  const { isAuthenticated, isLoading } = useAuth();
  if (isLoading) return <div className="min-h-screen bg-background" />;
  return isAuthenticated ? <Outlet /> : <Navigate to="/login" replace />;
}
