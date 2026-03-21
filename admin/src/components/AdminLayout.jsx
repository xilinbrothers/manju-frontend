import React from 'react';

const AdminLayout = ({ children, activeMenu, onMenuChange, user, onLogout }) => {
  const menuSections = [
    {
      title: '概览',
      items: [{ id: 'overview', label: '数据概览', icon: '📊' }],
    },
    {
      title: '运营',
      items: [
        { id: 'series', label: '剧集管理', icon: '🎬' },
        { id: 'plans', label: '套餐 & 定价', icon: '💰' },
        { id: 'users', label: '用户 & 订阅', icon: '👥' },
        { id: 'orders', label: '订单与支付', icon: '🧾' },
        { id: 'finance', label: '财务中心', icon: '💹' },
      ],
    },
    {
      title: '配置',
      items: [
        { id: 'payment', label: '支付配置', icon: '💳' },
        { id: 'copywriting', label: '文案配置', icon: '📝' },
      ],
    },
    {
      title: '系统',
      items: [
        { id: 'settings', label: '系统设置', icon: '⚙️' },
        { id: 'admins', label: '管理员管理', icon: '🛡️' },
        { id: 'audit', label: '操作日志', icon: '📜' },
      ],
    },
  ];

  const menuLabelMap = {};
  for (const s of menuSections) {
    for (const it of s.items) menuLabelMap[it.id] = it.label;
  }

  return (
    <div className="min-h-dvh w-full bg-[var(--app-bg)] text-[var(--app-fg)] p-4">
      <div className="flex min-h-[calc(100dvh-32px)] w-full gap-4">
        <aside className="w-[248px] shrink-0 bg-[var(--app-card)] border border-[color:var(--app-border)] rounded-[var(--app-radius-lg)] shadow-[var(--app-shadow-sm)] overflow-hidden flex flex-col">
        <div className="px-5 py-5">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-lg bg-slate-900 flex items-center justify-center text-white font-black">
              M
            </div>
            <div className="min-w-0">
              <div className="text-sm font-black leading-tight truncate">管理平台</div>
              <div className="text-[11px] text-slate-500 font-semibold truncate">漫剧订阅助手</div>
            </div>
          </div>
        </div>

        <div className="px-3 pb-4">
          <div className="h-px bg-[color:var(--app-border)]"></div>
        </div>

        <nav className="flex-1 px-3 pb-6 overflow-y-auto">
          <div className="space-y-6">
            {menuSections.map((section, idx) => (
              <div key={section.title} className="space-y-2">
                {idx > 0 && <div className="h-px bg-slate-100"></div>}
                <div className="pt-4 px-4 text-[11px] font-bold tracking-wide text-slate-400">{section.title}</div>
                <div className="space-y-2 pt-1">
                  {section.items.map((item) => {
                    const isActive = activeMenu === item.id;
                    return (
                      <button
                        key={item.id}
                        onClick={() => onMenuChange(item.id)}
                        className={`w-full flex items-center gap-3 px-4 h-11 rounded-xl text-sm font-semibold transition-colors ${
                          isActive
                            ? 'bg-slate-100 text-slate-900'
                            : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                        }`}
                      >
                        <span className="text-base">{item.icon}</span>
                        <span className="truncate">{item.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </nav>

        <div className="p-4 border-t border-[color:var(--app-border)] bg-[var(--app-card)]">
          <div className="flex items-center gap-3 rounded-2xl bg-[var(--app-bg)] px-3 py-3 border border-[color:var(--app-border)]">
            {user?.avatar ? (
              <img src={user.avatar} alt="avatar" className="h-9 w-9 rounded-full object-cover" />
            ) : (
              <div className="h-9 w-9 rounded-full bg-slate-200 flex items-center justify-center font-black text-slate-700">
                {(user?.name || 'A').slice(0, 1).toUpperCase()}
              </div>
            )}
            <div className="min-w-0 flex-1">
              <div className="text-xs font-bold truncate">{user?.name || '管理员'}</div>
              <div className="text-[11px] text-slate-500 font-medium truncate">{user?.email || '-'}</div>
            </div>
            <button
              type="button"
              onClick={onLogout}
              className="h-9 w-9 rounded-xl bg-white hover:bg-slate-100 text-slate-700 transition-colors flex items-center justify-center border border-[color:var(--app-border)]"
              title="退出登录"
            >
              ⎋
            </button>
          </div>
        </div>
        </aside>

        <main className="flex-1 min-w-0 bg-[var(--app-bg)] border border-[color:var(--app-border)] rounded-[var(--app-radius-lg)] shadow-[var(--app-shadow-sm)] overflow-hidden">
          <div className="mx-auto w-full max-w-[var(--app-page-max)] px-[var(--app-gutter)] py-8">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
};

export default AdminLayout;
