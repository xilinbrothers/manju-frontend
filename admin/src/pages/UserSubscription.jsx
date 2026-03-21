import React, { useState } from 'react';
import Button from '../components/ui/Button';
import Card from '../components/ui/Card';
import PageHeader from '../components/ui/PageHeader';

const UserSubscription = () => {
  const [activeTab, setActiveTab] = useState('users');
  const [timeRange, setTimeRange] = useState('7d');

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

  // 统计数据（示例）
  const stats = {
    totalUsers: 1250,
    activeUsers: 890,
    newUsers: 120,
    totalSubscribers: 580,
    repurchaseRate: '35%',
    statusStats: {
      active: 420,
      expiring: 80,
      expired: 60,
      unsubscribed: 670
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="用户与订阅"
        subtitle="查看用户活跃与订阅记录（示例数据）"
        right={
          <>
            <select
              value={timeRange}
              onChange={(e) => setTimeRange(e.target.value)}
              className="h-10 px-4 rounded-xl bg-slate-100 border border-slate-200 text-sm font-medium outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            >
              <option value="7d">近7天</option>
              <option value="30d">近30天</option>
              <option value="90d">近90天</option>
              <option value="custom">自定义</option>
            </select>
            <Button variant="ghost">导出</Button>
            <Button>新增订阅</Button>
          </>
        }
      />

      {/* 统计概览 */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="p-6">
          <div className="text-sm font-medium text-slate-500">总用户数</div>
          <div className="text-2xl font-black text-slate-900 mt-1">{stats.totalUsers}</div>
          <div className="text-xs text-emerald-600 font-bold mt-2">↗ +12.5% 较上月</div>
        </Card>
        <Card className="p-6">
          <div className="text-sm font-medium text-slate-500">活跃用户数</div>
          <div className="text-2xl font-black text-slate-900 mt-1">{stats.activeUsers}</div>
          <div className="text-xs text-emerald-600 font-bold mt-2">↗ +8.3% 较上月</div>
        </Card>
        <Card className="p-6">
          <div className="text-sm font-medium text-slate-500">总订阅用户数</div>
          <div className="text-2xl font-black text-slate-900 mt-1">{stats.totalSubscribers}</div>
          <div className="text-xs text-emerald-600 font-bold mt-2">↗ +5.2% 较上月</div>
        </Card>
        <Card className="p-6">
          <div className="text-sm font-medium text-slate-500">复购率</div>
          <div className="text-2xl font-black text-slate-900 mt-1">{stats.repurchaseRate}</div>
          <div className="text-xs text-emerald-600 font-bold mt-2">↗ +2.1% 较上月</div>
        </Card>
      </div>

      {/* 订阅状态占比 */}
      <Card className="p-6">
        <div className="text-base font-black text-slate-900 mb-4">订阅状态分布</div>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-emerald-50 rounded-xl p-4">
            <div className="text-sm font-medium text-emerald-700">已订阅</div>
            <div className="text-xl font-black text-emerald-900 mt-1">{stats.statusStats.active}</div>
            <div className="text-xs text-emerald-600 font-bold mt-1">{Math.round(stats.statusStats.active / stats.totalUsers * 100)}%</div>
          </div>
          <div className="bg-amber-50 rounded-xl p-4">
            <div className="text-sm font-medium text-amber-700">即将到期</div>
            <div className="text-xl font-black text-amber-900 mt-1">{stats.statusStats.expiring}</div>
            <div className="text-xs text-amber-600 font-bold mt-1">{Math.round(stats.statusStats.expiring / stats.totalUsers * 100)}%</div>
          </div>
          <div className="bg-rose-50 rounded-xl p-4">
            <div className="text-sm font-medium text-rose-700">已到期</div>
            <div className="text-xl font-black text-rose-900 mt-1">{stats.statusStats.expired}</div>
            <div className="text-xs text-rose-600 font-bold mt-1">{Math.round(stats.statusStats.expired / stats.totalUsers * 100)}%</div>
          </div>
          <div className="bg-slate-50 rounded-xl p-4">
            <div className="text-sm font-medium text-slate-700">未订阅</div>
            <div className="text-xl font-black text-slate-900 mt-1">{stats.statusStats.unsubscribed}</div>
            <div className="text-xs text-slate-600 font-bold mt-1">{Math.round(stats.statusStats.unsubscribed / stats.totalUsers * 100)}%</div>
          </div>
        </div>
      </Card>

      <Card className="overflow-hidden">
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
                  <Button variant="secondary" size="sm">详情</Button>
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
                      : s.status === '即将到期'
                      ? 'bg-amber-50 text-amber-700 border-amber-200'
                      : 'bg-rose-50 text-rose-700 border-rose-200'
                  }`}>
                    {s.status}
                  </span>
                </td>
                <td className="px-8 py-5 text-right text-sm">
                   <Button variant="secondary" size="sm" className="mr-2">延长</Button>
                   <Button variant="danger" size="sm">作废</Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
      </Card>
    </div>
  );
};

export default UserSubscription;
