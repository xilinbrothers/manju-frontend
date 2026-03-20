import React, { useEffect, useState } from 'react';
import SeriesCard from '../components/SeriesCard';
import { apiFetchJson } from '../utils/api';

const SeriesListPage = ({ onNavigate, onSelectSeries }) => {
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
    <div className="flex flex-col min-h-screen bg-[#0F172A] text-white">
      {/* Header */}
      <div className="p-5">
      </div>

      {/* Main Content */}
      <div className="px-5 pb-24 space-y-1">


        {/* List */}
        <div className="pt-6">
          {isLoading && (
            <div className="text-[13px] text-gray-400 font-medium text-center py-8">正在加载剧集…</div>
          )}

          {!isLoading && error && (
            <div className="bg-red-500/10 border border-red-500/20 text-red-300 rounded-2xl p-4 text-[13px]">
              {error}
            </div>
          )}

          {!isLoading && !error && series.length === 0 && (
            <div className="text-[13px] text-gray-500 font-medium text-center py-8">暂无剧集</div>
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
                      alert(e?.message || '进入试看群失败');
                    }
                  }}
                  onSubscribe={() => {
                    onSelectSeries(item);
                    onNavigate('season-select');
                  }} 
                />
              ))}
              <div className="py-8 text-center">
                <span className="text-[12px] text-gray-600 font-medium">已显示全部剧集</span>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Bottom Navigation Bar */}
      <div className="fixed bottom-0 left-0 right-0 bg-[#0F172A]/90 backdrop-blur-xl border-t border-gray-800/50 px-8 py-3.5 flex items-center justify-between z-50 shadow-2xl">
        <button onClick={() => onNavigate('series')} className="flex flex-col items-center space-y-1 text-blue-500">
          <span className="text-xl">🏠</span>
          <span className="text-[10px] font-bold uppercase tracking-widest">剧集</span>
        </button>
        <button onClick={() => onNavigate('my-subs')} className="flex flex-col items-center space-y-1 text-gray-500 hover:text-gray-300 transition-colors">
          <span className="text-xl">👤</span>
          <span className="text-[10px] font-bold uppercase tracking-widest">我的</span>
        </button>
        <button onClick={() => onNavigate('service')} className="flex flex-col items-center space-y-1 text-gray-500 hover:text-gray-300 transition-colors">
          <span className="text-xl">💬</span>
          <span className="text-[10px] font-bold uppercase tracking-widest">客服</span>
        </button>
      </div>
    </div>
  );
};

export default SeriesListPage;
