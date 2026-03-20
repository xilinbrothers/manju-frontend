import React, { useEffect, useState } from 'react';
import SeriesCard from '../components/SeriesCard';
import { apiFetchJson } from '../utils/api';
import AlertBar from '../components/AlertBar';
import SectionHeader from '../components/ui/SectionHeader';
import BottomNav from '../components/BottomNav';

const SeriesListPage = ({ onNavigate, onSelectSeries, onAlert }) => {
  const [series, setSeries] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  
  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      try {
        setError('');
        setIsLoading(true);
        const data = await apiFetchJson('/api/series');
        if (cancelled) return;
        setSeries(Array.isArray(data) ? data : []);
      } catch (e) {
        if (cancelled) return;
        setError(e?.message || '加载失败');
        setSeries([]);
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

  return (
    <div className="flex flex-col min-h-screen bg-[var(--app-bg)] text-[var(--app-fg)]">
      <div className="p-5">
        <SectionHeader title="剧集" subtitle="选择你喜欢的内容开始订阅" />
      </div>

      {/* Main Content */}
      <div className="px-5 pb-24 space-y-1">
        {/* List */}
        <div className="pt-6">
          {isLoading && (
            <div className="text-[13px] text-[color:var(--app-muted)] font-medium text-center py-8">正在加载剧集…</div>
          )}

          {!isLoading && error && (
            <AlertBar type="error" message={error} />
          )}

          {!isLoading && !error && series.length === 0 && (
            <div className="text-[13px] text-[color:var(--app-muted)] font-medium text-center py-8">暂无剧集</div>
          )}

          {!isLoading && !error && series.length > 0 && (
            <>
              {series.map((item) => (
                <SeriesCard 
                  key={item.id} 
                  series={item} 
                  onPreview={async () => {
                    try {
                      const resp = await apiFetchJson('/api/preview', {
                        method: 'POST',
                        body: JSON.stringify({ series_id: item.id }),
                      });
                      const link = resp?.invite_link;
                      if (!link) throw new Error('未获取到邀请链接');
                      if (window.Telegram?.WebApp?.openTelegramLink) {
                        window.Telegram.WebApp.openTelegramLink(link);
                      } else {
                        window.open(link, '_blank');
                      }
                    } catch (e) {
                      onAlert?.('error', e?.message || '进入试看群失败');
                    }
                  }}
                  onSubscribe={() => {
                    onSelectSeries(item);
                    onNavigate('season-select');
                  }} 
                />
              ))}
              <div className="py-8 text-center">
                <span className="text-[12px] text-[color:var(--app-muted)] font-medium">已显示全部剧集</span>
              </div>
            </>
          )}
        </div>
      </div>

      <BottomNav current="series" onNavigate={onNavigate} />
    </div>
  );
};

export default SeriesListPage;
