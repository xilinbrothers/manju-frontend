import React from 'react';
import Card from './ui/Card';
import Button from './ui/Button';
import { resolveApiUrl } from '../utils/api';

const SeriesCard = ({ series, onSubscribe, onPreview }) => {
  return (
    <Card className="overflow-hidden mb-6 transition-all hover:border-white/15 group">
      <div className="p-4 sm:p-5">
        {/* 剧照和内容 */}
        <div className="flex flex-col sm:flex-row gap-4 mb-4 sm:mb-5">
          {/* 剧照 */}
          <div className="relative flex-shrink-0 aspect-video w-full sm:w-32 rounded-[var(--app-radius-md)] overflow-hidden bg-black/10">
            <img 
              src={resolveApiUrl(series.coverThumb || series.cover) || 'https://via.placeholder.com/200x300'} 
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
            <h3 className="text-[16px] sm:text-[18px] font-bold mb-2 tracking-tight transition-colors group-hover:text-white/90">
              {series.title}
            </h3>
            <p className="text-[color:var(--app-muted)] text-[13px] line-clamp-3 leading-relaxed opacity-90">
              {series.description}
            </p>
          </div>
        </div>
        
        {/* 按钮 */}
        <div className="flex space-x-2 sm:space-x-3">
          <Button
            variant="ghost"
            className="flex-1 py-3 sm:py-3.5 rounded-full text-[14px] sm:text-[15px]"
            onClick={() => onPreview(series)}
          >
            免费试看
          </Button>
          <Button
            className="flex-1 py-3 sm:py-3.5 rounded-full text-[14px] sm:text-[15px]"
            onClick={() => onSubscribe(series)}
          >
            立即订阅
          </Button>
        </div>
      </div>
    </Card>
  );
};

export default SeriesCard;
