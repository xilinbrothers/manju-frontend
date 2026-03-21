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

const fenToYuan = (fen) => {
  const n = Number(fen || 0) || 0;
  return (n / 100).toFixed(2);
};

const OrdersPayments = () => {
  const [q, setQ] = useState('');
  const [orderId, setOrderId] = useState('');
  const [upstreamOrderNo, setUpstreamOrderNo] = useState('');
  const [telegramId, setTelegramId] = useState('');
  const [status, setStatus] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('');
  const [limit, setLimit] = useState(50);

  const [items, setItems] = useState([]);
  const [total, setTotal] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const [expanded, setExpanded] = useState(() => new Set());
  const [detailsById, setDetailsById] = useState(() => new Map());

  const queryParams = useMemo(() => {
    const p = new URLSearchParams();
    p.set('limit', String(limit));
    p.set('offset', '0');
    if (q.trim()) p.set('q', q.trim());
    if (orderId.trim()) p.set('orderId', orderId.trim());
    if (upstreamOrderNo.trim()) p.set('upstreamOrderNo', upstreamOrderNo.trim());
    if (telegramId.trim()) p.set('telegramId', telegramId.trim());
    if (status.trim()) p.set('status', status.trim());
    if (paymentMethod.trim()) p.set('paymentMethod', paymentMethod.trim());
    return p.toString();
  }, [q, orderId, upstreamOrderNo, telegramId, status, paymentMethod, limit]);

  const load = async () => {
    setIsLoading(true);
    setError('');
    try {
      const data = await apiFetchJson(`/api/admin/orders?${queryParams}`);
      setItems(Array.isArray(data?.items) ? data.items : []);
      setTotal(Number(data?.total || 0) || 0);
    } catch (e) {
      setError(e?.message || '加载失败');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [queryParams]);

  const toggleRow = async (id) => {
    const key = String(id || '').trim();
    if (!key) return;
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
    if (detailsById.has(key)) return;
    try {
      const data = await apiFetchJson(`/api/admin/orders/${encodeURIComponent(key)}`);
      setDetailsById((prev) => {
        const next = new Map(prev);
        next.set(key, data);
        return next;
      });
    } catch (e) {
      setError(e?.message || '加载详情失败');
    }
  };

  return (
    <div className="space-y-7">
      <PageHeader title="订单与支付" subtitle="按订单号/上游单号/用户ID检索支付与通信记录" />
      {error ? <AlertBar type="error" message={error} onClose={() => setError('')} /> : null}

      <Card className="p-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="通用检索：orderId / upstreamOrderNo / telegramId"
            className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-sm font-medium outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
          />
          <div className="flex gap-2">
            <select
              value={limit}
              onChange={(e) => setLimit(Number(e.target.value))}
              className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-sm font-semibold outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            >
              <option value={50}>50 条</option>
              <option value={100}>100 条</option>
              <option value={200}>200 条</option>
            </select>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              className="h-10 flex-1 rounded-xl border border-slate-200 bg-white px-3 text-sm font-semibold outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            >
              <option value="">全部状态</option>
              <option value="created">created</option>
              <option value="paying">paying</option>
              <option value="paid">paid</option>
              <option value="failed">failed</option>
              <option value="paid_mismatch">paid_mismatch</option>
            </select>
            <select
              value={paymentMethod}
              onChange={(e) => setPaymentMethod(e.target.value)}
              className="h-10 flex-1 rounded-xl border border-slate-200 bg-white px-3 text-sm font-semibold outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            >
              <option value="">全部支付方式</option>
              <option value="alipay">alipay</option>
            </select>
            <Button variant="secondary" onClick={load} disabled={isLoading}>
              {isLoading ? '刷新中…' : '刷新'}
            </Button>
          </div>
          <input
            value={orderId}
            onChange={(e) => setOrderId(e.target.value)}
            placeholder="精确：orderId(out_order_no)"
            className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-sm font-medium outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
          />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <input
              value={upstreamOrderNo}
              onChange={(e) => setUpstreamOrderNo(e.target.value)}
              placeholder="精确：upstreamOrderNo(order_no)"
              className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-sm font-medium outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            />
            <input
              value={telegramId}
              onChange={(e) => setTelegramId(e.target.value)}
              placeholder="精确：telegramId"
              className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-sm font-medium outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            />
          </div>
        </div>
        <div className="mt-3 text-xs text-slate-500 font-medium">当前匹配：{total} 条</div>
      </Card>

      <Card className="p-0 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full text-left">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="px-5 py-3.5 text-xs font-black text-slate-600">时间</th>
                <th className="px-5 py-3.5 text-xs font-black text-slate-600">订单号</th>
                <th className="px-5 py-3.5 text-xs font-black text-slate-600">用户</th>
                <th className="px-5 py-3.5 text-xs font-black text-slate-600">购买</th>
                <th className="px-5 py-3.5 text-xs font-black text-slate-600">金额</th>
                <th className="px-5 py-3.5 text-xs font-black text-slate-600">状态</th>
                <th className="px-5 py-3.5 text-xs font-black text-slate-600">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 bg-white">
              {items.length === 0 ? (
                <tr>
                  <td className="px-5 py-8 text-sm text-slate-500 font-medium" colSpan={7}>
                    暂无数据
                  </td>
                </tr>
              ) : (
                items.map((it) => {
                  const id = String(it?.id || '');
                  const isOpen = expanded.has(id);
                  const expectedFen = Number(it?.expectedAmountFen || it?.payAmountFen || 0) || 0;
                  const paidFen = Number(it?.paidAmountFen || 0) || 0;
                  return (
                    <React.Fragment key={id}>
                      <tr className="hover:bg-slate-50">
                        <td className="px-5 py-4 text-sm font-semibold text-slate-900 whitespace-nowrap">{formatIso(it?.createdAtIso)}</td>
                        <td className="px-5 py-4 text-sm text-slate-700">
                          <div className="font-black">{id}</div>
                          <div className="text-xs text-slate-500 font-medium truncate max-w-[340px]">{String(it?.upstreamOrderNo || '')}</div>
                        </td>
                        <td className="px-5 py-4 text-sm font-semibold text-slate-900">{String(it?.telegramId || '')}</td>
                        <td className="px-5 py-4 text-sm text-slate-700">
                          <div className="font-bold">{String(it?.seriesId || '')}</div>
                          <div className="text-xs text-slate-500 font-medium">{String(it?.targetType || '')}{it?.seasonId ? `:${it.seasonId}` : ''} · {String(it?.planLabel || it?.planId || '')}</div>
                        </td>
                        <td className="px-5 py-4 text-sm text-slate-700">
                          <div className="font-bold">¥{fenToYuan(expectedFen)}</div>
                          <div className="text-xs text-slate-500 font-medium">实收 ¥{fenToYuan(paidFen)}</div>
                        </td>
                        <td className="px-5 py-4 text-sm font-black text-slate-900">{String(it?.status || '')}</td>
                        <td className="px-5 py-4">
                          <Button variant="secondary" size="sm" onClick={() => toggleRow(id)}>
                            {isOpen ? '收起' : '详情'}
                          </Button>
                        </td>
                      </tr>
                      {isOpen ? (
                        <tr className="bg-slate-50">
                          <td className="px-5 py-4" colSpan={7}>
                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                              <div className="rounded-2xl bg-white border border-slate-200 p-4">
                                <div className="text-xs font-black text-slate-600">Order</div>
                                <pre className="mt-2 text-xs text-slate-800 whitespace-pre-wrap break-words font-mono">
                                  {JSON.stringify(it, null, 2)}
                                </pre>
                              </div>
                              <div className="rounded-2xl bg-white border border-slate-200 p-4">
                                <div className="text-xs font-black text-slate-600">Detail</div>
                                <pre className="mt-2 text-xs text-slate-800 whitespace-pre-wrap break-words font-mono">
                                  {detailsById.has(id) ? JSON.stringify(detailsById.get(id), null, 2) : '加载中…'}
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

export default OrdersPayments;
