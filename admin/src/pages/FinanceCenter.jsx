import React, { useEffect, useMemo, useState } from 'react';
import { apiFetchJson } from '../utils/api';

const FinanceCenter = () => {
  const [rangeDays, setRangeDays] = useState(30);
  const [finance, setFinance] = useState(null);
  const [daily, setDaily] = useState([]);
  const [seriesMap, setSeriesMap] = useState({});
  const [error, setError] = useState('');

  const refresh = async () => {
    try {
      setError('');
      const [f, d, s] = await Promise.all([
        apiFetchJson('/api/admin/stats/finance'),
        apiFetchJson(`/api/admin/stats/daily?limit=${encodeURIComponent(rangeDays)}`),
        apiFetchJson('/api/admin/series'),
      ]);
      setFinance(f);
      setDaily(Array.isArray(d?.items) ? d.items : []);
      const items = Array.isArray(s?.items) ? s.items : [];
      const map = {};
      for (const it of items) {
        if (it?.id) map[it.id] = it.title || it.id;
      }
      setSeriesMap(map);
    } catch (e) {
      setError(e?.message || '加载失败');
      setFinance(null);
      setDaily([]);
    }
  };

  useEffect(() => {
    refresh();
  }, [rangeDays]);

  const totalRevenue = Number(finance?.totalRevenueCny || 0) || 0;
  const totalOrders = Number(finance?.totalOrders || 0) || 0;
  const avg = totalOrders ? totalRevenue / totalOrders : 0;
  const alipay = finance?.byMethod?.alipay || { amountCny: 0, orders: 0 };

  const lastDaily = daily.length ? daily[daily.length - 1] : null;
  const topSeries = useMemo(() => {
    const bySeries = lastDaily?.finance?.bySeries || {};
    const entries = Object.entries(bySeries)
      .map(([id, v]) => ({
        id,
        title: seriesMap[id] || id,
        amountCny: Number(v?.amountCny || 0) || 0,
        orders: Number(v?.orders || 0) || 0,
      }))
      .filter((x) => x.amountCny > 0 || x.orders > 0)
      .sort((a, b) => b.amountCny - a.amountCny)
      .slice(0, 20);
    return entries;
  }, [lastDaily, seriesMap]);

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div className="space-y-1">
          <div className="text-sm text-slate-500 font-semibold">财务中心</div>
          <div className="text-lg font-black text-slate-900">流水与趋势</div>
        </div>
        <div className="flex items-center gap-2">
          <select
            value={rangeDays}
            onChange={(e) => setRangeDays(Number(e.target.value))}
            className="h-10 px-3 rounded-xl bg-slate-100 border border-slate-200 text-sm font-semibold outline-none focus:ring-2 focus:ring-slate-900/20 focus:border-slate-300"
          >
            <option value={7}>近7天</option>
            <option value={30}>近30天</option>
            <option value={90}>近90天</option>
          </select>
          <button onClick={refresh} className="h-10 px-4 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold transition-colors">
            刷新
          </button>
        </div>
      </div>

      {error && (
        <div className="bg-rose-50 border border-rose-200 text-rose-700 text-sm font-semibold rounded-2xl p-4">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
          <div className="text-xs font-bold text-slate-500">累计收入</div>
          <div className="mt-2 text-2xl font-black text-slate-900">￥{totalRevenue.toFixed(2)}</div>
          <div className="mt-2 text-xs text-slate-500 font-semibold">支付成功订单：{totalOrders}</div>
        </div>
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
          <div className="text-xs font-bold text-slate-500">支付宝收入</div>
          <div className="mt-2 text-2xl font-black text-slate-900">￥{Number(alipay.amountCny || 0).toFixed(2)}</div>
          <div className="mt-2 text-xs text-slate-500 font-semibold">支付宝订单：{Number(alipay.orders || 0) || 0}</div>
        </div>
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
          <div className="text-xs font-bold text-slate-500">平均订单金额</div>
          <div className="mt-2 text-2xl font-black text-slate-900">￥{avg.toFixed(2)}</div>
          <div className="mt-2 text-xs text-slate-500 font-semibold">按历史支付成功订单计算</div>
        </div>
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
          <div className="text-xs font-bold text-slate-500">最近统计日期</div>
          <div className="mt-2 text-2xl font-black text-slate-900">{lastDaily?.date || '--'}</div>
          <div className="mt-2 text-xs text-slate-500 font-semibold">可在系统设置重算今日统计</div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <div className="text-base font-black text-slate-900">每日流水</div>
              <div className="text-xs text-slate-500 font-medium">最近 {rangeDays} 天</div>
            </div>
            <div className="text-xs font-bold text-slate-500 bg-slate-50 border border-slate-200 px-2 py-1 rounded-lg">按日聚合</div>
          </div>
          <div className="mt-5 space-y-3">
            {daily.length === 0 ? (
              <div className="text-sm text-slate-500 font-semibold">暂无数据</div>
            ) : (
              daily.slice(-14).reverse().map((d) => (
                <div key={d.date} className="flex items-center justify-between">
                  <div className="text-sm font-semibold text-slate-700">{d.date}</div>
                  <div className="flex items-center gap-4">
                    <div className="text-sm font-black text-slate-900">￥{Number(d?.finance?.revenueCny || 0).toFixed(2)}</div>
                    <div className="text-xs text-slate-500 font-semibold">{Number(d?.finance?.ordersPaid || 0) || 0} 单</div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <div className="text-base font-black text-slate-900">单漫剧流水</div>
              <div className="text-xs text-slate-500 font-medium">按最近统计日</div>
            </div>
            <div className="text-xs font-bold text-slate-500 bg-slate-50 border border-slate-200 px-2 py-1 rounded-lg">{lastDaily?.date || '--'}</div>
          </div>

          <div className="mt-5 overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-slate-50 text-slate-500 text-xs font-black uppercase tracking-wider">
                <tr>
                  <th className="px-4 py-3">漫剧</th>
                  <th className="px-4 py-3">流水</th>
                  <th className="px-4 py-3">订单</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {topSeries.length === 0 ? (
                  <tr>
                    <td className="px-4 py-5 text-sm text-slate-500 font-semibold" colSpan={3}>暂无数据</td>
                  </tr>
                ) : (
                  topSeries.map((s) => (
                    <tr key={s.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-4 py-4 text-sm font-bold text-slate-900 truncate">{s.title}</td>
                      <td className="px-4 py-4 text-sm font-black text-slate-900">￥{Number(s.amountCny || 0).toFixed(2)}</td>
                      <td className="px-4 py-4 text-sm text-slate-600 font-semibold">{s.orders}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};

export default FinanceCenter;
