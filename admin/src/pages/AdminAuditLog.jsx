import React, { useEffect, useMemo, useState } from 'react';
import AlertBar from '../components/AlertBar';
import Button from '../components/ui/Button';
import Card from '../components/ui/Card';
import PageHeader from '../components/ui/PageHeader';
import { apiFetchJson } from '../utils/api';

const formatIso = (iso) => {
  const s = String(iso || '').trim();
  if (!s) return '-';
  const d = new Date(s);
  if (Number.isNaN(d.getTime())) return s;
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
};

const downloadText = (filename, text, type) => {
  const blob = new Blob([text], { type: type || 'text/plain;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
};

const escapeCsv = (s) => {
  const v = String(s ?? '');
  if (/[",\n\r]/.test(v)) return `"${v.replace(/"/g, '""')}"`;
  return v;
};

const AdminAuditLog = () => {
  const [limit, setLimit] = useState(100);
  const [query, setQuery] = useState('');
  const [items, setItems] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [expanded, setExpanded] = useState(() => new Set());

  const load = async () => {
    setIsLoading(true);
    setError('');
    try {
      const data = await apiFetchJson(`/api/admin/audit?limit=${encodeURIComponent(limit)}`);
      setItems(Array.isArray(data?.items) ? data.items : []);
    } catch (e) {
      setError(e?.message || '加载失败');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [limit]);

  const filtered = useMemo(() => {
    const q = String(query || '').trim().toLowerCase();
    if (!q) return items;
    return items.filter((it) => {
      const parts = [
        it?.action,
        it?.target,
        it?.adminEmail,
        it?.adminName,
        it?.adminType,
        it?.ip,
        it?.userAgent,
        it?.atIso,
        it?.createdAt,
      ]
        .filter(Boolean)
        .map((x) => String(x).toLowerCase());
      const metaStr = it?.meta ? JSON.stringify(it.meta).toLowerCase() : '';
      return parts.join(' ').includes(q) || metaStr.includes(q);
    });
  }, [items, query]);

  const onToggle = (key) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  return (
    <div className="space-y-7">
      <PageHeader title="操作审计日志" subtitle="用于排查后台关键操作：登录、配置、剧集、封面与迁移等" />

      {error ? <AlertBar type="error" message={error} onClose={() => setError('')} /> : null}

      <Card className="p-5">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <div className="flex items-center gap-2">
              <div className="text-sm font-bold text-slate-700">条数</div>
              <select
                value={limit}
                onChange={(e) => setLimit(Number(e.target.value))}
                className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-sm font-semibold outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              >
                <option value={50}>50</option>
                <option value={100}>100</option>
                <option value={200}>200</option>
              </select>
            </div>
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="搜索 action / 目标 / 邮箱 / IP / meta…"
              className="h-10 w-full sm:w-[420px] rounded-xl border border-slate-200 bg-white px-3 text-sm font-medium outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            />
          </div>

          <div className="flex gap-2">
            <Button variant="secondary" onClick={load} disabled={isLoading}>
              {isLoading ? '刷新中…' : '刷新'}
            </Button>
            <Button
              variant="secondary"
              onClick={() => {
                const payload = { exportedAt: new Date().toISOString(), limit, query, items: filtered };
                downloadText(`admin_audit_${Date.now()}.json`, JSON.stringify(payload, null, 2), 'application/json;charset=utf-8');
              }}
              disabled={filtered.length === 0}
            >
              导出 JSON
            </Button>
            <Button
              onClick={() => {
                const header = ['at', 'adminEmail', 'adminName', 'adminType', 'action', 'target', 'ip', 'userAgent', 'meta'];
                const rows = filtered.map((it) => [
                  it?.atIso || it?.createdAt || '',
                  it?.adminEmail || '',
                  it?.adminName || '',
                  it?.adminType || '',
                  it?.action || '',
                  it?.target || '',
                  it?.ip || '',
                  it?.userAgent || '',
                  it?.meta ? JSON.stringify(it.meta) : '',
                ]);
                const csv = [header, ...rows].map((r) => r.map(escapeCsv).join(',')).join('\n');
                downloadText(`admin_audit_${Date.now()}.csv`, csv, 'text/csv;charset=utf-8');
              }}
              disabled={filtered.length === 0}
            >
              导出 CSV
            </Button>
          </div>
        </div>
      </Card>

      <Card className="p-0 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full text-left">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="px-5 py-3 text-xs font-black text-slate-600">时间</th>
                <th className="px-5 py-3 text-xs font-black text-slate-600">管理员</th>
                <th className="px-5 py-3 text-xs font-black text-slate-600">动作</th>
                <th className="px-5 py-3 text-xs font-black text-slate-600">目标</th>
                <th className="px-5 py-3 text-xs font-black text-slate-600">来源</th>
                <th className="px-5 py-3 text-xs font-black text-slate-600">详情</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 bg-white">
              {filtered.length === 0 ? (
                <tr>
                  <td className="px-5 py-8 text-sm text-slate-500 font-medium" colSpan={6}>
                    暂无日志
                  </td>
                </tr>
              ) : (
                filtered.map((it, idx) => {
                  const key = String(it?._id || it?.id || `${it?.atIso || it?.createdAt || ''}_${idx}`);
                  const isOpen = expanded.has(key);
                  const at = it?.atIso || it?.createdAt || '';
                  const admin = it?.adminEmail || '-';
                  const name = it?.adminName || '';
                  const action = it?.action || '-';
                  const target = it?.target || '-';
                  const origin = it?.ip || '-';
                  return (
                    <React.Fragment key={key}>
                      <tr className="hover:bg-slate-50">
                        <td className="px-5 py-4 text-sm font-semibold text-slate-900 whitespace-nowrap">
                          {formatIso(at)}
                        </td>
                        <td className="px-5 py-4 text-sm text-slate-700">
                          <div className="font-bold">{admin}</div>
                          <div className="text-xs text-slate-500 font-medium">{name || it?.adminType || ''}</div>
                        </td>
                        <td className="px-5 py-4 text-sm font-bold text-slate-900">{action}</td>
                        <td className="px-5 py-4 text-sm text-slate-700">
                          <div className="font-semibold">{target}</div>
                        </td>
                        <td className="px-5 py-4 text-sm text-slate-700">
                          <div className="font-semibold">{origin}</div>
                          <div className="text-xs text-slate-500 font-medium truncate max-w-[320px]">{it?.userAgent || ''}</div>
                        </td>
                        <td className="px-5 py-4">
                          <Button variant="secondary" size="sm" onClick={() => onToggle(key)}>
                            {isOpen ? '收起' : '查看'}
                          </Button>
                        </td>
                      </tr>
                      {isOpen ? (
                        <tr className="bg-slate-50">
                          <td className="px-5 py-4" colSpan={6}>
                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                              <div className="rounded-2xl bg-white border border-slate-200 p-4">
                                <div className="text-xs font-black text-slate-600">Meta</div>
                                <pre className="mt-2 text-xs text-slate-800 whitespace-pre-wrap break-words font-mono">
                                  {it?.meta ? JSON.stringify(it.meta, null, 2) : 'null'}
                                </pre>
                              </div>
                              <div className="rounded-2xl bg-white border border-slate-200 p-4">
                                <div className="text-xs font-black text-slate-600">Raw</div>
                                <pre className="mt-2 text-xs text-slate-800 whitespace-pre-wrap break-words font-mono">
                                  {JSON.stringify(it, null, 2)}
                                </pre>
                              </div>
                            </div>
                          </td>
                        </tr>
                      ) : null}
                    </React.Fragment>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
};

export default AdminAuditLog;
