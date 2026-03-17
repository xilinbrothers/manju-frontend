import React, { useEffect, useState } from 'react';
import { apiFetchJson } from '../utils/api';

const SystemSettings = () => {
  const [draft, setDraft] = useState({
    expiringDays: 7,
    schedulerEnabled: true,
    supportLink: '',
    welcomeMessage: '',
  });
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  const refresh = async () => {
    try {
      setError('');
      setIsLoading(true);
      const data = await apiFetchJson('/api/admin/settings');
      setDraft({
        expiringDays: Number(data?.settings?.expiringDays || 7),
        schedulerEnabled: Boolean(data?.settings?.schedulerEnabled),
        supportLink: data?.settings?.supportLink || '',
        welcomeMessage: data?.settings?.welcomeMessage || '',
      });
    } catch (e) {
      setError(e?.message || '加载失败');
    } finally {
      setIsLoading(false);
    }
  };

  const save = async () => {
    try {
      setError('');
      await apiFetchJson('/api/admin/settings', { method: 'POST', body: JSON.stringify(draft) });
      alert('已保存');
      refresh();
    } catch (e) {
      setError(e?.message || '保存失败');
    }
  };

  useEffect(() => {
    refresh();
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div className="space-y-1">
          <div className="text-xl font-black text-slate-900">系统设置</div>
          <div className="text-sm text-slate-500 font-medium">到期判定、定时任务与欢迎文案</div>
        </div>
        <button onClick={save} className="h-10 px-4 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold transition-colors">
          保存
        </button>
      </div>

      {error && (
        <div className="bg-rose-50 border border-rose-200 text-rose-700 text-sm font-semibold rounded-2xl p-4">
          {error}
        </div>
      )}

      {isLoading ? (
        <div className="text-sm text-slate-500 font-semibold">正在加载…</div>
      ) : (
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
          <div className="xl:col-span-2 space-y-4">
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-5">
              <div className="text-base font-black text-slate-900">到期规则</div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-bold text-slate-700">即将到期阈值（天）</label>
                  <input
                    type="number"
                    value={draft.expiringDays}
                    onChange={(e) => setDraft((d) => ({ ...d, expiringDays: Number(e.target.value || 0) }))}
                    className="w-full h-11 bg-slate-100 border border-slate-200 rounded-xl px-4 text-sm font-medium outline-none focus:ring-2 focus:ring-slate-900/20 focus:border-slate-300"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-bold text-slate-700">定时任务开关</label>
                  <div className="h-11 flex items-center justify-between bg-slate-100 border border-slate-200 rounded-xl px-4">
                    <span className="text-sm font-semibold text-slate-700">每4小时检查</span>
                    <input
                      type="checkbox"
                      checked={draft.schedulerEnabled}
                      onChange={(e) => setDraft((d) => ({ ...d, schedulerEnabled: e.target.checked }))}
                      className="h-5 w-5"
                    />
                  </div>
                </div>
              </div>
              <div className="rounded-2xl bg-slate-50 border border-slate-200 p-4 text-xs text-slate-600 font-medium leading-relaxed">
                定时任务默认在 00/04/08/12/16/20 点执行一次。到期后会尝试从 VIP 群移出并发送通知（需 Bot 为群管理员）。
              </div>
            </div>

            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-5">
              <div className="text-base font-black text-slate-900">欢迎与客服</div>
              <div className="space-y-2">
                <label className="text-sm font-bold text-slate-700">客服链接</label>
                <input
                  type="text"
                  value={draft.supportLink}
                  onChange={(e) => setDraft((d) => ({ ...d, supportLink: e.target.value }))}
                  className="w-full h-11 bg-slate-100 border border-slate-200 rounded-xl px-4 text-sm font-medium outline-none focus:ring-2 focus:ring-slate-900/20 focus:border-slate-300"
                  placeholder="https://t.me/manjudingyue"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-bold text-slate-700">欢迎文案</label>
                <textarea
                  rows={6}
                  value={draft.welcomeMessage}
                  onChange={(e) => setDraft((d) => ({ ...d, welcomeMessage: e.target.value }))}
                  className="w-full bg-slate-100 border border-slate-200 rounded-xl py-3 px-4 text-sm font-medium outline-none focus:ring-2 focus:ring-slate-900/20 focus:border-slate-300"
                />
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-4">
              <div className="text-base font-black text-slate-900">快捷操作</div>
              <button
                onClick={refresh}
                className="w-full h-11 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold transition-colors"
              >
                重新加载
              </button>
              <button
                onClick={async () => {
                  try {
                    await apiFetchJson('/api/admin/stats/daily/recompute', { method: 'POST', body: JSON.stringify({}) });
                    alert('已触发今日统计重算');
                  } catch (e) {
                    alert(e?.message || '操作失败');
                  }
                }}
                className="w-full h-11 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold transition-colors"
              >
                重算今日统计
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SystemSettings;
