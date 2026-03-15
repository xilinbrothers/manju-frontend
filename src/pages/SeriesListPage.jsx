import React, { useEffect, useMemo, useState } from 'react';
import SeriesCard from '../components/SeriesCard';
import { apiFetchJson } from '../utils/api';

const SeriesListPage = ({ onNavigate, onSelectSeries }) => {
  const [activeCategory, setActiveCategory] = useState('全部');
  const [search, setSearch] = useState('');
  const [series, setSeries] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const categories = ['全部', '都市情感', '玄幻修仙', '商战权谋'];
  
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

  const filteredSeries = useMemo(() => {
    const keyword = search.trim().toLowerCase();
    return series.filter((s) => {
      if (activeCategory !== '全部' && s.category && s.category !== activeCategory) return false;
      if (!keyword) return true;
      return String(s.title || '').toLowerCase().includes(keyword);
    });
  }, [activeCategory, search, series]);

  return (
    <div className="flex flex-col min-h-screen bg-[#0F172A] text-white">
      {/* Header with Search */}
      <div className="p-5 space-y-5">
        <div className="relative">
          <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 text-lg">🔍</span>
          <input 
            type="text" 
            placeholder="搜索剧集名称..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full py-3.5 pl-12 pr-4 bg-[#1A2333] border border-gray-800/50 rounded-full text-[14px] text-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all shadow-inner"
          />
        </div>

        {/* Categories */}
        <div className="flex space-x-2.5 overflow-x-auto scrollbar-hide py-1">
          {categories.map(cat => (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className={`px-5 py-2.5 rounded-full text-[13px] font-bold whitespace-nowrap transition-all ${
                activeCategory === cat 
                  ? 'bg-[#3B82F6] text-white shadow-lg shadow-blue-900/20' 
                  : 'bg-[#1A2333] text-gray-400 border border-gray-800/50'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Main Content */}
      <div className="px-5 pb-24 space-y-1">
        <div className="py-4">
          <p className="text-[13px] text-gray-400 leading-relaxed italic opacity-80">
            修仙归来，降妖除魔。都市传奇，玄幻与现代的碰撞，开启不一样的修真之路。
          </p>
          <div className="flex space-x-3 mt-4">
            <button className="flex-1 py-3 bg-[#1A2333] hover:bg-[#252D3F] text-gray-300 text-[14px] font-bold rounded-full border border-gray-800/50 transition-all">
              免费试看
            </button>
            <button className="flex-1 py-3 bg-[#3B82F6] hover:bg-blue-600 text-white text-[14px] font-bold rounded-full shadow-lg shadow-blue-900/20 transition-all">
              立即订阅
            </button>
          </div>
        </div>

        {/* List */}
        <div className="pt-6">
          {isLoading && (
            <div className="text-[13px] text-gray-400 font-medium px-1">正在加载剧集…</div>
          )}

          {!isLoading && error && (
            <div className="bg-red-500/10 border border-red-500/20 text-red-300 rounded-2xl p-4 text-[13px]">
              {error}
            </div>
          )}

          {!isLoading && !error && filteredSeries.length === 0 && (
            <div className="text-[13px] text-gray-500 font-medium px-1">暂无剧集</div>
          )}

          {!isLoading && !error && filteredSeries.map((item) => (
            <SeriesCard 
              key={item.id} 
              series={item} 
              onSubscribe={() => {
                onSelectSeries(item);
                onNavigate('plans');
              }} 
            />
          ))}
        </div>

        <div className="py-8 text-center">
          <span className="text-[12px] text-gray-600 font-medium">已显示全部剧集</span>
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
