import React from 'react';
import { Routes, Route } from 'react-router-dom';
import { PublicLayout } from '../layouts/PublicLayout';
import { DashboardLayout } from '../layouts/DashboardLayout';
import { LandingPage } from '../pages/LandingPage';
import { DashboardPage } from '../pages/DashboardPage';
import { NotFoundPage } from '../pages/NotFoundPage';

export const AppRoutes: React.FC = () => {
  return (
    <Routes>
      {/* Public Landing Routes */}
      <Route element={<PublicLayout />}>
        <Route path="/" element={<LandingPage />} />
      </Route>

      {/* Dashboard App Routes */}
      <Route path="/dashboard" element={<DashboardLayout />}>
        <Route index element={<DashboardPage />} />
        <Route path="ai" element={<DashboardPage />} />
        <Route path="tasks" element={<DashboardPage />} />
        <Route path="projects" element={<DashboardPage />} />
        <Route path="goals" element={<DashboardPage />} />
        <Route path="calendar" element={<DashboardPage />} />
        <Route path="settings" element={<DashboardPage />} />
      </Route>

      {/* Fallback 404 */}
      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  );
};
