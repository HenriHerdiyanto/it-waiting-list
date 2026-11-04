import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import './App.css';
import './dashboard.css';

import { AuthProvider } from './contexts/AuthContext';
import { ToastProvider } from './contexts/ToastContext';
import { DataProvider } from './contexts/DataContext';
import RequireAuth from './routes/RequireAuth';
import DashboardLayout from './layouts/DashboardLayout';
import PublicListPage from './pages/PublicListPage';
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';
import WaitingListPage from './pages/WaitingListPage';
import RequestFormPage from './pages/RequestFormPage';
import PicListPage from './pages/PicListPage';
import PicFormPage from './pages/PicFormPage';

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <ToastProvider>
          <DataProvider>
            <Routes>
              <Route path="/" element={<PublicListPage />} />
              <Route path="/login" element={<LoginPage />} />

              <Route element={<RequireAuth />}>
                <Route element={<DashboardLayout />}>
                  <Route path="/dashboard" element={<DashboardPage />} />
                  <Route path="/admin/waiting-list" element={<WaitingListPage />} />
                  <Route
                    path="/admin/waiting-list/new"
                    element={<RequestFormPage />}
                  />
                  <Route
                    path="/admin/waiting-list/:id/edit"
                    element={<RequestFormPage />}
                  />
                  <Route path="/admin/pic" element={<PicListPage />} />
                  <Route path="/admin/pic/new" element={<PicFormPage />} />
                  <Route path="/admin/pic/:id/edit" element={<PicFormPage />} />
                </Route>
              </Route>

              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </DataProvider>
        </ToastProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}
