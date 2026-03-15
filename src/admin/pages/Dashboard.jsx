import React from 'react';

const Dashboard = () => {
  const stats = [
    { label: '今日新增订阅', value: '128', icon: '📈', tone: 'from-indigo-500 to-cyan-400' },
    { label: '今日收入', value: '￥3,842.00', icon: '💰', tone: 'from-emerald-500 to-lime-400' },
    { label: '7日活跃用户', value: '1,204', icon: '🔥', tone: 'from-orange-500 to-amber-400' },
    { label: 'Top1 剧集订阅', value: '845', icon: '🏆', tone: 'from-violet-500 to-fuchsia-400' },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <div className="text-xl font-black text-slate-900">数据总览</div>
          <div className="text-sm text-slate-500 font-medium">关键指标与趋势概览（示例数据）</div>
        </div>
        <div className="flex items-center gap-2">
          <button className="h-10 px-4 rounded-xl bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 font-bold transition-colors">
            导出报表
          </button>
          <button className="h-10 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold transition-colors">
            刷新数据
          </button>
        </div>
      </div>

      <div className="grid grid-cols-4 gap-4">
        {stats.map((stat) => (
          <div
            key={stat.label}
            className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5"
          >
            <div className="flex items-center justify-between">
              <div className={`h-11 w-11 rounded-2xl bg-gradient-to-br ${stat.tone} flex items-center justify-center text-white text-xl`}>
                {stat.icon}
              </div>
              <div className="text-xs font-black text-emerald-600 bg-emerald-50 border border-emerald-200 px-2 py-1 rounded-lg">
                +12%
              </div>
            </div>
            <div className="mt-4 text-xs font-bold text-slate-500">{stat.label}</div>
            <div className="mt-1 text-2xl font-black text-slate-900">{stat.value}</div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div className="col-span-2 bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <div className="text-base font-black text-slate-900">收入趋势</div>
              <div className="text-xs text-slate-500 font-medium">最近 30 天（示例图）</div>
            </div>
            <select className="h-10 rounded-xl bg-slate-100 border border-slate-200 px-3 text-sm font-semibold text-slate-700 outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent">
              <option>最近 30 天</option>
              <option>最近 7 天</option>
            </select>
          </div>

          <div className="mt-6 h-64 flex items-end gap-1">
            {[40, 60, 45, 70, 55, 85, 65, 95, 75, 110, 80, 120, 100, 140, 110, 160, 130, 150, 140, 170].map((h, i) => (
              <div 
                key={i} 
                className="flex-1 bg-indigo-500/10 hover:bg-indigo-500/20 rounded-t-md transition-colors group relative"
                style={{ height: `${h}%` }}
              >
                <div className="absolute -top-10 left-1/2 -translate-x-1/2 bg-slate-900 text-white text-[10px] font-bold py-1 px-2 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                  ￥{h * 20}
                </div>
              </div>
            ))}
          </div>

          <div className="mt-4 flex items-center justify-between text-[10px] text-slate-400 font-mono">
            <span>03/01</span>
            <span>03/10</span>
            <span>03/20</span>
            <span>03/30</span>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <div className="text-base font-black text-slate-900">热门剧集占比</div>
              <div className="text-xs text-slate-500 font-medium">按订阅量（示例）</div>
            </div>
            <button className="h-10 px-3 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold transition-colors">
              查看详情
            </button>
          </div>

          <div className="mt-6 space-y-5">
            {[
              { name: '重生之我是大魔王', percentage: 45, color: 'bg-indigo-500' },
              { name: '校园恋爱物语', percentage: 25, color: 'bg-emerald-500' },
              { name: '星际争霸：破晓', percentage: 15, color: 'bg-orange-500' },
              { name: '其他', percentage: 15, color: 'bg-slate-400' },
            ].map((item) => (
              <div key={item.name} className="space-y-2">
                <div className="flex items-center justify-between gap-3">
                  <span className="text-sm font-bold text-slate-800 truncate">{item.name}</span>
                  <span className="text-sm font-black text-slate-900">{item.percentage}%</span>
                </div>
                <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                  <div 
                    className={`h-full ${item.color} rounded-full`} 
                    style={{ width: `${item.percentage}%` }}
                  ></div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
