import React, { useState } from 'react';
import { GoogleLogin } from '@react-oauth/google';
import AlertBar from '../components/AlertBar';
import Button from '../components/ui/Button';
import Card from '../components/ui/Card';
import PageHeader from '../components/ui/PageHeader';
import { apiFetchJson } from '../utils/api';

const AdminLogin = ({ onLoginSuccess, onTokenLogin }) => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [tokenInput, setTokenInput] = useState(() => localStorage.getItem('admin_token') || '');

  return (
    <div className="min-h-screen bg-[var(--app-bg)] text-[var(--app-fg)] flex items-center justify-center p-8">
      <Card className="w-full max-w-5xl overflow-hidden">
        <div className="grid grid-cols-1 lg:grid-cols-2">
          <div className="p-10 bg-slate-950 text-white flex flex-col justify-between">
            <div className="space-y-8">
              <div className="flex items-center gap-3">
                <div className="h-12 w-12 rounded-2xl bg-gradient-to-br from-indigo-500 to-cyan-400 flex items-center justify-center text-slate-950 font-black text-xl">
                  M
                </div>
                <div className="min-w-0">
                  <div className="text-lg font-black leading-tight">漫剧订阅助手</div>
                  <div className="text-xs text-slate-300 font-semibold">Admin Console</div>
                </div>
              </div>

              <div className="space-y-3">
                <div className="text-3xl font-black tracking-tight">登录管理后台</div>
                <div className="text-sm text-slate-300 leading-relaxed">
                  仅允许授权的 Google 账号访问内部管理系统。
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="rounded-2xl bg-white/5 border border-white/10 p-5">
                  <div className="text-xs text-slate-400 font-bold">内容管理</div>
                  <div className="mt-2 text-sm font-bold">剧集、套餐、文案</div>
                </div>
                <div className="rounded-2xl bg-white/5 border border-white/10 p-5">
                  <div className="text-xs text-slate-400 font-bold">运营分析</div>
                  <div className="mt-2 text-sm font-bold">用户、订阅、收入</div>
                </div>
              </div>
            </div>

            <div className="text-[11px] text-slate-500 font-semibold">Internal use only</div>
          </div>

          <div className="p-10 flex flex-col justify-center">
            <div className="space-y-6 max-w-md">
              <PageHeader title="继续登录" subtitle="推荐使用 Google 登录（后端验签 + JWT）" />

              {error ? <AlertBar type="error" message={error} onClose={() => setError(null)} /> : null}

              <div className={`${isLoading ? 'opacity-60 pointer-events-none' : ''}`}>
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

              <div className="rounded-2xl bg-slate-100 border border-slate-200 px-4 py-3 text-xs text-slate-600 font-medium leading-relaxed">
                登录权限由后端 ADMIN_EMAILS 白名单控制。如需开通，请联系系统所有者。
              </div>

              <div className="pt-2 border-t border-slate-200 space-y-3">
                <div className="text-sm font-black text-slate-900">备用：管理员 Token 登录</div>
                <input
                  value={tokenInput}
                  onChange={(e) => setTokenInput(e.target.value)}
                  placeholder="粘贴 ADMIN_TOKEN"
                  className="w-full h-11 bg-slate-100 border border-slate-200 rounded-xl px-4 text-sm font-medium outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
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
        </div>
      </Card>
    </div>
  );
};

export default AdminLogin;
