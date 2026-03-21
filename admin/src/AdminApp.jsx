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
import AdminAuditLog from './pages/AdminAuditLog';
import AlertBar from './components/AlertBar';
import Card from './components/ui/Card';
import { apiFetchJson } from './utils/api';
import './index.css';
import AdminLogin from './pages/AdminLogin';
import { GoogleOAuthProvider } from '@react-oauth/google';

const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID || '';

const AdminApp = () => {
  const [activeMenu, setActiveMenu] = useState('overview');
  const [appAlert, setAppAlert] = useState(null);
  const [adminToken, setAdminToken] = useState(() => localStorage.getItem('admin_token') || '');
  const [authBootError, setAuthBootError] = useState('');
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
    if (userData && typeof userData === 'object') {
      setUser({
        name: userData.name || userData.email || 'Admin',
        email: userData.email || 'admin',
        avatar: userData.picture || userData.avatar || 'https://ui-avatars.com/api/?name=Admin&background=random',
      });
    }
    const token = localStorage.getItem('admin_token') || '';
    setAdminToken(token);
  };

  const handleLogout = () => {
    localStorage.removeItem('admin_token');
    setAdminToken('');
    setActiveMenu('overview');
    setAppAlert({ type: 'success', message: '已退出后台' });
  };

  if (!adminToken) {
    if (!GOOGLE_CLIENT_ID) {
      return (
        <div className="min-h-screen bg-[var(--app-bg)] text-[var(--app-fg)] flex items-center justify-center p-8">
          <Card className="w-full max-w-xl p-8">
            <div className="text-xl font-black text-slate-900">后台登录未配置</div>
            <div className="mt-2 text-sm text-slate-600 font-medium leading-relaxed">
              请在环境变量中配置 <span className="font-black">VITE_GOOGLE_CLIENT_ID</span>（Google OAuth Client ID）。
            </div>
          </Card>
        </div>
      );
    }
    return (
      <GoogleOAuthProvider clientId={GOOGLE_CLIENT_ID}>
        <AdminLogin
          onLoginSuccess={handleLoginSuccess}
          onTokenLogin={async () => {
            try {
              setAuthBootError('');
              await apiFetchJson('/api/admin/auth/me');
              const token = localStorage.getItem('admin_token') || '';
              setAdminToken(token);
            } catch (e) {
              localStorage.removeItem('admin_token');
              setAuthBootError(e?.message || '鉴权失败');
            }
          }}
        />
        {authBootError ? (
          <div className="fixed left-5 right-5 bottom-5 max-w-2xl mx-auto">
            <AlertBar type="error" message={authBootError} onClose={() => setAuthBootError('')} />
          </div>
        ) : null}
      </GoogleOAuthProvider>
    );
  }

  React.useEffect(() => {
    let cancelled = false;
    const run = async () => {
      try {
        const data = await apiFetchJson('/api/admin/auth/me');
        if (cancelled) return;
        if (!data?.success) throw new Error(data?.message || '鉴权失败');
        const admin = data?.admin && typeof data.admin === 'object' ? data.admin : null;
        if (admin?.email) {
          setUser({
            name: admin.name || admin.email,
            email: admin.email,
            avatar: admin.picture || `https://ui-avatars.com/api/?name=${encodeURIComponent(admin.email)}&background=random`,
          });
        }
      } catch {
        if (cancelled) return;
        localStorage.removeItem('admin_token');
        setAdminToken('');
      }
    };
    if (adminToken) run();
    return () => {
      cancelled = true;
    };
  }, [adminToken]);

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
      case 'audit':
        return <AdminAuditLog />;
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
