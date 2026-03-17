import React from 'react';

const SeriesCard = ({ series, onSubscribe, onPreview }) => {
  return (
    <div className="bg-[#111827] rounded-3xl overflow-hidden border border-gray-800/40 shadow-xl mb-6 transition-all hover:border-blue-500/30 group">
      <div className="p-4 sm:p-5">
        {/* 剧照和内容 */}
        <div className="flex flex-col sm:flex-row gap-4 mb-4 sm:mb-5">
          {/* 剧照 */}
          <div className="relative flex-shrink-0 aspect-video w-full sm:w-32 rounded-2xl overflow-hidden">
            <img 
              src={series.cover || 'https://via.placeholder.com/200x300'} 
              alt={series.title}
              className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
            />
            {/* Badges */}
            <div className="absolute top-2 left-2 flex items-center px-2 py-0.5 bg-[#00B127] text-white text-[10px] font-bold rounded-full shadow-lg">
              <span className="mr-1">🔥</span> 连载中
            </div>
            <div className="absolute top-2 right-2 px-2 py-0.5 bg-black/50 backdrop-blur-md text-white text-[10px] font-medium rounded-full border border-white/10">
              共 {series.total || 45} 集
            </div>
          </div>
          
          {/* 名称和简述 */}
          <div className="flex-1">
            <h3 className="text-[16px] sm:text-[18px] font-bold text-white mb-2 tracking-tight group-hover:text-blue-400 transition-colors">
              {series.title}
            </h3>
            <p className="text-gray-400 text-[13px] line-clamp-3 leading-relaxed opacity-80">
              {series.description}
            </p>
          </div>
        </div>
        
        {/* 按钮 */}
        <div className="flex space-x-2 sm:space-x-3">
          <button 
            onClick={() => onPreview(series)}
            className="flex-1 py-3 sm:py-3.5 bg-[#1A2333] hover:bg-[#252D3F] text-gray-300 text-[14px] sm:text-[15px] font-bold rounded-full border border-gray-800/50 transition-all active:scale-[0.97] flex items-center justify-center"
          >
            免费试看
          </button>
          <button 
            onClick={() => onSubscribe(series)}
            className="flex-1 py-3 sm:py-3.5 bg-[#3B82F6] hover:bg-blue-600 text-white text-[14px] sm:text-[15px] font-bold rounded-full shadow-lg shadow-blue-900/20 transition-all active:scale-[0.97] flex items-center justify-center"
          >
            立即订阅
          </button>
        </div>
      </div>
    </div>
  );
};

export default SeriesCard;
