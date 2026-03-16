import React, { useState } from 'react';

const FinanceCenter = () => {
  const [timeRange, setTimeRange] = useState('today');

  // 财务统计数据（示例）
  const financeStats = {
    todayTotal: 12800,
    todayOrders: 45,
    totalRevenue: 328000,
    totalOrders: 1250,
    paymentMethodStats: {
      stars: { amount: 120000, orders: 450, percentage: '36.6%' },
      usdt: { amount: 108000, orders: 400, percentage: '32.9%' },
      alipay: { amount: 100000, orders: 400, percentage: '30.5%' }
    },
    seriesStats: [
      { name: '重生之我是大魔王', revenue: 120000, orders: 450 },
      { name: '校园恋爱物语', revenue: 100000, orders: 380 },
      { name: '星际争霸：破晓', revenue: 108000, orders: 420 }
    ],
    dailyStats: [
      { date: '3/10', amount: 8500, orders: 30 },
      { date: '3/11', amount: 9200, orders: 32 },
      { date: '3/12', amount: 10500, orders: 38 },
      { date: '3/13', amount: 7800, orders: 28 },
      { date: '3/14', amount: 11000, orders: 40 },
      { date: '3/15', amount: 12800, orders: 45 },
      { date: '3/16', amount: 9500, orders: 35 }
    ]
  };

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div className="space-y-1">
          <div className="text-xl font-black text-slate-900">财务中心</div>
          <div className="text-sm text-slate-500 font-medium">查看流水统计与支付方式占比（示例数据）</div>
        </div>
        <div className="flex items-center gap-2">
          <select 
            value={timeRange} 
            onChange={(e) => setTimeRange(e.target.value)}
            className="h-10 px-4 rounded-xl bg-slate-100 border border-slate-200 text-sm font-medium outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
          >
            <option value="today">今日</option>
            <option value="yesterday">昨日</option>
            <option value="7d">近7天</option>
            <option value="30d">近30天</option>
            <option value="custom">自定义</option>
          </select>
          <button className="h-10 px-4 rounded-xl bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 font-bold transition-colors">
            导出
          </button>
        </div>
      </div>

      {/* 财务概览 */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
          <div className="text-sm font-medium text-slate-500">当日总流水</div>
          <div className="text-2xl font-black text-slate-900 mt-1">¥{financeStats.todayTotal.toLocaleString()}</div>
          <div className="text-xs text-emerald-600 font-bold mt-2">订单数: {financeStats.todayOrders}</div>
        </div>
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
          <div className="text-sm font-medium text-slate-500">总流水</div>
          <div className="text-2xl font-black text-slate-900 mt-1">¥{financeStats.totalRevenue.toLocaleString()}</div>
          <div className="text-xs text-emerald-600 font-bold mt-2">总订单数: {financeStats.totalOrders}</div>
        </div>
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
          <div className="text-sm font-medium text-slate-500">平均订单金额</div>
          <div className="text-2xl font-black text-slate-900 mt-1">¥{Math.round(financeStats.totalRevenue / financeStats.totalOrders).toLocaleString()}</div>
          <div className="text-xs text-emerald-600 font-bold mt-2">单均消费</div>
        </div>
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
          <div className="text-sm font-medium text-slate-500">支付成功率</div>
          <div className="text-2xl font-black text-slate-900 mt-1">98.5%</div>
          <div className="text-xs text-emerald-600 font-bold mt-2">近30天</div>
        </div>
      </div>

      {/* 支付方式占比 */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
        <div className="text-base font-black text-slate-900 mb-4">支付方式占比</div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="bg-blue-50 rounded-xl p-4">
            <div className="flex items-center justify-between">
              <div className="text-sm font-medium text-blue-700">Telegram Stars</div>
              <div className="text-sm font-black text-blue-900">{financeStats.paymentMethodStats.stars.percentage}</div>
            </div>
            <div className="text-xl font-black text-blue-900 mt-1">¥{financeStats.paymentMethodStats.stars.amount.toLocaleString()}</div>
            <div className="text-xs text-blue-600 font-bold mt-1">{financeStats.paymentMethodStats.stars.orders} 订单</div>
          </div>
          <div className="bg-green-50 rounded-xl p-4">
            <div className="flex items-center justify-between">
              <div className="text-sm font-medium text-green-700">USDT</div>
              <div className="text-sm font-black text-green-900">{financeStats.paymentMethodStats.usdt.percentage}</div>
            </div>
            <div className="text-xl font-black text-green-900 mt-1">¥{financeStats.paymentMethodStats.usdt.amount.toLocaleString()}</div>
            <div className="text-xs text-green-600 font-bold mt-1">{financeStats.paymentMethodStats.usdt.orders} 订单</div>
          </div>
          <div className="bg-indigo-50 rounded-xl p-4">
            <div className="flex items-center justify-between">
              <div className="text-sm font-medium text-indigo-700">支付宝</div>
              <div className="text-sm font-black text-indigo-900">{financeStats.paymentMethodStats.alipay.percentage}</div>
            </div>
            <div className="text-xl font-black text-indigo-900 mt-1">¥{financeStats.paymentMethodStats.alipay.amount.toLocaleString()}</div>
            <div className="text-xs text-indigo-600 font-bold mt-1">{financeStats.paymentMethodStats.alipay.orders} 订单</div>
          </div>
        </div>
      </div>

      {/* 单剧集流水 */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
        <div className="text-base font-black text-slate-900 mb-4">单剧集流水</div>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-slate-50 text-slate-500 text-xs font-black uppercase tracking-wider">
              <tr>
                <th className="px-6 py-4">剧集名称</th>
                <th className="px-6 py-4">流水金额</th>
                <th className="px-6 py-4">订单数</th>
                <th className="px-6 py-4">占比</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {financeStats.seriesStats.map((series, index) => (
                <tr key={index} className="hover:bg-slate-50 transition-colors">
                  <td className="px-6 py-5 text-sm font-black text-slate-900">{series.name}</td>
                  <td className="px-6 py-5 text-sm font-black text-slate-900">¥{series.revenue.toLocaleString()}</td>
                  <td className="px-6 py-5 text-sm text-slate-600 font-medium">{series.orders}</td>
                  <td className="px-6 py-5 text-sm text-slate-600 font-medium">{Math.round(series.revenue / financeStats.totalRevenue * 100)}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* 每日流水趋势 */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
        <div className="text-base font-black text-slate-900 mb-4">每日流水趋势</div>
        <div className="space-y-4">
          {financeStats.dailyStats.map((day, index) => (
            <div key={index} className="flex items-center justify-between">
              <div className="text-sm font-medium text-slate-700">{day.date}</div>
              <div className="flex items-center gap-4">
                <div className="text-sm font-black text-slate-900">¥{day.amount.toLocaleString()}</div>
                <div className="text-xs text-slate-500 font-medium">{day.orders} 订单</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default FinanceCenter;