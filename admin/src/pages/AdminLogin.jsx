import React, { useState } from 'react';
import { GoogleLogin } from '@react-oauth/google';
import AlertBar from '../components/AlertBar';
import Button from '../components/ui/Button';
import Card from '../components/ui/Card';
import PageHeader from '../components/ui/PageHeader';
import { apiFetchJson } from '../utils/api';

const AdminLogin = ({ onLoginSuccess, onTokenLogin, googleEnabled = true }) => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [tokenInput, setTokenInput] = useState(() => localStorage.getItem('admin_token') || '');

  return (
    <div
      className="admin-login min-h-dvh text-[var(--app-fg)] flex items-center justify-center px-8 sm:px-10 py-16 sm:py-20"
      style={{
        background:
          'radial-gradient(1200px 600px at 18% 8%, rgba(99,102,241,0.16), transparent 60%), radial-gradient(1000px 560px at 82% 18%, rgba(34,211,238,0.14), transparent 55%), radial-gradient(900px 600px at 45% 92%, rgba(168,85,247,0.12), transparent 60%), linear-gradient(to bottom, #f8fafc, #f1f5f9)',
      }}
    >
      <div className="admin-login__container w-full max-w-[1040px] grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-14 items-start">
        <div className="admin-login__intro lg:col-span-5 text-center lg:text-left">
          <div className="flex items-center justify-center lg:justify-start gap-3">
            <div className="h-11 w-11 rounded-[var(--app-radius-md)] bg-gradient-to-br from-indigo-500 to-cyan-400 flex items-center justify-center text-white font-black text-lg shadow-sm">
              M
            </div>
            <div className="min-w-0">
              <div className="text-sm font-black leading-tight truncate">漫剧订阅助手</div>
              <div className="text-[11px] text-slate-500 font-semibold truncate">Admin Console</div>
            </div>
          </div>

          <div className="mt-8 space-y-3">
            <div className="text-3xl sm:text-[34px] font-black tracking-tight text-slate-900 leading-tight">
              登录管理后台
            </div>
            <div className="text-sm text-slate-600 leading-relaxed font-medium max-w-[44ch] mx-auto lg:mx-0">
              仅允许授权的 Google 账号访问内部管理系统。
            </div>
          </div>

          <div className="mt-6 text-[11px] text-slate-500 font-semibold">Internal use only</div>
        </div>

        <div className="admin-login__panel lg:col-span-7 flex justify-center lg:justify-end">
          <Card className="admin-login__card w-full max-w-[460px] overflow-hidden bg-white/72 backdrop-blur border-white/60 shadow-[var(--app-shadow)]">
            <div className="p-7 sm:p-9">
              <PageHeader
                size="sm"
                title="继续登录"
                subtitle="推荐使用 Google 登录（后端验签 + JWT）"
              />

              <div className="mt-5 space-y-6">
                {error ? <AlertBar type="error" message={error} onClose={() => setError(null)} /> : null}

                {googleEnabled ? (
                  <div className={`${isLoading ? 'opacity-60 pointer-events-none' : ''} flex justify-center`}>
                    <GoogleLogin
                      onSuccess={async (resp) => {
                        const credential = String(resp?.credential || '').trim();
                        if (!credential) {
                          setError('缺少 credential');
                          return;
                        }
                        setIsLoading(true);
                        setError(null);
                        try {
                          const data = await apiFetchJson('/api/admin/auth/google', {
                            method: 'POST',
                            body: JSON.stringify({ credential }),
                          });
                          if (!data?.success || !data?.token) throw new Error(data?.message || '登录失败');
                          localStorage.setItem('admin_token', data.token);
                          onLoginSuccess?.(data.admin || null);
                        } catch (e) {
                          localStorage.removeItem('admin_token');
                          setError(e?.message || '登录失败');
                        } finally {
                          setIsLoading(false);
                        }
                      }}
                      onError={() => setError('Google 登录失败，请稍后重试')}
                      useOneTap={false}
                    />
                  </div>
                ) : (
                  <div className="rounded-[var(--app-radius-md)] bg-slate-50 border border-slate-200 px-4 py-3 text-sm text-slate-700 font-medium leading-relaxed">
                    <div className="font-black text-slate-900">后台登录未配置</div>
                    <div className="mt-1">
                      请在环境变量中配置 <span className="font-black">VITE_GOOGLE_CLIENT_ID</span>（Google OAuth Client ID）。
                    </div>
                  </div>
                )}

                <div className="rounded-[var(--app-radius-md)] bg-indigo-50/60 border border-indigo-100 px-4 py-3 text-xs text-slate-700 font-medium leading-relaxed">
                  登录权限由后端 ADMIN_EMAILS 白名单控制。如需开通，请联系系统所有者。
                </div>

                <div className="pt-6 border-t border-slate-200/70 space-y-3">
                  <div className="text-sm font-black text-slate-900">备用：管理员 Token 登录</div>
                  <input
                    value={tokenInput}
                    onChange={(e) => setTokenInput(e.target.value)}
                    placeholder="粘贴 ADMIN_TOKEN"
                    className="w-full h-11 bg-white/70 border border-slate-200 rounded-xl px-4 text-sm font-medium outline-none focus:ring-2 focus:ring-indigo-500/40 focus:border-indigo-200"
                  />
                  <Button
                    variant="secondary"
                    className="w-full"
                    size="lg"
                    onClick={() => {
                      const t = String(tokenInput || '').trim();
                      if (!t) {
                        setError('请输入 ADMIN_TOKEN');
                        return;
                      }
                      localStorage.setItem('admin_token', t);
                      onTokenLogin?.();
                    }}
                  >
                    使用 Token 进入
                  </Button>
                </div>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default AdminLogin;
