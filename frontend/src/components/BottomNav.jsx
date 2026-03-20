import React from 'react';

const BottomNav = ({ current = 'series', onNavigate }) => {
  const items = [
    { id: 'series', label: '剧集', icon: '🏠' },
    { id: 'my-subs', label: '我的', icon: '👤' },
    { id: 'service', label: '客服', icon: '💬' },
  ];
  return (
    <div className="fixed bottom-0 left-0 right-0 bg-[var(--app-overlay)] backdrop-blur-xl border-t border-[color:var(--app-overlay-border)] px-8 py-3.5 flex items-center justify-between z-50 shadow-2xl">
      {items.map((it) => {
        const isActive = current === it.id;
        return (
          <button
            key={it.id}
            onClick={() => onNavigate?.(it.id)}
            className={`flex flex-col items-center space-y-1 transition-colors ${
              isActive ? 'text-[var(--app-primary)]' : 'text-[color:var(--app-muted)] hover:text-white/80'
            }`}
          >
            <span className="text-xl">{it.icon}</span>
            <span className="text-[10px] font-bold uppercase tracking-widest">{it.label}</span>
          </button>
        );
      })}
    </div>
  );
};

export default BottomNav;

