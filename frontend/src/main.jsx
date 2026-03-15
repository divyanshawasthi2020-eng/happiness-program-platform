import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { useAuthStore } from './store/authStore.js';

// Pages
import LoginPage                    from './pages/LoginPage.jsx';
import DashboardLayout              from './components/layout/DashboardLayout.jsx';
import OverviewPage                 from './pages/OverviewPage.jsx';
import LeadsPage                    from './pages/LeadsPage.jsx';
import CoursesPage, { RemindersPage, SettingsPage } from './pages/CoursesPage.jsx';
import CampaignsPage                from './pages/CampaignsPage.jsx';
import { TemplatesPage }            from './pages/TemplatesPage.jsx';
import PostersPage                  from './pages/PostersPage.jsx';
import AnalyticsPage                from './pages/AnalyticsPage.jsx';

import './styles/global.css';

// Rehydrate axios auth header from persisted token on app load
useAuthStore.getState().init();

function ProtectedRoute({ children }) {
  const token = useAuthStore(s => s.token);
  return token ? children : <Navigate to="/login" replace />;
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <Toaster position="bottom-right" toastOptions={{ duration: 3000 }} />
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/" element={
          <ProtectedRoute>
            <DashboardLayout />
          </ProtectedRoute>
        }>
          <Route index                element={<OverviewPage />} />
          <Route path="leads"         element={<LeadsPage />} />
          <Route path="courses"       element={<CoursesPage />} />
          <Route path="campaigns"     element={<CampaignsPage />} />
          <Route path="analytics"     element={<AnalyticsPage />} />
          <Route path="templates"     element={<TemplatesPage />} />
          <Route path="posters"       element={<PostersPage />} />
          <Route path="reminders"     element={<RemindersPage />} />
          <Route path="settings"      element={<SettingsPage />} />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  </React.StrictMode>
);
