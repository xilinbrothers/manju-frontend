import React, { useEffect, useMemo, useState } from 'react';
import { apiFetchJson, resolveApiUrl } from '../utils/api';
import AlertBar from '../components/AlertBar';
import Card from '../components/ui/Card';
import PaymentMethodSelector from '../components/PaymentMethodSelector';

const PlansPage = ({ series, targetType, seasonId, displayTitle, onSelectPlan, onNavigate }) => {
  const [plans, setPlans] = useState([]);
  const [selectedId, setSelectedId] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      try {
        setError('');
        setIsLoading(true);
        const qsParts = [];
        if (series?.id) qsParts.push(`series_id=${encodeURIComponent(series.id)}`);
        if (targetType) qsParts.push(`target_type=${encodeURIComponent(targetType)}`);
        if (seasonId) qsParts.push(`season_id=${encodeURIComponent(seasonId)}`);
        const qs = qsParts.length > 0 ? `?${qsParts.join('&')}` : '';
        const data = await apiFetchJson(`/api/plans${qs}`);
        if (cancelled) return;
        const list = Array.isArray(data) ? data : [];
        setPlans(list);
        const firstEnabled = list.find((p) => p.enabled !== false);
        setSelectedId((prev) => {
          if (prev && list.some((p) => p.id === prev)) return prev;
          return firstEnabled?.id || list[0]?.id || '';
        });
      } catch (e) {
        if (cancelled) return;
        setError(e?.message || '加载失败');
        setPlans([]);
        setSelectedId('');
      } finally {
        if (cancelled) return;
        setIsLoading(false);
      }
    };
    run();
    return () => {
      cancelled = true;
    };
  }, [series?.id, targetType, seasonId]);

  const currentPlan = useMemo(() => {
    return plans.find((p) => p.id === selectedId) || plans.find((p) => p.enabled !== false) || null;
  }, [plans, selectedId]);

  return (
    <div className="flex flex-col min-h-screen bg-[var(--app-bg)] text-[var(--app-fg)] p-5">
      <Card className="p-5 mb-8 flex space-x-4">
        <div className="w-24 h-24 rounded-[var(--app-radius-md)] overflow-hidden flex-shrink-0 border border-white/5 bg-black/10">
          <img 
            src={resolveApiUrl(series?.cover) || 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?auto=format&fit=crop&q=80&w=640&h=360'} 
            className="w-full h-full object-cover"
            alt=""
          />
        </div>
        <div className="flex flex-col justify-center space-y-2">
          <h3 className="text-[16px] font-bold leading-tight">{displayTitle || series?.title || '选择套餐'}</h3>
          <div className="space-y-1">
            <div className="flex items-center text-[11px] text-[color:var(--app-muted)]">
              <span className="text-green-500 mr-2">✓</span> 全集解锁，高清观看
            </div>
            <div className="flex items-center text-[11px] text-[color:var(--app-muted)]">
              <span className="text-green-500 mr-2">✓</span> 专属观影群，抢先看新集
            </div>
            <div className="flex items-center text-[11px] text-[color:var(--app-muted)]">
              <span className="text-green-500 mr-2">✓</span> 无广告打扰
            </div>
          </div>
        </div>
      </Card>

      <PaymentMethodSelector className="mb-8" disabled />

      <h4 className="text-[15px] font-bold mb-5 px-1">选择订阅时长</h4>

      {/* Plans List */}
      <div className="space-y-4 mb-24">
        {isLoading && (
          <div className="text-[13px] text-[color:var(--app-muted)] font-medium px-1">正在加载套餐…</div>
        )}

        {!isLoading && error && (
          <AlertBar type="error" message={error} />
        )}

        {!isLoading && !error && plans.length === 0 && (
          <div className="text-[13px] text-[color:var(--app-muted)] font-medium px-1">暂无可用套餐</div>
        )}

        {!isLoading && !error && plans.map(plan => (
          <div key={plan.id} className="relative group">
            {plan.note && (
              <div className="absolute top-3 right-4 bg-black/40 text-[color:var(--app-muted)] text-[10px] font-bold px-2 py-0.5 rounded-md z-10 border border-white/10">
                {plan.note}
              </div>
            )}
            
            <button 
              disabled={plan.enabled === false}
              onClick={() => setSelectedId(plan.id)}
              className={`w-full p-5 rounded-[var(--app-radius-lg)] flex items-center border transition-all duration-300 ${
                plan.enabled === false 
                  ? 'bg-black/15 border-[color:var(--app-border)] opacity-40 grayscale' 
                  : selectedId === plan.id
                    ? 'bg-[var(--app-card)] border-blue-500 shadow-[0_0_20px_rgba(59,130,246,0.12)] ring-1 ring-blue-500'
                    : 'bg-[var(--app-card)] border-[color:var(--app-border)] hover:border-white/15'
              }`}
            >
              <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center mr-4 transition-colors ${
                selectedId === plan.id ? 'border-blue-500 bg-blue-500' : 'border-white/15'
              }`}>
                {selectedId === plan.id && <div className="w-2.5 h-2.5 bg-white rounded-full"></div>}
              </div>

              <div className="flex-1 text-left">
                <div className="text-[16px] font-bold mb-0.5">{plan.label}</div>
                <div className="text-[11px] text-[color:var(--app-muted)] font-medium">每天仅需 ￥{plan.daily}</div>
              </div>

              <div className="text-right">
                <div className="text-[18px] font-black font-mono tracking-tight">￥{plan.price}</div>
                {plan.save && <div className="text-[11px] text-green-500 font-bold">省{plan.save}元</div>}
              </div>
            </button>
          </div>
        ))}
      </div>

      {/* Fixed Bottom Action */}
      <div className="fixed bottom-0 left-0 right-0 p-5 bg-[var(--app-overlay)] backdrop-blur-xl border-t border-[color:var(--app-overlay-border)] flex flex-col items-center z-50">
        <button 
          onClick={() => {
            if (!currentPlan) return;
            onSelectPlan(currentPlan);
            onNavigate('payment');
          }}
          disabled={!currentPlan}
          className="w-full py-3.5 bg-[var(--app-primary)] hover:bg-[var(--app-primary-hover)] text-white text-[16px] font-bold rounded-full shadow-[0_18px_40px_rgba(59,130,246,0.18)] transition-all active:scale-[0.99] flex items-center justify-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <span className="text-lg">💳</span>
          <span>立即支付 ￥{currentPlan?.price || '--'}</span>
        </button>

      </div>
    </div>
  );
};

export default PlansPage;
