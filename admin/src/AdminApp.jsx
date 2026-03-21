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
import Button from './components/ui/Button';
import Card from './components/ui/Card';
import PageHeader from './components/ui/PageHeader';
import { apiFetchJson } from './utils/api';
import './index.css';
// import AdminLogin from './pages/AdminLogin';
// import { GoogleOAuthProvider } from '@react-oauth/google';

// const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID || '';

const AdminApp = () => {
  const [activeMenu, setActiveMenu] = useState('overview');
  const [appAlert, setAppAlert] = useState(null);
  const [adminToken, setAdminToken] = useState(() => localStorage.getItem('admin_token') || '');
  const [adminTokenInput, setAdminTokenInput] = useState(() => localStorage.getItem('admin_token') || '');
  const [authError, setAuthError] = useState('');
  const [isAuthChecking, setIsAuthChecking] = useState(false);
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
    localStorage.removeItem('admin_token');
    setAdminToken('');
    setAdminTokenInput('');
    setActiveMenu('overview');
    setAppAlert({ type: 'success', message: '已退出后台' });
  };

  if (!adminToken) {
    return (
      <div className="min-h-screen bg-[var(--app-bg)] text-[var(--app-fg)] flex items-center justify-center p-8">
        <Card className="w-full max-w-xl p-8">
          <PageHeader title="后台鉴权" subtitle="请输入 ADMIN_TOKEN 后进入后台" />
          {authError ? (
            <div className="mt-5">
              <AlertBar type="error" message={authError} onClose={() => setAuthError('')} />
            </div>
          ) : null}
          <div className="mt-5 space-y-2">
            <label className="text-sm font-bold text-slate-700">ADMIN_TOKEN</label>
            <input
              value={adminTokenInput}
              onChange={(e) => setAdminTokenInput(e.target.value)}
              placeholder="粘贴你的 ADMIN_TOKEN"
              className="w-full h-11 bg-slate-100 border border-slate-200 rounded-xl px-4 text-sm font-medium outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            />
            <div className="text-xs text-slate-500 font-medium">部署端需要配置同名环境变量 ADMIN_TOKEN</div>
          </div>
          <div className="mt-6 flex gap-2">
            <Button
              className="flex-1"
              size="lg"
              disabled={isAuthChecking}
              onClick={async () => {
                const t = String(adminTokenInput || '').trim();
                if (!t) {
                  setAuthError('请输入 ADMIN_TOKEN');
                  return;
                }
                setAuthError('');
                setIsAuthChecking(true);
                localStorage.setItem('admin_token', t);
                try {
                  await apiFetchJson('/api/admin/settings');
                  setAdminToken(t);
                } catch (e) {
                  localStorage.removeItem('admin_token');
                  setAuthError(e?.message || '鉴权失败');
                } finally {
                  setIsAuthChecking(false);
                }
              }}
            >
              {isAuthChecking ? '验证中…' : '验证并进入'}
            </Button>
            <Button
              variant="secondary"
              size="lg"
              onClick={() => {
                localStorage.removeItem('admin_token');
                setAdminTokenInput('');
                setAuthError('');
              }}
            >
              清空
            </Button>
          </div>
        </Card>
      </div>
    );
  }

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
