import { useState } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import AppLayout from './layouts/AppLayout';
import AuthPage from './pages/auth/AuthPage';
import DashboardPage from './pages/dashboard/DashboardPage';
import VehiclesPage from './pages/customer/VehiclesPage';
import BookServicePage from './pages/customer/BookServicePage';
import MyBookingsPage from './pages/customer/MyBookingsPage';
import RecordsPage from './pages/records/RecordsPage';
import InvoicesPage from './pages/invoices/InvoicesPage';
import NotificationsPage from './pages/notifications/NotificationsPage';
import OperationsPage from './pages/operations/OperationsPage';
import ServiceJobPage from './pages/jobs/ServiceJobPage';

export default function App() {
  const [user, setUser] = useState(() => {
    const saved = localStorage.getItem('vsms_user');
    return saved ? JSON.parse(saved) : null;
  });
  function handleAuth(nextUser) {
    localStorage.setItem('vsms_user', JSON.stringify(nextUser));
    setUser(nextUser);
  }
  function logout() {
    localStorage.removeItem('vsms_token');
    localStorage.removeItem('vsms_user');
    setUser(null);
  }
  if (!user) return <AuthPage onAuth={handleAuth} />;
  return <AppLayout user={user} onLogout={logout}><Routes>
    <Route path="/" element={<DashboardPage user={user} />} />
    <Route path="/vehicles" element={<VehiclesPage />} />
    <Route path="/book" element={<BookServicePage />} />
    <Route path="/bookings" element={<MyBookingsPage user={user} />} />
    <Route path="/history" element={<RecordsPage type="history" />} />
    <Route path="/invoices" element={<InvoicesPage user={user} />} />
    <Route path="/jobs" element={<ServiceJobPage user={user} />} />
    <Route path="/team" element={<OperationsPage type="team" />} />
    <Route path="/parts" element={<OperationsPage type="parts" />} />
    <Route path="/services" element={<OperationsPage type="services" />} />
    <Route path="/notifications" element={<NotificationsPage />} />
    <Route path="/customer/dashboard" element={<DashboardPage user={user} />} />
    <Route path="/customer/vehicles" element={<VehiclesPage />} />
    <Route path="/customer/book-service" element={<BookServicePage />} />
    <Route path="/customer/bookings" element={<MyBookingsPage user={user} />} />
    <Route path="/customer/service-history" element={<RecordsPage type="history" />} />
    <Route path="/customer/invoices" element={<InvoicesPage user={user} />} />
    <Route path="/admin/dashboard" element={<DashboardPage user={user} />} />
    <Route path="/admin/services" element={<OperationsPage type="services" />} />
    <Route path="/admin/parts" element={<OperationsPage type="parts" />} />
    <Route path="/admin/staff" element={<OperationsPage type="team" />} />
    <Route path="/staff/dashboard" element={<DashboardPage user={user} />} />
    <Route path="/staff/bookings" element={<RecordsPage type="bookings" />} />
    <Route path="/mechanic/dashboard" element={<DashboardPage user={user} />} />
    <Route path="/mechanic/jobs" element={<ServiceJobPage user={user} />} />
    <Route path="*" element={<Navigate to="/" replace />} />
  </Routes></AppLayout>;
}
