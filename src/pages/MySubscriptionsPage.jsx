import React from 'react';

const MySubscriptionsPage = ({ onNavigate }) => {
  // 模拟订阅数据
  const activeSubs = [
    {
      id: 1,
      title: "霸道总裁的替身娇妻",
      plan: "90天套餐",
      remainingDays: 67,
      progress: 74,
      status: "active",
      cover: "https://images.unsplash.com/photo-1518709268805-4e9042af9f23?auto=format&fit=crop&q=80&w=640&h=360"
    },
    {
      id: 2,
      title: "全能天师在都市",
      plan: "30天套餐",
      remainingDays: 3,
      progress: 10,
      status: "expiring",
      cover: "https://images.unsplash.com/photo-1541562232579-512a21360020?auto=format&fit=crop&q=80&w=640&h=360"
    }
  ];

  const expiredSubs = [
    {
      id: 3,
      title: "重生之巅峰崛起",
      expireDate: "2026年2月14日",
      cover: "https://images.unsplash.com/photo-1614728263952-84ea256f9679?auto=format&fit=crop&q=80&w=640&h=360"
    }
  ];

  const hasSubscriptions = activeSubs.length > 0 || expiredSubs.length > 0;

  if (!hasSubscriptions) {
    return (
      <div className="flex flex-col min-h-screen bg-[#0F172A] text-white p-6 items-center justify-center text-center">
        <div className="mb-2 w-full text-left self-start">
          <h2 className="text-[28px] font-black tracking-tight">我的订阅</h2>
          <p className="text-gray-400 text-[14px] mt-1">管理你的所有订阅内容</p>
        </div>
        
        <div className="flex-1 flex flex-col items-center justify-center -mt-20">
          <div className="w-32 h-32 bg-[#1A2333] rounded-full flex items-center justify-center mb-8 shadow-2xl border border-gray-800/50">
            <div className="text-5xl">📺</div>
          </div>
          <h3 className="text-[20px] font-bold mb-2">暂无订阅</h3>
          <p className="text-gray-500 text-[14px] max-w-[200px] leading-relaxed mb-10">
            你还没有订阅任何剧集 快去发现喜欢的内容吧
          </p>
          <button 
            onClick={() => onNavigate('series')}
            className="px-10 py-4 bg-[#3B82F6] hover:bg-blue-600 text-white font-bold rounded-full shadow-lg shadow-blue-900/20 transition-all active:scale-[0.98] flex items-center space-x-2"
          >
            <span>🎬</span>
            <span>浏览剧集</span>
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen bg-[#0F172A] text-white p-6 pb-24">
      <header className="mb-8">
        <h2 className="text-[28px] font-black tracking-tight">我的订阅</h2>
        <p className="text-gray-400 text-[14px] mt-1">管理你的所有订阅内容</p>
      </header>

      {/* Active Subscriptions */}
      <section className="space-y-5 mb-10">
        <h4 className="text-[13px] font-bold text-gray-500 uppercase tracking-widest px-1">
          活跃订阅 ({activeSubs.length})
        </h4>
        
        {activeSubs.map(sub => (
          <div key={sub.id} className={`bg-[#1A2333] rounded-[2rem] p-5 border border-gray-800/50 shadow-xl relative overflow-hidden ${sub.status === 'expiring' ? 'ring-1 ring-orange-500/30' : ''}`}>
            {sub.status === 'expiring' && (
              <div className="flex items-center text-orange-500 text-[11px] font-bold mb-4">
                <span className="mr-1.5">⚠️</span> 即将到期
              </div>
            )}
            
            <div className="flex space-x-4 mb-5">
              <div className="w-20 h-20 rounded-2xl overflow-hidden flex-shrink-0 border border-white/5">
                <img src={sub.cover} className="w-full h-full object-cover" alt="" />
              </div>
              <div className="flex-1 flex flex-col justify-center">
                <div className="flex justify-between items-start">
                  <h3 className="text-[16px] font-bold leading-tight max-w-[140px]">{sub.title}</h3>
                  <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                    sub.status === 'active' ? 'bg-green-500/10 text-green-500' : 'bg-orange-500/10 text-orange-500'
                  }`}>
                    进行中
                  </span>
                </div>
                <p className="text-[12px] text-gray-500 mt-1.5">{sub.plan}</p>
                <div className="mt-3 flex items-center justify-between">
                  <span className="text-[11px] text-gray-400 font-medium">剩余 {sub.remainingDays} 天</span>
                  <span className="text-[11px] text-gray-600 font-bold">{sub.progress}%</span>
                </div>
                {/* Progress Bar */}
                <div className="h-1.5 w-full bg-gray-800 rounded-full mt-1.5 overflow-hidden">
                  <div 
                    className={`h-full rounded-full transition-all duration-1000 ${
                      sub.status === 'active' 
                        ? 'bg-gradient-to-r from-blue-600 to-purple-500' 
                        : 'bg-gradient-to-r from-orange-500 to-red-500'
                    }`}
                    style={{ width: `${sub.progress}%` }}
                  ></div>
                </div>
              </div>
            </div>

            <div className="flex space-x-3">
              <button className="flex-1 py-3 bg-[#252D3F] hover:bg-[#2D374D] text-gray-200 text-[13px] font-bold rounded-2xl border border-gray-700/50 transition-all flex items-center justify-center space-x-2">
                <span>👥</span>
                <span>进入群组</span>
              </button>
              <button className={`flex-1 py-3 text-white text-[13px] font-bold rounded-2xl shadow-lg transition-all flex items-center justify-center ${
                sub.status === 'active' 
                  ? 'bg-transparent border border-gray-700 text-gray-400 hover:bg-white/5' 
                  : 'bg-gradient-to-r from-orange-500 to-red-500 shadow-orange-900/20 active:scale-95'
              }`}>
                {sub.status === 'active' ? '续费订阅' : '立即续费'}
              </button>
            </div>
          </div>
        ))}
      </section>

      {/* Expired Subscriptions */}
      {expiredSubs.length > 0 && (
        <section className="space-y-4">
          <h4 className="text-[13px] font-bold text-gray-500 uppercase tracking-widest px-1">
            已过期 ({expiredSubs.length})
          </h4>
          
          {expiredSubs.map(sub => (
            <div key={sub.id} className="bg-[#1A2333]/40 rounded-3xl p-4 flex items-center space-x-4 border border-gray-800/30 opacity-60 group hover:opacity-100 transition-all cursor-pointer">
              <div className="w-14 h-14 rounded-xl overflow-hidden flex-shrink-0 grayscale">
                <img src={sub.cover} className="w-full h-full object-cover" alt="" />
              </div>
              <div className="flex-1">
                <h3 className="text-[14px] font-bold text-gray-300">{sub.title}</h3>
                <p className="text-[11px] text-gray-500 mt-1">已于 {sub.expireDate} 过期</p>
              </div>
              <span className="text-gray-600 group-hover:text-gray-400 transition-colors">❯</span>
            </div>
          ))}
        </section>
      )}

      {/* Fixed Bottom Action */}
      <div className="fixed bottom-0 left-0 right-0 p-6 bg-[#0F172A]/80 backdrop-blur-xl border-t border-gray-800/30 z-50">
        <button 
          onClick={() => onNavigate('series')}
          className="w-full py-4.5 bg-[#3B82F6] hover:bg-blue-600 text-white text-[16px] font-bold rounded-full shadow-lg shadow-blue-900/20 transition-all active:scale-[0.98] flex items-center justify-center space-x-2"
        >
          <span>🎬</span>
          <span>浏览更多剧集</span>
        </button>
      </div>
    </div>
  );
};

export default MySubscriptionsPage;
