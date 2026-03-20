import React, { useEffect, useMemo, useState } from 'react';
import { apiFetchJson } from '../utils/api';

const SeasonSelectPage = ({ seriesId, onSelectTarget, onNavigate }) => {
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [series, setSeries] = useState(null);

  const seasons = useMemo(() => {
    const list = Array.isArray(series?.seasons) ? series.seasons : [];
    return list.filter((s) => s && s.enabled !== false);
  }, [series]);

  const superVip = useMemo(() => {
    return series?.superVip && typeof series.superVip === 'object' ? series.superVip : { enabled: false };
  }, [series]);

  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      try {
        setError('');
        setIsLoading(true);
        const data = await apiFetchJson(`/api/series/${encodeURIComponent(seriesId)}`);
        if (cancelled) return;
        if (!data?.success || !data?.item) throw new Error(data?.message || '加载失败');
        setSeries(data.item);
      } catch (e) {
        if (cancelled) return;
        setError(e?.message || '加载失败');
        setSeries(null);
      } finally {
        if (cancelled) return;
        setIsLoading(false);
      }
    };
    if (seriesId) run();
    else {
      setIsLoading(false);
      setError('缺少剧集ID');
    }
    return () => {
      cancelled = true;
    };
  }, [seriesId]);

  return (
    <div className="flex flex-col min-h-screen bg-[#0F172A] text-white p-5 pb-24">
      <div className="mb-6">
        <div className="text-[20px] font-black">{series?.title || '选择分季'}</div>
        <div className="text-[12px] text-gray-400 mt-1">请选择订阅的季或升级全季</div>
      </div>

      {isLoading && <div className="text-[13px] text-gray-400 font-medium">正在加载…</div>}
      {!isLoading && error && (
        <div className="bg-red-500/10 border border-red-500/20 text-red-300 rounded-2xl p-4 text-[13px]">
          {error}
        </div>
      )}

      {!isLoading && !error && (
        <div className="space-y-4">
          {seasons.map((s) => (
            <div key={s.seasonId} className="bg-[#1A2333] rounded-3xl p-4 border border-gray-800/50 shadow-xl">
              <div className="flex gap-4">
                <div className="w-[35%] aspect-[3/4] rounded-2xl overflow-hidden border border-white/5 flex-shrink-0">
                  <img
                    src={s.cover || series?.cover || 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?auto=format&fit=crop&q=80&w=640&h=360'}
                    className="w-full h-full object-cover"
                    alt=""
                  />
                </div>
                <div className="w-[60%] flex flex-col justify-between">
                  <div className="space-y-2">
                    <div className="text-[14px] font-black">{s.introTitle || s.title || ''}</div>
                    <div className="text-[12px] text-gray-400 leading-relaxed line-clamp-6">
                      {s.introText || ''}
                    </div>
                  </div>
                </div>
              </div>

              <div className="mt-3">
                <button
                  onClick={() => {
                    onSelectTarget({ targetType: 'season', seasonId: s.seasonId, displayTitle: `${series?.title || ''} ${s.title || ''}`.trim() });
                    onNavigate('plans');
                  }}
                  className="w-full py-3 bg-[#3B82F6] hover:bg-blue-600 text-white text-[14px] font-bold rounded-2xl shadow-lg shadow-blue-900/20 transition-all active:scale-[0.98]"
                >
                  立即订阅
                </button>
              </div>
            </div>
          ))}

          {superVip?.enabled ? (
            <div className="bg-[#1A2333] rounded-3xl p-4 border border-gray-800/50 shadow-xl">
              <div className="text-[14px] font-black">土豪专区</div>
              {superVip?.desc ? (
                <div className="text-[12px] text-gray-400 mt-2 leading-relaxed">{superVip.desc}</div>
              ) : (
                <div className="text-[12px] text-gray-400 mt-2 leading-relaxed">全季内容持续更新，进入专属尊享群。</div>
              )}
              <div className="mt-3">
                <button
                  onClick={() => {
                    onSelectTarget({ targetType: 'super', seasonId: 'all', displayTitle: superVip?.title || `${series?.title || ''} 全季`.trim() });
                    onNavigate('plans');
                  }}
                  disabled={superVip?.ready === false}
                  className="w-full py-3 bg-gradient-to-r from-amber-500 to-yellow-400 hover:from-amber-400 hover:to-yellow-300 text-[#0F172A] text-[14px] font-black rounded-2xl shadow-lg shadow-yellow-900/30 transition-all active:scale-[0.98]"
                >
                  {superVip?.ready === false ? '土豪群未配置' : (superVip?.buttonText || '全季订阅（尊享）')}
                </button>
                {superVip?.ready === false ? (
                  <div className="text-[11px] text-amber-200/80 mt-2">后台开启土豪专区后需填写土豪群 chat_id 才可使用。</div>
                ) : null}
              </div>
            </div>
          ) : null}
        </div>
      )}
    </div>
  );
};

export default SeasonSelectPage;
