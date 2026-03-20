import React, { useEffect, useMemo, useState } from 'react';
import { apiFetchJson } from '../utils/api';

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
    <div className="flex flex-col min-h-screen bg-[#0F172A] text-white p-5">
      {/* Series Header Card */}
      <div className="bg-gradient-to-br from-[#1A2333] to-[#0F172A] rounded-3xl p-5 mb-8 border border-gray-800/50 flex space-x-4 shadow-xl">
        <div className="w-24 h-24 rounded-2xl overflow-hidden flex-shrink-0 border border-white/5">
          <img 
            src={series?.cover || 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?auto=format&fit=crop&q=80&w=640&h=360'} 
            className="w-full h-full object-cover"
            alt=""
          />
        </div>
        <div className="flex flex-col justify-center space-y-2">
          <h3 className="text-[16px] font-bold leading-tight">{displayTitle || series?.title || '选择套餐'}</h3>
          <div className="space-y-1">
            <div className="flex items-center text-[11px] text-gray-400">
              <span className="text-green-500 mr-2">✓</span> 全集解锁，高清观看
            </div>
            <div className="flex items-center text-[11px] text-gray-400">
              <span className="text-green-500 mr-2">✓</span> 专属观影群，抢先看新集
            </div>
            <div className="flex items-center text-[11px] text-gray-400">
              <span className="text-green-500 mr-2">✓</span> 无广告打扰
            </div>
          </div>
        </div>
      </div>

      <h4 className="text-[15px] font-bold mb-5 px-1">选择支付方式</h4>
      <div className="mb-8">
        <button
          disabled
          className="w-full p-5 rounded-3xl flex items-center border bg-[#1A2333] border-blue-500 shadow-[0_0_20px_rgba(59,130,246,0.15)] ring-1 ring-blue-500"
        >
          <div className="w-6 h-6 rounded-full border-2 flex items-center justify-center mr-4 border-blue-500 bg-blue-500">
            <div className="w-2.5 h-2.5 bg-white rounded-full"></div>
          </div>
          <div className="flex-1 text-left">
            <div className="text-[16px] font-bold mb-0.5">支付宝（Alipay）</div>
            <div className="text-[11px] text-gray-500 font-medium">默认支付方式</div>
          </div>
        </button>
      </div>

      <h4 className="text-[15px] font-bold mb-5 px-1">选择订阅时长</h4>

      {/* Plans List */}
      <div className="space-y-4 mb-24">
        {isLoading && (
          <div className="text-[13px] text-gray-400 font-medium px-1">正在加载套餐…</div>
        )}

        {!isLoading && error && (
          <div className="bg-red-500/10 border border-red-500/20 text-red-300 rounded-2xl p-4 text-[13px]">
            {error}
          </div>
        )}

        {!isLoading && !error && plans.length === 0 && (
          <div className="text-[13px] text-gray-500 font-medium px-1">暂无可用套餐</div>
        )}

        {!isLoading && !error && plans.map(plan => (
          <div key={plan.id} className="relative group">
            {plan.note && (
              <div className="absolute top-3 right-4 bg-gray-700/80 text-gray-400 text-[10px] font-bold px-2 py-0.5 rounded-md z-10">
                {plan.note}
              </div>
            )}
            
            <button 
              disabled={plan.enabled === false}
              onClick={() => setSelectedId(plan.id)}
              className={`w-full p-5 rounded-3xl flex items-center border transition-all duration-300 ${
                plan.enabled === false 
                  ? 'bg-gray-900/30 border-gray-800 opacity-40 grayscale' 
                  : selectedId === plan.id
                    ? 'bg-[#1A2333] border-blue-500 shadow-[0_0_20px_rgba(59,130,246,0.15)] ring-1 ring-blue-500'
                    : 'bg-[#1A2333] border-gray-800 hover:border-gray-700'
              }`}
            >
              <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center mr-4 transition-colors ${
                selectedId === plan.id ? 'border-blue-500 bg-blue-500' : 'border-gray-700'
              }`}>
                {selectedId === plan.id && <div className="w-2.5 h-2.5 bg-white rounded-full"></div>}
              </div>

              <div className="flex-1 text-left">
                <div className="text-[16px] font-bold mb-0.5">{plan.label}</div>
                <div className="text-[11px] text-gray-500 font-medium">每天仅需 ￥{plan.daily}</div>
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
      <div className="fixed bottom-0 left-0 right-0 p-5 bg-[#0F172A]/80 backdrop-blur-xl border-t border-gray-800/30 flex flex-col items-center z-50">
        <button 
          onClick={() => {
            if (!currentPlan) return;
            onSelectPlan(currentPlan);
            onNavigate('payment');
          }}
          disabled={!currentPlan}
          className="w-full py-3.5 bg-[#3B82F6] hover:bg-blue-600 text-white text-[16px] font-bold rounded-full shadow-lg shadow-blue-900/20 transition-all active:scale-[0.98] flex items-center justify-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <span className="text-lg">💳</span>
          <span>立即支付 ￥{currentPlan?.price || '--'}</span>
        </button>

      </div>
    </div>
  );
};

export default PlansPage;
