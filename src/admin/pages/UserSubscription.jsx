import React, { useState } from 'react';

const UserSubscription = () => {
  const [activeTab, setActiveTab] = useState('users');

  const users = [
    { id: '12345678', username: '@alex_dev', lastActive: '2026-03-15 10:30', totalSubs: 3 },
    { id: '87654321', username: '@sarah_k', lastActive: '2026-03-14 22:15', totalSubs: 1 },
    { id: '55667788', username: '@mike_01', lastActive: '2026-03-15 08:45', totalSubs: 5 },
  ];

  const subscriptions = [
    { user: '@alex_dev', series: '重生之我是大魔王', plan: '30天订阅', start: '2026-03-15', end: '2026-04-15', status: '生效中', method: 'USDT' },
    { user: '@sarah_k', series: '校园恋爱物语', plan: '年度订阅', start: '2026-03-10', end: '2027-03-10', status: '生效中', method: '支付宝' },
    { user: '@mike_01', series: '星际争霸：破晓', plan: '90天订阅', start: '2025-12-01', end: '2026-03-01', status: '已过期', method: 'USDT' },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div className="space-y-1">
          <div className="text-xl font-black text-slate-900">用户与订阅</div>
          <div className="text-sm text-slate-500 font-medium">查看用户活跃与订阅记录（示例数据）</div>
        </div>
        <div className="flex items-center gap-2">
          <button className="h-10 px-4 rounded-xl bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 font-bold transition-colors">
            导出
          </button>
          <button className="h-10 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold transition-colors">
            新增订阅
          </button>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
          <div className="flex items-center gap-2 bg-slate-100 border border-slate-200 rounded-2xl p-1">
            <button 
              onClick={() => setActiveTab('users')}
              className={`h-9 px-4 rounded-xl text-sm font-black transition-colors ${
                activeTab === 'users' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              用户列表
            </button>
            <button 
              onClick={() => setActiveTab('subs')}
              className={`h-9 px-4 rounded-xl text-sm font-black transition-colors ${
                activeTab === 'subs' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              订阅记录
            </button>
          </div>

          <input
            type="text"
            placeholder="搜索用户 / 剧集 / 订单"
            className="w-[360px] h-10 rounded-xl bg-slate-100 border border-slate-200 px-4 text-sm font-medium outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
          />
        </div>

      {activeTab === 'users' ? (
        <table className="w-full text-left">
          <thead className="bg-slate-50 text-slate-500 text-xs font-black uppercase tracking-wider">
            <tr>
              <th className="px-8 py-5">TG 用户 ID</th>
              <th className="px-8 py-5">用户名</th>
              <th className="px-8 py-5">最近活跃时间</th>
              <th className="px-8 py-5">订阅总数</th>
              <th className="px-8 py-5 text-right">操作</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200">
            {users.map((u) => (
              <tr key={u.id} className="hover:bg-slate-50 transition-colors">
                <td className="px-8 py-5 text-sm font-mono text-slate-400">{u.id}</td>
                <td className="px-8 py-5 text-sm font-black text-slate-900">{u.username}</td>
                <td className="px-8 py-5 text-sm text-slate-600 font-medium">{u.lastActive}</td>
                <td className="px-8 py-5 text-sm font-black text-indigo-700">{u.totalSubs}</td>
                <td className="px-8 py-5 text-right text-sm">
                  <button className="h-9 px-3 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-sm transition-colors">
                    详情
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : (
        <table className="w-full text-left">
          <thead className="bg-slate-50 text-slate-500 text-xs font-black uppercase tracking-wider">
            <tr>
              <th className="px-8 py-5">用户</th>
              <th className="px-8 py-5">剧集</th>
              <th className="px-8 py-5">套餐</th>
              <th className="px-8 py-5">有效期</th>
              <th className="px-8 py-5">状态</th>
              <th className="px-8 py-5 text-right">操作</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200">
            {subscriptions.map((s, i) => (
              <tr key={i} className="hover:bg-slate-50 transition-colors">
                <td className="px-8 py-5 text-sm font-black text-slate-900">{s.user}</td>
                <td className="px-8 py-5 text-sm text-slate-800 font-semibold">{s.series}</td>
                <td className="px-8 py-5 text-sm text-slate-600 font-medium">{s.plan}</td>
                <td className="px-8 py-5 text-xs text-slate-500 font-mono">
                  {s.start} 至 {s.end}
                </td>
                <td className="px-8 py-5">
                  <span className={`inline-flex items-center px-2.5 py-1 rounded-lg text-[11px] font-black border ${
                    s.status === '生效中'
                      ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                      : 'bg-rose-50 text-rose-700 border-rose-200'
                  }`}>
                    {s.status}
                  </span>
                </td>
                <td className="px-8 py-5 text-right text-sm">
                   <button className="h-9 px-3 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-sm transition-colors mr-2">延长</button>
                   <button className="h-9 px-3 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 font-bold text-sm transition-colors">作废</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
      </div>
    </div>
  );
};

export default UserSubscription;
