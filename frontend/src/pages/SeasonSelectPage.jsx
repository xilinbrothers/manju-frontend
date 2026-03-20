import React, { useEffect, useMemo, useState } from 'react';
import { apiFetchJson } from '../utils/api';
import AlertBar from '../components/AlertBar';
import Button from '../components/ui/Button';
import Card from '../components/ui/Card';
import SectionHeader from '../components/ui/SectionHeader';

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
    <div className="flex flex-col min-h-screen bg-[var(--app-bg)] text-[var(--app-fg)] p-5 pb-24">
      <div className="mb-6">
        <SectionHeader title={series?.title || '选择分季'} subtitle="请选择订阅的季或升级全季" />
      </div>

      {isLoading && <div className="text-[13px] text-[color:var(--app-muted)] font-medium">正在加载…</div>}
      {!isLoading && error && (
        <AlertBar type="error" message={error} />
      )}

      {!isLoading && !error && (
        <div className="space-y-4">
          {seasons.map((s) => (
            <Card key={s.seasonId} className="p-4">
              <div className="flex gap-4">
                <div className="w-[35%] aspect-[3/4] rounded-[var(--app-radius-md)] overflow-hidden border border-white/5 flex-shrink-0 bg-black/10">
                  <img
                    src={s.cover || series?.cover || 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?auto=format&fit=crop&q=80&w=640&h=360'}
                    className="w-full h-full object-cover"
                    alt=""
                  />
                </div>
                <div className="w-[60%] flex flex-col justify-between">
                  <div className="space-y-2">
                    <div className="text-[14px] font-black">{s.introTitle || s.title || ''}</div>
                    <div className="text-[12px] text-[color:var(--app-muted)] leading-relaxed line-clamp-6">
                      {s.introText || ''}
                    </div>
                  </div>
                </div>
              </div>

              <div className="mt-3">
                <Button
                  onClick={() => {
                    onSelectTarget({ targetType: 'season', seasonId: s.seasonId, displayTitle: `${series?.title || ''} ${s.title || ''}`.trim() });
                    onNavigate('plans');
                  }}
                >
                  立即订阅
                </Button>
              </div>
            </Card>
          ))}

          {superVip?.enabled ? (
            <Card className="p-4">
              <div className="text-[14px] font-black">土豪专区</div>
              {superVip?.desc ? (
                <div className="text-[12px] text-[color:var(--app-muted)] mt-2 leading-relaxed">{superVip.desc}</div>
              ) : (
                <div className="text-[12px] text-[color:var(--app-muted)] mt-2 leading-relaxed">全季内容持续更新，进入专属尊享群。</div>
              )}
              <div className="mt-3">
                <button
                  onClick={() => {
                    onSelectTarget({ targetType: 'super', seasonId: 'all', displayTitle: superVip?.title || `${series?.title || ''} 全季`.trim() });
                    onNavigate('plans');
                  }}
                  className="w-full py-3 bg-gradient-to-r from-amber-500 to-yellow-400 hover:from-amber-400 hover:to-yellow-300 text-[#0F172A] text-[14px] font-black rounded-[var(--app-radius-md)] shadow-[0_18px_40px_rgba(245,158,11,0.2)] transition-all active:scale-[0.99]"
                >
                  {superVip?.buttonText || '全季订阅（尊享）'}
                </button>
              </div>
            </Card>
          ) : null}
        </div>
      )}
    </div>
  );
};

export default SeasonSelectPage;
