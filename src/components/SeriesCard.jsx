import React from 'react';

const SeriesCard = ({ series, onSubscribe }) => {
  return (
    <div className="bg-[#111827] rounded-3xl overflow-hidden border border-gray-800/40 shadow-xl mb-6 transition-all hover:border-blue-500/30 group">
      {/* 剧照 */}
      <div className="relative aspect-video w-full overflow-hidden">
        <img 
          src={series.cover || 'https://via.placeholder.com/640x360'} 
          alt={series.title}
          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
        />
        {/* Badges */}
        <div className="absolute top-3 left-3 flex items-center px-2.5 py-1 bg-[#00B127] text-white text-[11px] font-bold rounded-full shadow-lg">
          <span className="mr-1">🔥</span> 连载中
        </div>
        <div className="absolute top-3 right-3 px-2.5 py-1 bg-black/50 backdrop-blur-md text-white text-[11px] font-medium rounded-full border border-white/10">
          共 {series.total || 45} 集
        </div>
      </div>

      <div className="p-5 flex flex-col">
        <h3 className="text-[18px] font-bold text-white mb-2 tracking-tight group-hover:text-blue-400 transition-colors">
          {series.title}
        </h3>
        <p className="text-gray-400 text-[13px] line-clamp-2 mb-5 leading-relaxed opacity-80">
          {series.description}
        </p>
        
        <div className="mt-auto">
          <button 
            onClick={() => onSubscribe(series)}
            className="w-full py-3.5 bg-[#3B82F6] hover:bg-blue-600 text-white text-[15px] font-bold rounded-full shadow-lg shadow-blue-900/20 transition-all active:scale-[0.97] flex items-center justify-center"
          >
            立即订阅
          </button>
        </div>
      </div>
    </div>
  );
};

export default SeriesCard;
