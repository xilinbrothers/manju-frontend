import React, { useEffect, useMemo, useState } from 'react';
import { apiFetchJson } from '../utils/api';
import AlertBar from '../components/AlertBar';
import Button from '../components/ui/Button';
import Card from '../components/ui/Card';
import PageHeader from '../components/ui/PageHeader';

const Dashboard = () => {
  const [userStats, setUserStats] = useState(null);
  const [financeStats, setFinanceStats] = useState(null);
  const [dailyStats, setDailyStats] = useState([]);
  const [seriesMap, setSeriesMap] = useState({});
  const [error, setError] = useState('');
  const [rangeDays, setRangeDays] = useState(30);

  const refresh = async () => {
    try {
      setError('');
      const [u, f, s] = await Promise.all([
        apiFetchJson('/api/admin/stats/users'),
        apiFetchJson('/api/admin/stats/finance'),
        apiFetchJson('/api/admin/series'),
      ]);
      setUserStats(u);
      setFinanceStats(f);
      const items = Array.isArray(s?.items) ? s.items : [];
      const map = {};
      for (const it of items) {
        if (it?.id) map[it.id] = it.title || it.id;
      }
      setSeriesMap(map);
    } catch (e) {
      setError(e?.message || '加载失败');
    }
  };

  const refreshDaily = async (days) => {
    try {
      const resp = await apiFetchJson(`/api/admin/stats/daily?limit=${encodeURIComponent(days)}`);
      const items = Array.isArray(resp?.items) ? resp.items : [];
      setDailyStats(items);
    } catch {
      setDailyStats([]);
    }
  };

  useEffect(() => {
    refresh();
  }, []);

  useEffect(() => {
    refreshDaily(rangeDays);
  }, [rangeDays]);

  const stats = [
    { label: '累计用户数', value: String(userStats?.totalUsers ?? '--'), icon: '👤', tone: 'from-indigo-500 to-cyan-400' },
    { label: '7日活跃用户', value: String(userStats?.activeUsers7d ?? '--'), icon: '🔥', tone: 'from-orange-500 to-amber-400' },
    { label: '今日新增用户', value: String(userStats?.newUsersToday ?? '--'), icon: '📈', tone: 'from-violet-500 to-fuchsia-400' },
    { label: '累计收入', value: financeStats ? `￥${Number(financeStats.totalRevenueCny || 0).toFixed(2)}` : '--', icon: '💰', tone: 'from-emerald-500 to-lime-400' },
  ];

  const revenueBars = useMemo(() => {
    const list = Array.isArray(dailyStats) ? dailyStats : [];
    const values = list.map((d) => Number(d?.finance?.revenueCny || 0) || 0);
    const max = Math.max(1, ...values);
    return list.map((d, i) => {
      const v = values[i];
      const pct = Math.max(2, Math.round((v / max) * 100));
      return { date: d.date, value: v, heightPct: pct };
    });
  }, [dailyStats]);

  const topSeries = useMemo(() => {
    const last = Array.isArray(dailyStats) && dailyStats.length > 0 ? dailyStats[dailyStats.length - 1] : null;
    const bySeries = last?.finance?.bySeries || {};
    const entries = Object.entries(bySeries)
      .map(([seriesId, v]) => ({
        id: seriesId,
        title: seriesMap[seriesId] || seriesId,
        amountCny: Number(v?.amountCny || 0) || 0,
      }))
      .filter((x) => x.amountCny > 0)
      .sort((a, b) => b.amountCny - a.amountCny);

    const total = entries.reduce((s, x) => s + x.amountCny, 0) || 0;
    const top = entries.slice(0, 3).map((x) => ({
      ...x,
      percentage: total ? Math.round((x.amountCny / total) * 100) : 0,
    }));
    const otherSum = entries.slice(3).reduce((s, x) => s + x.amountCny, 0);
    if (otherSum > 0) {
      top.push({
        id: 'other',
        title: '其他',
        amountCny: otherSum,
        percentage: total ? Math.max(1, 100 - top.reduce((s, x) => s + x.percentage, 0)) : 0,
      });
    }

    const colors = ['bg-indigo-500', 'bg-emerald-500', 'bg-orange-500', 'bg-slate-400'];
    return top.map((x, idx) => ({ ...x, color: colors[idx] || 'bg-slate-400' }));
  }, [dailyStats, seriesMap]);

  return (
    <div className="space-y-7">
      <PageHeader
        title="概览"
        subtitle="仪表盘"
        right={
          <Button
            variant="neutral"
            onClick={() => {
              refresh();
              refreshDaily(rangeDays);
            }}
          >
            刷新数据
          </Button>
        }
      />

      {error && (
        <AlertBar type="error" message={error} />
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-6">
        {stats.map((stat) => (
          <Card key={stat.label} className="p-6">
            <div className="flex items-center justify-between">
              <div className={`h-11 w-11 rounded-2xl bg-gradient-to-br ${stat.tone} flex items-center justify-center text-white text-xl shadow-sm`}>
                {stat.icon}
              </div>
              <div className="text-xs font-black text-slate-500 bg-slate-50 border border-slate-200 px-2 py-1 rounded-lg">实时</div>
            </div>
            <div className="mt-4 text-xs font-bold text-slate-500">{stat.label}</div>
            <div className="mt-1 text-2xl font-black text-slate-900">{stat.value}</div>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <div className="text-base font-black text-slate-900">收入趋势</div>
              <div className="text-xs text-slate-500 font-medium">最近 {rangeDays} 天</div>
            </div>
            <select
              value={rangeDays}
              onChange={(e) => setRangeDays(Number(e.target.value))}
              className="h-10 rounded-xl bg-slate-100 border border-slate-200 px-3 text-sm font-semibold text-slate-700 outline-none focus:ring-2 focus:ring-slate-900/20 focus:border-slate-300"
            >
              <option value={30}>最近 30 天</option>
              <option value={7}>最近 7 天</option>
            </select>
          </div>

          <div className="mt-6 h-64 flex items-end gap-1">
            {revenueBars.length === 0 ? (
              <div className="w-full h-full flex items-center justify-center text-sm text-slate-500 font-semibold">
                暂无趋势数据（需要启用 MongoDB 并累计订单/用户数据）
              </div>
            ) : (
              revenueBars.map((b) => (
                <div
                  key={b.date}
                  className="flex-1 bg-indigo-500/10 hover:bg-indigo-500/20 rounded-t-md transition-colors group relative"
                  style={{ height: `${b.heightPct}%` }}
                >
                  <div className="absolute -top-10 left-1/2 -translate-x-1/2 bg-slate-900 text-white text-[10px] font-bold py-1 px-2 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                    {b.date} ￥{Number(b.value || 0).toFixed(2)}
                  </div>
                </div>
              ))
            )}
          </div>

          <div className="mt-4 flex items-center justify-between text-[10px] text-slate-400 font-mono">
            {revenueBars.length > 0 ? (
              <>
                <span>{revenueBars[0].date.slice(5).replace('-', '/')}</span>
                <span>{revenueBars[Math.floor(revenueBars.length / 2)].date.slice(5).replace('-', '/')}</span>
                <span>{revenueBars[revenueBars.length - 1].date.slice(5).replace('-', '/')}</span>
              </>
            ) : (
              <>
                <span>--/--</span>
                <span>--/--</span>
                <span>--/--</span>
              </>
            )}
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <div className="text-base font-black text-slate-900">用户增长趋势</div>
              <div className="text-xs text-slate-500 font-medium">最近 {rangeDays} 天</div>
            </div>
            <div className="text-xs font-bold text-slate-500 bg-slate-50 border border-slate-200 px-2 py-1 rounded-lg">按新增</div>
          </div>

          <div className="mt-6 h-64 flex items-end gap-1">
            {dailyStats.length === 0 ? (
              <div className="w-full h-full flex items-center justify-center text-sm text-slate-500 font-semibold">
                暂无趋势数据
              </div>
            ) : (
              dailyStats.map((d) => {
                const v = Number(d?.users?.newUsers || 0) || 0;
                const max = Math.max(1, ...dailyStats.map((x) => Number(x?.users?.newUsers || 0) || 0));
                const pct = Math.max(2, Math.round((v / max) * 100));
                return (
                  <div
                    key={d.date}
                    className="flex-1 bg-slate-900/10 hover:bg-slate-900/15 rounded-t-md transition-colors group relative"
                    style={{ height: `${pct}%` }}
                  >
                    <div className="absolute -top-10 left-1/2 -translate-x-1/2 bg-slate-900 text-white text-[10px] font-bold py-1 px-2 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                      {d.date} +{v}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </Card>
      </div>
    </div>
  );
};

export default Dashboard;
