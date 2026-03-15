import React, { useState } from 'react';
import AdminLayout from './components/AdminLayout';
import Dashboard from './pages/Dashboard';
import SeriesManagement from './pages/SeriesManagement';
import PlansPricing from './pages/PlansPricing';
import UserSubscription from './pages/UserSubscription';
import PaymentConfig from './pages/PaymentConfig';
import CopywritingConfig from './pages/CopywritingConfig';
import AdminManagement from './pages/AdminManagement';
import AdminLogin from './pages/AdminLogin';
import { GoogleOAuthProvider } from '@react-oauth/google';

// TODO: 将此处替换为你从 Google Cloud Console 获取的真实 Client ID
const GOOGLE_CLIENT_ID = "YOUR_GOOGLE_CLIENT_ID.apps.googleusercontent.com";

const AdminApp = () => {
  const [activeMenu, setActiveMenu] = useState('overview');
  const [user, setUser] = useState(null); // 管理员登录状态

  const handleLoginSuccess = (userData) => {
    setUser(userData);
  };

  const handleLogout = () => {
    setUser(null);
    setActiveMenu('overview');
  };

  if (!user) {
    return (
      <GoogleOAuthProvider clientId={GOOGLE_CLIENT_ID}>
        <AdminLogin onLoginSuccess={handleLoginSuccess} />
      </GoogleOAuthProvider>
    );
  }

  const renderContent = () => {
    switch (activeMenu) {
      case 'overview':
        return <Dashboard />;
      case 'series':
        return <SeriesManagement />;
      case 'plans':
        return <PlansPricing />;
      case 'users':
        return <UserSubscription />;
      case 'payment':
        return <PaymentConfig />;
      case 'copywriting':
        return <CopywritingConfig />;
      case 'admins':
        return <AdminManagement />;
      default:
        return <Dashboard />;
    }
  };

  return (
    <AdminLayout activeMenu={activeMenu} onMenuChange={setActiveMenu} user={user} onLogout={handleLogout}>
      {renderContent()}
    </AdminLayout>
  );
};

export default AdminApp;
