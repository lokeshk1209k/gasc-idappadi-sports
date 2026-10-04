import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import MainLayout from './layouts/MainLayout';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import DashboardPage from './pages/DashboardPage';
import SportsPage from './pages/SportsPage';
import CompetitionsPage from './pages/CompetitionsPage';
import GalleryPage from './pages/GalleryPage';
import ProfilePage from './pages/ProfilePage';
import NotificationsPage from './pages/NotificationsPage';
import SettingsPage from './pages/SettingsPage';
import EquipmentPage from './pages/EquipmentPage';

// GASC Student Portal v2026.10.4
function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<MainLayout />}>
          {/* Default: redirect to dashboard */}
          <Route index element={<Navigate to="/student/dashboard" replace />} />

          {/* Auth */}
          <Route path="student/login" element={<LoginPage />} />
          <Route path="student/register" element={<RegisterPage />} />

          {/* Portal Routes */}
          <Route path="student/dashboard" element={<DashboardPage />} />
          <Route path="student/profile" element={<ProfilePage />} />
          <Route path="student/sports" element={<SportsPage />} />
          <Route path="student/equipment" element={<EquipmentPage />} />
          <Route path="student/my-equipment" element={<EquipmentPage />} />
          <Route path="student/tournaments" element={<CompetitionsPage />} />
          <Route path="student/competitions" element={<CompetitionsPage />} />
          <Route path="student/journey" element={<Navigate to="/student/dashboard" replace />} />
          <Route path="student/achievements" element={<Navigate to="/student/dashboard" replace />} />
          <Route path="student/certificates" element={<Navigate to="/student/dashboard" replace />} />
          <Route path="student/gallery" element={<GalleryPage />} />
          <Route path="student/news" element={<Navigate to="/student/gallery" replace />} />
          <Route path="student/notifications" element={<NotificationsPage />} />
          <Route path="student/settings" element={<SettingsPage />} />
          <Route path="student/my-registrations" element={<CompetitionsPage />} />

          {/* Fallback */}
          <Route path="*" element={<Navigate to="/student/dashboard" replace />} />
        </Route>
      </Routes>
    </Router>
  );
}

export default App;
