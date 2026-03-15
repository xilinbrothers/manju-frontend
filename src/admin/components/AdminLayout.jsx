import React from 'react';

const AdminLayout = ({ children, activeMenu, onMenuChange, user, onLogout }) => {
  const menuItems = [
    { id: 'overview', label: '概览', icon: '📊' },
    { id: 'series', label: '剧集管理', icon: '🎬' },
    { id: 'plans', label: '套餐 & 定价', icon: '💰' },
    { id: 'users', label: '用户 & 订阅', icon: '👥' },
    { id: 'payment', label: '支付配置', icon: '💳' },
    { id: 'copywriting', label: '文案配置', icon: '📝' },
    { id: 'admins', label: '管理员管理', icon: '🛡️' },
  ];

  return (
    <div className="flex h-screen bg-slate-100 text-slate-900">
      <aside className="w-72 bg-slate-950 text-slate-100 flex flex-col border-r border-white/10">
        <div className="px-6 py-5 border-b border-white/10">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-indigo-500 to-cyan-400 flex items-center justify-center text-slate-950 font-black">
              M
            </div>
            <div className="min-w-0">
              <div className="text-sm font-black tracking-wide leading-tight">漫剧订阅助手</div>
              <div className="text-[11px] text-slate-400 font-semibold truncate">Admin Console</div>
            </div>
          </div>
        </div>

        <nav className="flex-1 px-3 py-4 overflow-y-auto">
          <div className="space-y-1.5">
            {menuItems.map((item) => {
              const isActive = activeMenu === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => onMenuChange(item.id)}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold transition-colors ${
                    isActive
                      ? 'bg-white/10 text-white'
                      : 'text-slate-300 hover:bg-white/5 hover:text-white'
                  }`}
                >
                  <span className="text-lg">{item.icon}</span>
                  <span className="truncate">{item.label}</span>
                </button>
              );
            })}
          </div>
        </nav>

        <div className="p-4 border-t border-white/10">
          <div className="flex items-center gap-3 rounded-2xl bg-white/5 px-3 py-3">
            {user?.avatar ? (
              <img src={user.avatar} alt="avatar" className="h-9 w-9 rounded-full object-cover" />
            ) : (
              <div className="h-9 w-9 rounded-full bg-white/10 flex items-center justify-center font-black">
                {(user?.name || 'A').slice(0, 1).toUpperCase()}
              </div>
            )}
            <div className="min-w-0 flex-1">
              <div className="text-xs font-bold truncate">{user?.name || '管理员'}</div>
              <div className="text-[11px] text-slate-400 font-medium truncate">{user?.email || '-'}</div>
            </div>
            <button
              type="button"
              onClick={onLogout}
              className="h-9 w-9 rounded-xl bg-white/5 hover:bg-white/10 text-slate-200 transition-colors flex items-center justify-center"
              title="退出登录"
            >
              ⎋
            </button>
          </div>
        </div>
      </aside>

      <div className="flex-1 flex flex-col overflow-hidden">
        <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-6">
          <div className="flex items-center gap-4 min-w-0">
            <div className="text-base font-black text-slate-900 truncate">
              {menuItems.find((i) => i.id === activeMenu)?.label || '管理后台'}
            </div>
            <div className="h-6 w-px bg-slate-200"></div>
            <div className="relative w-[420px] max-w-[44vw]">
              <input
                type="text"
                placeholder="搜索用户 / 剧集 / 订单…"
                className="w-full rounded-xl bg-slate-100 border border-slate-200 px-4 py-2.5 text-sm font-medium outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              />
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button className="h-10 px-3 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold transition-colors">
              通知
            </button>
            <button className="h-10 px-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold transition-colors">
              新建
            </button>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto p-6">
          <div className="max-w-[1400px]">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
};

export default AdminLayout;
