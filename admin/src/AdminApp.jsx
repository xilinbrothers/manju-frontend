import React, { useState } from 'react';
import AdminLayout from './components/AdminLayout';
import Dashboard from './pages/Dashboard';
import SeriesManagement from './pages/SeriesManagement';
import PlansPricing from './pages/PlansPricing';
import UserSubscription from './pages/UserSubscription';
import PaymentConfig from './pages/PaymentConfig';
import CopywritingConfig from './pages/CopywritingConfig';
import AdminManagement from './pages/AdminManagement';
import FinanceCenter from './pages/FinanceCenter';
import SystemSettings from './pages/SystemSettings';
import AlertBar from './components/AlertBar';
import './index.css';
// import AdminLogin from './pages/AdminLogin';
// import { GoogleOAuthProvider } from '@react-oauth/google';

// const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID || '';

const AdminApp = () => {
  const [activeMenu, setActiveMenu] = useState('overview');
  const [appAlert, setAppAlert] = useState(null);
  React.useEffect(() => {
    document.documentElement.dataset.app = 'admin';
  }, []);
  // 临时绕过登录，直接进入后台
  const [user, setUser] = useState({
    name: 'Admin',
    email: 'admin@local',
    avatar: 'https://ui-avatars.com/api/?name=Admin&background=random'
  }); 

  const handleLoginSuccess = (userData) => {
    setUser(userData);
  };

  const handleLogout = () => {
    // setUser(null);
    // setActiveMenu('overview');
    setAppAlert({ type: 'warning', message: '当前为开发模式，已禁用退出功能' });
  };

  /*
  if (!user) {
    if (!GOOGLE_CLIENT_ID) {
      return (
        <div className="min-h-screen bg-slate-100 flex items-center justify-center p-8">
          <div className="w-full max-w-xl bg-white border border-slate-200 rounded-3xl p-8 shadow-2xl shadow-slate-900/10">
            <div className="text-xl font-black text-slate-900">后台登录未配置</div>
            <div className="mt-2 text-sm text-slate-600 font-medium leading-relaxed">
              请在 Vercel 环境变量中配置 <span className="font-black">VITE_GOOGLE_CLIENT_ID</span>（Google OAuth Client ID），然后重新部署。
            </div>
          </div>
        </div>
      );
    }
    return (
      <GoogleOAuthProvider clientId={GOOGLE_CLIENT_ID}>
        <AdminLogin onLoginSuccess={handleLoginSuccess} />
      </GoogleOAuthProvider>
    );
  }
  */

  const renderContent = () => {
    switch (activeMenu) {
      case 'overview':
        return <Dashboard />;
      case 'series':
        return <SeriesManagement onAlert={(type, message) => setAppAlert({ type, message })} />;
      case 'plans':
        return <PlansPricing onAlert={(type, message) => setAppAlert({ type, message })} />;
      case 'users':
        return <UserSubscription />;
      case 'finance':
        return <FinanceCenter />;
      case 'payment':
        return <PaymentConfig onAlert={(type, message) => setAppAlert({ type, message })} />;
      case 'copywriting':
        return <CopywritingConfig />;
      case 'settings':
        return <SystemSettings onAlert={(type, message) => setAppAlert({ type, message })} />;
      case 'admins':
        return <AdminManagement />;
      default:
        return <Dashboard />;
    }
  };

  return (
    <AdminLayout activeMenu={activeMenu} onMenuChange={setActiveMenu} user={user} onLogout={handleLogout}>
      {appAlert?.message ? (
        <div className="mb-6">
          <AlertBar type={appAlert.type} message={appAlert.message} onClose={() => setAppAlert(null)} />
        </div>
      ) : null}
      {renderContent()}
    </AdminLayout>
  );
};

export default AdminApp;
