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
  const [menuInfo, setMenuInfo] = useState(null);
  const [menuError, setMenuError] = useState('');
  const [isMenuLoading, setIsMenuLoading] = useState(false);
  const [botInfo, setBotInfo] = useState(null);
  const [botError, setBotError] = useState('');
  const [isBotLoading, setIsBotLoading] = useState(false);
  const [commandsInfo, setCommandsInfo] = useState(null);
  const [commandsError, setCommandsError] = useState('');
  const [isCommandsLoading, setIsCommandsLoading] = useState(false);
  const [webhookInfo, setWebhookInfo] = useState(null);
  const [webhookError, setWebhookError] = useState('');
  const [isWebhookLoading, setIsWebhookLoading] = useState(false);
  const [groupCheck, setGroupCheck] = useState(null);
  const [groupCheckError, setGroupCheckError] = useState('');
  const [isGroupCheckLoading, setIsGroupCheckLoading] = useState(false);
  const [overridesInfo, setOverridesInfo] = useState(null);
  const [overridesError, setOverridesError] = useState('');
  const [isOverridesLoading, setIsOverridesLoading] = useState(false);
  const [menuDraft, setMenuDraft] = useState({ text: '', url: '' });
  const [commandsDraft, setCommandsDraft] = useState('[]');

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

  const refreshMenuButton = async () => {
    try {
      setMenuError('');
      setIsMenuLoading(true);
      const data = await apiFetchJson('/api/admin/telegram/menu-button');
      setMenuInfo(data?.menu_button || null);
    } catch (e) {
      setMenuError(e?.message || '加载失败');
      setMenuInfo(null);
    } finally {
      setIsMenuLoading(false);
    }
  };

  const refreshBotInfo = async () => {
    try {
      setBotError('');
      setIsBotLoading(true);
      const data = await apiFetchJson('/api/admin/telegram/me');
      setBotInfo(data?.me || null);
    } catch (e) {
      setBotError(e?.message || '加载失败');
      setBotInfo(null);
    } finally {
      setIsBotLoading(false);
    }
  };

  const refreshCommands = async () => {
    try {
      setCommandsError('');
      setIsCommandsLoading(true);
      const data = await apiFetchJson('/api/admin/telegram/commands');
      setCommandsInfo(data || null);
    } catch (e) {
      setCommandsError(e?.message || '加载失败');
      setCommandsInfo(null);
    } finally {
      setIsCommandsLoading(false);
    }
  };

  const refreshWebhook = async () => {
    try {
      setWebhookError('');
      setIsWebhookLoading(true);
      const data = await apiFetchJson('/api/admin/telegram/webhook');
      setWebhookInfo(data?.info || null);
    } catch (e) {
      setWebhookError(e?.message || '加载失败');
      setWebhookInfo(null);
    } finally {
      setIsWebhookLoading(false);
    }
  };

  const refreshGroupCheck = async () => {
    try {
      setGroupCheckError('');
      setIsGroupCheckLoading(true);
      const data = await apiFetchJson('/api/admin/telegram/group-check');
      setGroupCheck(data || null);
    } catch (e) {
      setGroupCheckError(e?.message || '加载失败');
      setGroupCheck(null);
    } finally {
      setIsGroupCheckLoading(false);
    }
  };

  const refreshOverrides = async () => {
    try {
      setOverridesError('');
      setIsOverridesLoading(true);
      const data = await apiFetchJson('/api/admin/telegram/overrides');
      setOverridesInfo(data || null);
      const text = String(data?.overrides?.menuButton?.text || '');
      const url = String(data?.overrides?.menuButton?.url || '');
      setMenuDraft((d) => ({ ...d, text: text || d.text, url: url || d.url }));
      const list = Array.isArray(data?.overrides?.commands?.list) ? data.overrides.commands.list : [];
      setCommandsDraft(JSON.stringify(list, null, 2));
    } catch (e) {
      setOverridesError(e?.message || '加载失败');
      setOverridesInfo(null);
    } finally {
      setIsOverridesLoading(false);
    }
  };

  const applyMenuOverride = async () => {
    const text = String(menuDraft.text || '').trim();
    const url = String(menuDraft.url || '').trim();
    if (!text || !url) return alert('请填写文案与URL');
    const ok = window.confirm('将通过后端覆盖 Telegram Menu Button 为 WebApp。确认继续？');
    if (!ok) return;
    try {
      await apiFetchJson('/api/admin/telegram/menu-button', { method: 'POST', body: JSON.stringify({ action: 'override_web_app', text, url }) });
      await refreshMenuButton();
      await refreshOverrides();
      alert('已覆盖');
    } catch (e) {
      alert(e?.message || '操作失败');
    }
  };

  const clearMenuOverride = async () => {
    const ok = window.confirm('仅清除后端“覆盖标记”，后续以 Telegram 端配置为准。确认继续？');
    if (!ok) return;
    try {
      await apiFetchJson('/api/admin/telegram/menu-button', { method: 'POST', body: JSON.stringify({ action: 'clear_override' }) });
      await refreshMenuButton();
      await refreshOverrides();
      alert('已清除覆盖标记');
    } catch (e) {
      alert(e?.message || '操作失败');
    }
  };

  const applyCommandsOverride = async () => {
    let list = [];
    try {
      const parsed = JSON.parse(commandsDraft || '[]');
      if (!Array.isArray(parsed)) throw new Error('格式必须是JSON数组');
      list = parsed;
    } catch (e) {
      return alert(e?.message || 'JSON解析失败');
    }
    const ok = window.confirm('将通过后端覆盖 Telegram 命令列表（default scope）。确认继续？');
    if (!ok) return;
    try {
      await apiFetchJson('/api/admin/telegram/commands', { method: 'POST', body: JSON.stringify({ action: 'override_set', commands: list }) });
      await refreshCommands();
      await refreshOverrides();
      alert('已覆盖');
    } catch (e) {
      alert(e?.message || '操作失败');
    }
  };

  const clearCommandsOverride = async () => {
    const ok = window.confirm('仅清除后端“覆盖标记”，后续以 Telegram 端配置为准。确认继续？');
    if (!ok) return;
    try {
      await apiFetchJson('/api/admin/telegram/commands', { method: 'POST', body: JSON.stringify({ action: 'clear_override' }) });
      await refreshCommands();
      await refreshOverrides();
      alert('已清除覆盖标记');
    } catch (e) {
      alert(e?.message || '操作失败');
    }
  };

  const deleteWebhook = async () => {
    const ok = window.confirm('将删除 Telegram Webhook（建议用于轮询模式）。确认继续？');
    if (!ok) return;
    try {
      await apiFetchJson('/api/admin/telegram/webhook', { method: 'POST', body: JSON.stringify({ action: 'delete', drop_pending_updates: true }) });
      await refreshWebhook();
      await refreshOverrides();
      alert('已删除Webhook');
    } catch (e) {
      alert(e?.message || '操作失败');
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
    refreshMenuButton();
    refreshBotInfo();
    refreshCommands();
    refreshWebhook();
    refreshOverrides();
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
              <div className="flex items-start justify-between gap-3">
                <div className="space-y-1">
                  <div className="text-base font-black text-slate-900">Telegram 菜单按钮</div>
                  <div className="text-xs text-slate-500 font-medium">默认以 Telegram 端为准；后台仅在手动覆盖时写入</div>
                </div>
                <button
                  onClick={refreshMenuButton}
                  className="h-9 px-3 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold transition-colors"
                >
                  刷新
                </button>
              </div>

              {isMenuLoading ? (
                <div className="text-sm text-slate-500 font-semibold">正在加载…</div>
              ) : menuError ? (
                <div className="text-sm text-rose-700 font-semibold">{menuError}</div>
              ) : (
                <div className="space-y-2 text-sm">
                  <div className="flex items-center justify-between">
                    <div className="text-slate-500 font-semibold">类型</div>
                    <div className="font-mono font-bold text-slate-900">{menuInfo?.type || '-'}</div>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="text-slate-500 font-semibold">来源</div>
                    <div className="font-bold text-slate-900">
                      {overridesInfo?.overrides?.menuButton?.mode === 'override' ? '后台手动覆盖' : 'Telegram 端'}
                    </div>
                  </div>
                  <div className="space-y-1">
                    <div className="text-slate-500 font-semibold">消息内 WebApp URL</div>
                    <div className="font-mono text-xs text-slate-900 break-all">
                      {menuInfo?.type === 'web_app'
                        ? menuInfo?.web_app?.url || '-'
                        : overridesInfo?.runtime?.webAppUrlDefault || '-'}
                    </div>
                    <div className="text-[11px] text-slate-500 font-medium">
                      来源：{menuInfo?.type === 'web_app' ? 'Telegram 端（Menu Button）' : '代码默认（WEB_APP_URL）'}
                    </div>
                  </div>
                  {menuInfo?.type !== 'web_app' ? (
                    <div className="rounded-xl bg-amber-50 border border-amber-200 p-3 text-xs text-amber-700 font-medium leading-relaxed">
                      当前不是 WebApp 菜单按钮，客户端会显示 Menu/命令。若需“漫剧世界”直达 WebApp，请在 Telegram 端设置或在此手动覆盖。
                    </div>
                  ) : null}
                  {menuInfo?.type === 'web_app' ? (
                    <>
                      <div className="flex items-center justify-between">
                        <div className="text-slate-500 font-semibold">文案</div>
                        <div className="font-bold text-slate-900">{menuInfo?.text || '-'}</div>
                      </div>
                      <div className="space-y-1">
                        <div className="text-slate-500 font-semibold">URL</div>
                        <div className="font-mono text-xs text-slate-900 break-all">{menuInfo?.web_app?.url || '-'}</div>
                      </div>
                    </>
                  ) : null}
                  <div className="space-y-1 pt-2 border-t border-slate-200">
                    <div className="text-xs text-slate-500 font-medium">手动覆盖（可选）</div>
                    <div className="space-y-2">
                      <input
                        type="text"
                        value={menuDraft.text}
                        onChange={(e) => setMenuDraft((d) => ({ ...d, text: e.target.value }))}
                        className="w-full h-10 bg-slate-100 border border-slate-200 rounded-xl px-3 text-sm font-medium outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                        placeholder="按钮文案（例如：漫剧世界）"
                      />
                      <input
                        type="text"
                        value={menuDraft.url}
                        onChange={(e) => setMenuDraft((d) => ({ ...d, url: e.target.value }))}
                        className="w-full h-10 bg-slate-100 border border-slate-200 rounded-xl px-3 text-sm font-medium outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                        placeholder="WebApp URL（例如：https://manju-jade.vercel.app）"
                      />
                      <div className="flex gap-2">
                        <button
                          onClick={applyMenuOverride}
                          className="flex-1 h-10 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold transition-colors"
                        >
                          覆盖为 WebApp
                        </button>
                        <button
                          onClick={clearMenuOverride}
                          className="flex-1 h-10 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold transition-colors"
                        >
                          清除覆盖
                        </button>
                      </div>
                      {overridesInfo?.overrides?.menuButton?.updatedAtIso ? (
                        <div className="text-[11px] text-slate-500 font-medium">覆盖记录更新时间：{overridesInfo.overrides.menuButton.updatedAtIso}</div>
                      ) : null}
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-4">
              <div className="flex items-start justify-between gap-3">
                <div className="space-y-1">
                  <div className="text-base font-black text-slate-900">Telegram Bot 信息</div>
                  <div className="text-xs text-slate-500 font-medium">supports_inline_queries 用于核对 Inline Mode</div>
                </div>
                <button
                  onClick={refreshBotInfo}
                  className="h-9 px-3 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold transition-colors"
                >
                  刷新
                </button>
              </div>

              {isBotLoading ? (
                <div className="text-sm text-slate-500 font-semibold">正在加载…</div>
              ) : botError ? (
                <div className="text-sm text-rose-700 font-semibold">{botError}</div>
              ) : (
                <div className="space-y-2 text-sm">
                  <div className="flex items-center justify-between">
                    <div className="text-slate-500 font-semibold">用户名</div>
                    <div className="font-mono font-bold text-slate-900">@{botInfo?.username || '-'}</div>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="text-slate-500 font-semibold">ID</div>
                    <div className="font-mono font-bold text-slate-900">{botInfo?.id || '-'}</div>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="text-slate-500 font-semibold">Inline</div>
                    <div className="font-mono font-bold text-slate-900">{String(Boolean(botInfo?.supports_inline_queries))}</div>
                  </div>
                </div>
              )}
            </div>

            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-4">
              <div className="flex items-start justify-between gap-3">
                <div className="space-y-1">
                  <div className="text-base font-black text-slate-900">Telegram 命令列表</div>
                  <div className="text-xs text-slate-500 font-medium">默认以 Telegram 端为准；后台仅在手动覆盖时写入</div>
                </div>
                <button
                  onClick={refreshCommands}
                  className="h-9 px-3 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold transition-colors"
                >
                  刷新
                </button>
              </div>

              {isCommandsLoading ? (
                <div className="text-sm text-slate-500 font-semibold">正在加载…</div>
              ) : commandsError ? (
                <div className="text-sm text-rose-700 font-semibold">{commandsError}</div>
              ) : (
                <div className="space-y-2 text-sm">
                  <div className="flex items-center justify-between">
                    <div className="text-slate-500 font-semibold">来源</div>
                    <div className="font-bold text-slate-900">
                      {overridesInfo?.overrides?.commands?.mode === 'override' ? '后台手动覆盖' : 'Telegram 端'}
                    </div>
                  </div>
                  {(commandsInfo?.commands || []).length === 0 ? (
                    <div className="text-slate-500 font-semibold">暂无命令</div>
                  ) : (
                    <div className="space-y-2">
                      {(commandsInfo?.commands || []).map((c) => (
                        <div key={c.command} className="flex items-center justify-between gap-3">
                          <div className="font-mono font-bold text-slate-900">/{c.command}</div>
                          <div className="text-slate-600 font-medium truncate">{c.description}</div>
                        </div>
                      ))}
                    </div>
                  )}
                  <div className="space-y-2 pt-2 border-t border-slate-200">
                    <div className="text-xs text-slate-500 font-medium">手动覆盖（JSON 数组）</div>
                    <textarea
                      rows={5}
                      value={commandsDraft}
                      onChange={(e) => setCommandsDraft(e.target.value)}
                      className="w-full bg-slate-100 border border-slate-200 rounded-xl py-2 px-3 text-xs font-mono outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                    />
                    <div className="flex gap-2">
                      <button
                        onClick={applyCommandsOverride}
                        className="flex-1 h-10 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold transition-colors"
                      >
                        覆盖命令
                      </button>
                      <button
                        onClick={clearCommandsOverride}
                        className="flex-1 h-10 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold transition-colors"
                      >
                        清除覆盖
                      </button>
                    </div>
                    {overridesInfo?.overrides?.commands?.updatedAtIso ? (
                      <div className="text-[11px] text-slate-500 font-medium">覆盖记录更新时间：{overridesInfo.overrides.commands.updatedAtIso}</div>
                    ) : null}
                  </div>
                </div>
              )}
            </div>

            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-4">
              <div className="flex items-start justify-between gap-3">
                <div className="space-y-1">
                  <div className="text-base font-black text-slate-900">Webhook 状态</div>
                  <div className="text-xs text-slate-500 font-medium">Webhook 与轮询二选一；本系统默认使用轮询</div>
                </div>
                <button
                  onClick={refreshWebhook}
                  className="h-9 px-3 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold transition-colors"
                >
                  刷新
                </button>
              </div>

              {isWebhookLoading ? (
                <div className="text-sm text-slate-500 font-semibold">正在加载…</div>
              ) : webhookError ? (
                <div className="text-sm text-rose-700 font-semibold">{webhookError}</div>
              ) : (
                <div className="space-y-2 text-sm">
                  <div className="flex items-center justify-between">
                    <div className="text-slate-500 font-semibold">来源</div>
                    <div className="font-bold text-slate-900">
                      {overridesInfo?.overrides?.webhook?.mode === 'override' ? '后台手动处理' : 'Telegram 端'}
                    </div>
                  </div>
                  <div className="space-y-1">
                    <div className="text-slate-500 font-semibold">URL</div>
                    <div className="font-mono text-xs text-slate-900 break-all">{webhookInfo?.url || '-'}</div>
                  </div>
                  {webhookInfo?.url ? (
                    <div className="rounded-xl bg-amber-50 border border-amber-200 p-3 text-xs text-amber-700 font-medium leading-relaxed">
                      当前已配置 Webhook，会影响轮询收消息。建议删除 Webhook。
                    </div>
                  ) : null}
                  {webhookInfo?.url ? (
                    <button
                      onClick={deleteWebhook}
                      className="w-full h-10 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold transition-colors"
                    >
                      删除 Webhook（启用轮询）
                    </button>
                  ) : null}
                  <div className="flex items-center justify-between">
                    <div className="text-slate-500 font-semibold">待处理更新</div>
                    <div className="font-mono font-bold text-slate-900">{webhookInfo?.pending_update_count ?? '-'}</div>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="text-slate-500 font-semibold">最后错误</div>
                    <div className="font-mono font-bold text-slate-900">{webhookInfo?.last_error_date ? String(webhookInfo.last_error_date) : '-'}</div>
                  </div>
                </div>
              )}
            </div>

            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-4">
              <div className="flex items-start justify-between gap-3">
                <div className="space-y-1">
                  <div className="text-base font-black text-slate-900">群组权限自检</div>
                  <div className="text-xs text-slate-500 font-medium">核对 Bot 在试看群/VIP群的权限与配置格式</div>
                </div>
                <button
                  onClick={refreshGroupCheck}
                  className="h-9 px-3 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold transition-colors"
                >
                  检查
                </button>
              </div>

              {isGroupCheckLoading ? (
                <div className="text-sm text-slate-500 font-semibold">正在加载…</div>
              ) : groupCheckError ? (
                <div className="text-sm text-rose-700 font-semibold">{groupCheckError}</div>
              ) : !groupCheck ? (
                <div className="text-sm text-slate-500 font-semibold">未检查</div>
              ) : (
                <div className="space-y-3 text-sm">
                  <div className="text-xs text-slate-500 font-medium">Bot：@{groupCheck?.bot?.username || '-'}（{groupCheck?.bot?.id || '-'}）</div>
                  <div className="space-y-2">
                    {(groupCheck?.items || []).map((it) => (
                      <div key={it.id} className="rounded-xl bg-slate-50 border border-slate-200 p-3 space-y-2">
                        <div className="flex items-center justify-between gap-3">
                          <div className="font-black text-slate-900">{it.title || it.id}</div>
                          <div className="font-mono text-xs text-slate-600">{it.id}</div>
                        </div>
                        <div className="grid grid-cols-1 gap-2">
                          <div className="flex items-center justify-between gap-3">
                            <div className="text-slate-500 font-semibold">试看群</div>
                            <div className="font-mono text-xs text-slate-900">{it.trialGroupId || '-'}</div>
                          </div>
                          <div className="text-xs text-slate-600 font-medium">
                            {it.trial?.ok ? `status=${it.trial.status || '-'} can_invite_users=${String(Boolean(it.trial.can_invite_users))} public=${String(Boolean(it.trial?.chat?.username))}` : `error=${it.trial?.error || 'unknown'}`}
                          </div>
                          <div className="flex items-center justify-between gap-3">
                            <div className="text-slate-500 font-semibold">VIP群</div>
                            <div className="font-mono text-xs text-slate-900">{it.vipGroupId || '-'}</div>
                          </div>
                          <div className="text-xs text-slate-600 font-medium">
                            {it.vip?.ok ? `status=${it.vip.status || '-'} can_manage_chat=${String(Boolean(it.vip.can_manage_chat))} public=${String(Boolean(it.vip?.chat?.username))}` : `error=${it.vip?.error || 'unknown'}`}
                          </div>
                          {it.vip?.ok && it.vip?.chat?.username ? (
                            <div className="rounded-xl bg-amber-50 border border-amber-200 p-3 text-xs text-amber-700 font-medium leading-relaxed">
                              VIP群为公开群（存在 username），用户可绕过申请直接加入。若需严格控制，请将 VIP 群改为私密或关闭公开加入入口。
                            </div>
                          ) : null}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

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
