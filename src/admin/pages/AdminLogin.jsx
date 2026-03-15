import React, { useState } from 'react';
import { useGoogleLogin } from '@react-oauth/google';

const AdminLogin = ({ onLoginSuccess }) => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  const login = useGoogleLogin({
    onSuccess: async (tokenResponse) => {
      setIsLoading(true);
      setError(null);
      console.log("Google Login Success, Token Response:", tokenResponse);

      try {
        // 在真实环境下，这里应该将 access_token 发送到后端进行验证
        // 这里我们通过 Google API 简单获取用户信息作为演示
        const res = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
          headers: { Authorization: `Bearer ${tokenResponse.access_token}` },
        });
        const userInfo = await res.json();
        
        console.log("User Info from Google:", userInfo);
        
        // 模拟后端校验邮箱白名单逻辑
        // TODO: 这里应调用后端 API 检查该邮箱是否在管理员列表中
        const allowedAdmins = ['admin@example.com', 'dev@company.com']; 
        
        if (allowedAdmins.includes(userInfo.email)) {
          onLoginSuccess({
            name: userInfo.name,
            email: userInfo.email,
            avatar: userInfo.picture
          });
        } else {
          setError("抱歉，您的账号未被授权访问管理后台。");
        }
      } catch (err) {
        console.error("Fetch UserInfo Error:", err);
        setError("获取用户信息失败，请重试。");
      } finally {
        setIsLoading(false);
      }
    },
    onError: (error) => {
      console.error('Google Login Failed:', error);
      setError("登录失败，请检查网络或稍后重试。");
    },
  });

  return (
    <div className="min-h-screen bg-slate-100 flex items-center justify-center p-8">
      <div className="w-full max-w-5xl grid grid-cols-2 bg-white border border-slate-200 rounded-3xl overflow-hidden shadow-2xl shadow-slate-900/10">
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

          <div className="text-[11px] text-slate-500 font-semibold">
            Internal use only
          </div>
        </div>

        <div className="p-10 flex flex-col justify-center">
          <div className="space-y-6 max-w-md">
            <div className="space-y-2">
              <div className="text-xl font-black text-slate-900">继续以 Google 登录</div>
              <div className="text-sm text-slate-500 font-medium">登录后将根据邮箱白名单验证权限。</div>
            </div>

            {error && (
              <div className="px-4 py-3 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 text-sm font-semibold">
                {error}
              </div>
            )}

            <button
              onClick={() => login()}
              disabled={isLoading}
              className={`w-full h-12 rounded-2xl bg-white border border-slate-200 hover:border-indigo-300 hover:bg-indigo-50 text-slate-800 font-bold transition-colors flex items-center justify-center gap-3 ${isLoading ? 'opacity-60 cursor-not-allowed' : ''}`}
            >
              {isLoading ? (
                <div className="w-5 h-5 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
              ) : (
                <>
                  <img
                    src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/action/google.svg"
                    className="w-5 h-5"
                    alt="Google Logo"
                  />
                  <span className="text-sm">使用 Google 账号登录</span>
                </>
              )}
            </button>

            <div className="rounded-2xl bg-slate-100 border border-slate-200 px-4 py-3 text-xs text-slate-500 font-medium leading-relaxed">
              如果你无法登录，请联系系统所有者将你的邮箱加入管理员白名单。
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminLogin;
