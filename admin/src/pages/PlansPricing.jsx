import React from 'react';

const PlansPricing = () => {
  const plans = [
    { id: '30days', name: '订阅30天', days: 30, price: '29.90', enabled: true },
    { id: '90days', name: '订阅90天', days: 90, price: '79.90', enabled: true },
    { id: 'yearly', name: '订阅年度', days: 365, price: '269.90', enabled: true },
    { id: 'full', name: '订阅整部剧', days: '永久', price: '99.90', enabled: true },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div className="space-y-1">
          <div className="text-xl font-black text-slate-900">套餐与定价</div>
          <div className="text-sm text-slate-500 font-medium">配置全局默认套餐（示例数据）</div>
        </div>
        <button className="h-10 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold transition-colors">
          新增套餐
        </button>
      </div>

      <div className="bg-indigo-50 border border-indigo-200 rounded-2xl p-5">
        <div className="text-sm font-black text-indigo-800">说明</div>
        <div className="mt-1 text-sm text-indigo-700 font-medium leading-relaxed">
          各剧集可使用全局默认套餐，或在剧集编辑页覆盖为独立价格。禁用全局套餐将使其在所有剧集中不可见（除非有独立覆盖）。
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <table className="w-full text-left">
          <thead className="bg-slate-50 text-slate-500 text-xs font-black uppercase tracking-wider">
            <tr>
              <th className="px-8 py-5">套餐名称</th>
              <th className="px-8 py-5">时长 (天数)</th>
              <th className="px-8 py-5">默认价格 (￥)</th>
              <th className="px-8 py-5">启用状态</th>
              <th className="px-8 py-5 text-right">操作</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200">
            {plans.map((plan) => (
              <tr key={plan.id} className="hover:bg-slate-50 transition-colors">
                <td className="px-8 py-5">
                  <input 
                    type="text" 
                    defaultValue={plan.name} 
                    className="w-full bg-transparent border-none font-black text-slate-900 focus:ring-2 focus:ring-indigo-500 rounded-lg px-2 -ml-2"
                  />
                </td>
                <td className="px-8 py-5">
                  <input 
                    type="text" 
                    defaultValue={plan.days} 
                    className="bg-transparent border-none text-sm text-slate-700 font-semibold focus:ring-2 focus:ring-indigo-500 rounded-lg px-2 -ml-2 w-24"
                  />
                </td>
                <td className="px-8 py-5">
                  <input 
                    type="text" 
                    defaultValue={plan.price} 
                    className="bg-transparent border-none text-sm font-mono text-indigo-700 font-bold focus:ring-2 focus:ring-indigo-500 rounded-lg px-2 -ml-2 w-28"
                  />
                </td>
                <td className="px-8 py-5">
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input type="checkbox" className="sr-only peer" defaultChecked={plan.enabled} />
                    <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-500"></div>
                  </label>
                </td>
                <td className="px-8 py-5 text-right">
                  <button className="h-9 px-3 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-sm transition-colors">
                    保存
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="flex justify-end">
        <button className="h-11 px-6 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold transition-colors">
          保存全局配置
        </button>
      </div>
    </div>
  );
};

export default PlansPricing;
