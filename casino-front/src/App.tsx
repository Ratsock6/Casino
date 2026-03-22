import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useAuthStore } from './store/auth.store';
import { useEffect } from 'react';
import axiosInstance from './utils/axios.instance';

import Layout from './components/layout/Layout';
import LoginPage from './pages/LoginPage';
import HomePage from './pages/HomePage';
import SlotsPage from './pages/SlotsPage';
import RoulettePage from './pages/RoulettePage';
import BlackjackPage from './pages/BlackjackPage';
import AdminPage from './pages/AdminPage';
import RegisterPage from './pages/RegisterPage';
import ProfilePage from './pages/ProfilePage';
import ReglementPage from './pages/ReglementPage';
import VipPage from './pages/VipPage';
import LevelPage from './pages/LevelPage';


// Route protégée : redirige vers /login si non connecté
const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { isAuthenticated } = useAuthStore();
  return isAuthenticated ? <>{children}</> : <Navigate to="/login" replace />;
};

function App() {
  const { token, login, logout } = useAuthStore();

  useEffect(() => {
    const restoreUser = async () => {
      if (!token) return;
      try {
        const res = await axiosInstance.get('/users/me');
        const data = res.data;
        login({
          id: data.id,
          username: data.username,
          firstName: data.firstName,
          phoneNumber: data.phoneNumber,
          role: data.role,
        }, token);
      } catch {
        logout();
      }
    };
    restoreUser();
  }, []);

  return (
    <BrowserRouter>
      <Routes>

        {/* Route publique */}
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/reglement" element={<ReglementPage />} />

        {/* Routes protégées */}
        <Route path="/" element={
          <ProtectedRoute>
            <Layout />
          </ProtectedRoute>
        }>
          <Route index element={<HomePage />} />
          <Route path="slots" element={<SlotsPage />} />
          <Route path="roulette" element={<RoulettePage />} />
          <Route path="blackjack" element={<BlackjackPage />} />
          <Route path="admin" element={<AdminPage />} />
          <Route path="profile" element={<ProfilePage />} />
          <Route path="vip" element={<VipPage />} />
          <Route path="level" element={<LevelPage />} />
        </Route>

        {/* Fallback */}
        <Route path="*" element={<Navigate to="/" replace />} />

      </Routes>
    </BrowserRouter>
  );
}

export default App;