import React, { useEffect, useMemo, useState } from 'react';
import { apiFetchJson } from '../utils/api';

const MySubscriptionsPage = ({ onNavigate }) => {
  const [activeSubs, setActiveSubs] = useState([]);
  const [expiredSubs, setExpiredSubs] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      try {
        setError('');
        setIsLoading(true);
        const data = await apiFetchJson('/api/user/subscriptions');
        if (cancelled) return;
        setActiveSubs(Array.isArray(data?.activeSubs) ? data.activeSubs : []);
        setExpiredSubs(Array.isArray(data?.expiredSubs) ? data.expiredSubs : []);
      } catch (e) {
        if (cancelled) return;
        setError(e?.message || '加载失败');
        setActiveSubs([]);
        setExpiredSubs([]);
      } finally {
        if (cancelled) return;
        setIsLoading(false);
      }
    };
    run();
    return () => {
      cancelled = true;
    };
  }, []);

  const hasSubscriptions = useMemo(() => {
    return activeSubs.length > 0 || expiredSubs.length > 0;
  }, [activeSubs.length, expiredSubs.length]);

  const openGroup = (link) => {
    if (!link) return;
    if (window.Telegram?.WebApp?.openTelegramLink && /^https:\/\/t\.me\//i.test(link)) {
      window.Telegram.WebApp.openTelegramLink(link);
      return;
    }
    window.open(link, '_blank');
  };

  if (!hasSubscriptions) {
    return (
      <div className="flex flex-col min-h-screen bg-[#0F172A] text-white p-6 items-center justify-center text-center">
        <div className="mb-2 w-full text-left self-start">
          <h2 className="text-[28px] font-black tracking-tight">我的订阅</h2>
          <p className="text-gray-400 text-[14px] mt-1">管理你的所有订阅内容</p>
        </div>
        
        <div className="flex-1 flex flex-col items-center justify-center -mt-20">
          {isLoading && (
            <div className="text-[13px] text-gray-400 font-medium mb-6">正在加载订阅…</div>
          )}
          {!isLoading && error && (
            <div className="bg-red-500/10 border border-red-500/20 text-red-300 rounded-2xl p-4 text-[13px] mb-6 max-w-[320px]">
              {error}
            </div>
          )}
          <div className="w-32 h-32 bg-[#1A2333] rounded-full flex items-center justify-center mb-8 shadow-2xl border border-gray-800/50">
            <div className="text-5xl">📺</div>
          </div>
          <h3 className="text-[20px] font-bold mb-2">暂无订阅</h3>
          <p className="text-gray-500 text-[14px] max-w-[200px] leading-relaxed mb-10">
            你还没有订阅任何剧集 快去发现喜欢的内容吧
          </p>
          <button 
            onClick={() => onNavigate('series')}
            className="px-10 py-4 bg-[#3B82F6] hover:bg-blue-600 text-white font-bold rounded-full shadow-lg shadow-blue-900/20 transition-all active:scale-[0.98] flex items-center space-x-2"
          >
            <span>🎬</span>
            <span>浏览剧集</span>
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen bg-[#0F172A] text-white p-6 pb-24">
      <header className="mb-8">
        <h2 className="text-[28px] font-black tracking-tight">我的订阅</h2>
        <p className="text-gray-400 text-[14px] mt-1">管理你的所有订阅内容</p>
      </header>

      {isLoading && (
        <div className="text-[13px] text-gray-400 font-medium px-1">正在加载订阅…</div>
      )}

      {!isLoading && error && (
        <div className="bg-red-500/10 border border-red-500/20 text-red-300 rounded-2xl p-4 text-[13px]">
          {error}
        </div>
      )}

      {/* Active Subscriptions */}
      {!isLoading && !error && (
      <section className="space-y-5 mb-10">
        <h4 className="text-[13px] font-bold text-gray-500 uppercase tracking-widest px-1">
          活跃订阅 ({activeSubs.length})
        </h4>
        
        {activeSubs.map(sub => (
          <div key={sub.id} className={`bg-[#1A2333] rounded-[2rem] p-5 border border-gray-800/50 shadow-xl relative overflow-hidden ${sub.status === 'expiring' ? 'ring-1 ring-orange-500/30' : ''}`}>
            {sub.status === 'expiring' && (
              <div className="flex items-center text-orange-500 text-[11px] font-bold mb-4">
                <span className="mr-1.5">⚠️</span> 即将到期
              </div>
            )}
            
            <div className="flex space-x-4 mb-5">
              <div className="w-20 h-20 rounded-2xl overflow-hidden flex-shrink-0 border border-white/5">
                <img src={sub.cover} className="w-full h-full object-cover" alt="" />
              </div>
              <div className="flex-1 flex flex-col justify-center">
                <div className="flex justify-between items-start">
                  <h3 className="text-[16px] font-bold leading-tight max-w-[140px]">{sub.title}</h3>
                  <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                    sub.status === 'active' ? 'bg-green-500/10 text-green-500' : 
                    sub.status === 'expiring' ? 'bg-orange-500/10 text-orange-500' : 
                    'bg-rose-500/10 text-rose-500'
                  }`}>
                    {sub.status === 'active' ? '正常' : 
                     sub.status === 'expiring' ? '即将到期' : 
                     '已到期'}
                  </span>
                </div>
                <p className="text-[12px] text-gray-500 mt-1.5">{sub.plan}</p>
                <div className="mt-3 flex items-center justify-between">
                  <span className="text-[11px] text-gray-400 font-medium">剩余 {sub.remainingDays} 天</span>
                  <span className="text-[11px] text-gray-600 font-bold">{sub.progress}%</span>
                </div>
                {/* Progress Bar */}
                <div className="h-1.5 w-full bg-gray-800 rounded-full mt-1.5 overflow-hidden">
                  <div 
                    className={`h-full rounded-full transition-all duration-1000 ${
                      sub.status === 'active' 
                        ? 'bg-gradient-to-r from-blue-600 to-purple-500' 
                        : 'bg-gradient-to-r from-orange-500 to-red-500'
                    }`}
                    style={{ width: `${sub.progress}%` }}
                  ></div>
                </div>
              </div>
            </div>

            <div className="flex space-x-3">
              <button
                onClick={() => openGroup(sub.groupLink)}
                disabled={!sub.groupLink}
                className="flex-1 py-3 bg-[#252D3F] hover:bg-[#2D374D] text-gray-200 text-[13px] font-bold rounded-2xl border border-gray-700/50 transition-all flex items-center justify-center space-x-2 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <span>👥</span>
                <span>进入群组</span>
              </button>
              <button className={`flex-1 py-3 text-white text-[13px] font-bold rounded-2xl shadow-lg transition-all flex items-center justify-center ${
                sub.status === 'active' 
                  ? 'bg-transparent border border-gray-700 text-gray-400 hover:bg-white/5' 
                  : 'bg-gradient-to-r from-orange-500 to-red-500 shadow-orange-900/20 active:scale-95'
              }`}>
                {sub.status === 'active' ? '续费订阅' : '立即续费'}
              </button>
            </div>
          </div>
        ))}
      </section>
      )}

      {/* Expired Subscriptions */}
      {!isLoading && !error && expiredSubs.length > 0 && (
        <section className="space-y-4">
          <h4 className="text-[13px] font-bold text-gray-500 uppercase tracking-widest px-1">
            已过期 ({expiredSubs.length})
          </h4>
          
          {expiredSubs.map(sub => (
            <div key={sub.id} className="bg-[#1A2333]/40 rounded-3xl p-4 flex items-center space-x-4 border border-gray-800/30 opacity-60 group hover:opacity-100 transition-all cursor-pointer">
              <div className="w-14 h-14 rounded-xl overflow-hidden flex-shrink-0 grayscale">
                <img src={sub.cover} className="w-full h-full object-cover" alt="" />
              </div>
              <div className="flex-1">
                <h3 className="text-[14px] font-bold text-gray-300">{sub.title}</h3>
                <p className="text-[11px] text-gray-500 mt-1">已于 {sub.expireDate} 过期</p>
              </div>
              <span className="text-gray-600 group-hover:text-gray-400 transition-colors">❯</span>
            </div>
          ))}
        </section>
      )}

      {/* Fixed Bottom Action */}
      <div className="fixed bottom-0 left-0 right-0 p-6 bg-[#0F172A]/80 backdrop-blur-xl border-t border-gray-800/30 z-50">
        <button 
          onClick={() => onNavigate('series')}
          className="w-full py-4.5 bg-[#3B82F6] hover:bg-blue-600 text-white text-[16px] font-bold rounded-full shadow-lg shadow-blue-900/20 transition-all active:scale-[0.98] flex items-center justify-center space-x-2"
        >
          <span>🎬</span>
          <span>浏览更多剧集</span>
        </button>
      </div>
    </div>
  );
};

export default MySubscriptionsPage;
