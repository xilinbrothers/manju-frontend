import React, { useEffect, useMemo, useState } from 'react';
import { apiFetchJson, resolveApiUrl } from '../utils/api';
import AlertBar from '../components/AlertBar';
import BottomNav from '../components/BottomNav';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import SectionHeader from '../components/ui/SectionHeader';

const MySubscriptionsPage = ({ onNavigate, onRenew, onAlert }) => {
  const [activeSubs, setActiveSubs] = useState([]);
  const [expiredSubs, setExpiredSubs] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [joiningId, setJoiningId] = useState('');

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

  const requestVipInviteLink = async (seriesId, targetType, seasonId) => {
    const data = await apiFetchJson('/api/vip/invite-link', { method: 'POST', body: JSON.stringify({ series_id: seriesId, target_type: targetType, season_id: seasonId }) });
    if (!data?.invite_link) throw new Error('未获取到入群链接');
    return data.invite_link;
  };

  const joinVipGroup = async (sub) => {
    if (!sub?.seriesId) return;
    if (!sub?.hasVipGroup) return;
    if (joiningId) return;
    try {
      setJoiningId(sub.id);
      const link = await requestVipInviteLink(sub.seriesId, sub.targetType, sub.seasonId);
      openGroup(link);
    } catch (e) {
      onAlert?.('error', e?.message || '获取入群链接失败');
    } finally {
      setJoiningId('');
    }
  };

  if (!hasSubscriptions) {
    return (
      <div className="flex flex-col min-h-screen bg-[var(--app-bg)] text-[var(--app-fg)] p-6 items-center justify-center text-center pb-24">
        <div className="mb-2 w-full text-left self-start">
          <SectionHeader title="我的订阅" subtitle="管理你的所有订阅内容" />
        </div>
        
        <div className="flex-1 flex flex-col items-center justify-center -mt-20">
          {isLoading && (
            <div className="text-[13px] text-[color:var(--app-muted)] font-medium mb-6">正在加载订阅…</div>
          )}
          {!isLoading && error && (
            <div className="mb-6 w-full max-w-[360px]">
              <AlertBar type="error" message={error} />
            </div>
          )}
          <div className="w-32 h-32 bg-[var(--app-card)] rounded-full flex items-center justify-center mb-8 shadow-2xl border border-[color:var(--app-border)]">
            <div className="text-5xl">📺</div>
          </div>
          <h3 className="text-[20px] font-bold mb-2">暂无订阅</h3>
          <p className="text-[color:var(--app-muted)] text-[14px] max-w-[220px] leading-relaxed mb-10">
            你还没有订阅任何剧集 快去发现喜欢的内容吧
          </p>
          <button
            onClick={() => onNavigate('series')}
            className="px-10 py-4 bg-[var(--app-primary)] hover:bg-[var(--app-primary-hover)] text-white font-bold rounded-full shadow-[0_18px_40px_rgba(59,130,246,0.18)] transition-all active:scale-[0.99] flex items-center space-x-2"
          >
            <span>🎬</span>
            <span>浏览剧集</span>
          </button>
        </div>
        <BottomNav current="my-subs" onNavigate={onNavigate} />
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen bg-[var(--app-bg)] text-[var(--app-fg)] p-6 pb-24">
      <header className="mb-8">
        <SectionHeader title="我的订阅" subtitle="管理你的所有订阅内容" />
      </header>

      {isLoading && (
        <div className="text-[13px] text-[color:var(--app-muted)] font-medium px-1">正在加载订阅…</div>
      )}

      {!isLoading && error && (
        <AlertBar type="error" message={error} />
      )}

      {/* Active Subscriptions */}
      {!isLoading && !error && (
      <section className="space-y-5 mb-10">
        <h4 className="text-[13px] font-bold text-[color:var(--app-muted)] uppercase tracking-widest px-1">
          活跃订阅 ({activeSubs.length})
        </h4>
        
        {activeSubs.map(sub => (
          <Card key={sub.id} className={`p-5 relative overflow-hidden ${sub.status === 'expiring' ? 'ring-1 ring-orange-500/30' : ''}`}>
            {sub.status === 'expiring' && (
              <div className="flex items-center text-orange-500 text-[11px] font-bold mb-4">
                <span className="mr-1.5">⚠️</span> 即将到期
              </div>
            )}
            
            <div className="flex space-x-4 mb-5">
              <div className="w-20 h-20 rounded-[var(--app-radius-md)] overflow-hidden flex-shrink-0 border border-white/5 bg-black/10">
                <img src={resolveApiUrl(sub.cover)} className="w-full h-full object-cover" alt="" />
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
                <p className="text-[12px] text-[color:var(--app-muted)] mt-1.5">{sub.plan}</p>
                <div className="mt-3 flex items-center justify-between">
                  <span className="text-[11px] text-[color:var(--app-muted)] font-medium">剩余 {sub.remainingDays} 天</span>
                  <span className="text-[11px] text-white/40 font-bold">{sub.progress}%</span>
                </div>
                {/* Progress Bar */}
                <div className="h-1.5 w-full bg-black/20 rounded-full mt-1.5 overflow-hidden border border-white/5">
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
              <Button
                variant="ghost"
                className="flex-1 py-3 rounded-[var(--app-radius-md)] text-[13px] flex items-center justify-center space-x-2"
                onClick={() => joinVipGroup(sub)}
                disabled={!sub.hasVipGroup || joiningId === sub.id}
              >
                <span>👥</span>
                <span>{joiningId === sub.id ? '获取链接中…' : '进入群组'}</span>
              </Button>
              <button className={`flex-1 py-3 text-white text-[13px] font-bold rounded-2xl shadow-lg transition-all flex items-center justify-center ${
                sub.status === 'active' 
                  ? 'bg-transparent border border-[color:var(--app-border)] text-[color:var(--app-muted)] hover:bg-white/5' 
                  : 'bg-gradient-to-r from-orange-500 to-red-500 shadow-orange-900/20 active:scale-95'
              }`}
              onClick={() => onRenew?.(sub.seriesId)}
              >
                {sub.status === 'active' ? '续费订阅' : '立即续费'}
              </button>
            </div>
          </Card>
        ))}
      </section>
      )}

      {/* Expired Subscriptions */}
      {!isLoading && !error && expiredSubs.length > 0 && (
        <section className="space-y-4">
          <h4 className="text-[13px] font-bold text-[color:var(--app-muted)] uppercase tracking-widest px-1">
            已过期 ({expiredSubs.length})
          </h4>
          
          {expiredSubs.map(sub => (
            <div
              key={sub.id}
              className="bg-[color:var(--app-card)]/40 rounded-[var(--app-radius-lg)] p-4 flex items-center space-x-4 border border-[color:var(--app-border)] opacity-60 group hover:opacity-100 transition-all cursor-pointer"
              onClick={() => onRenew?.(sub.seriesId)}
            >
              <div className="w-14 h-14 rounded-xl overflow-hidden flex-shrink-0 grayscale">
                <img src={resolveApiUrl(sub.cover)} className="w-full h-full object-cover" alt="" />
              </div>
              <div className="flex-1">
                <h3 className="text-[14px] font-bold text-white/85">{sub.title}</h3>
                <p className="text-[11px] text-[color:var(--app-muted)] mt-1">已于 {sub.expireDate} 过期</p>
              </div>
              <span className="text-white/30 group-hover:text-white/55 transition-colors">❯</span>
            </div>
          ))}
        </section>
      )}

      <BottomNav current="my-subs" onNavigate={onNavigate} />
    </div>
  );
};

export default MySubscriptionsPage;
