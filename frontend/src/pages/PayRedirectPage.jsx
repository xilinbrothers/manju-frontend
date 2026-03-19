import React, { useEffect, useMemo, useState } from 'react';
import { apiFetchJson } from '../utils/api';

const PayRedirectPage = ({ orderId, onGoMySubs, onBackToPayment }) => {
  const [isLoading, setIsLoading] = useState(true);
  const [payUrl, setPayUrl] = useState('');
  const [error, setError] = useState('');
  const [statusText, setStatusText] = useState('');
  const canCopy = useMemo(() => Boolean(navigator?.clipboard?.writeText), []);

  const fetchPayUrl = async () => {
    const data = await apiFetchJson(`/api/order/alipay-url?order_id=${encodeURIComponent(orderId)}`);
    if (!data?.success || !data?.url) throw new Error(data?.message || '未获取到支付链接');
    return String(data.url);
  };

  const fetchStatus = async () => {
    const data = await apiFetchJson(`/api/order/check?order_id=${encodeURIComponent(orderId)}`);
    if (!data?.success) throw new Error(data?.message || '查单失败');
    const s = String(data?.status ?? '');
    if (s === '2') return { ok: true, text: '支付完成' };
    if (s === '1') return { ok: false, text: '支付中' };
    if (s === '0') return { ok: false, text: '初始化' };
    if (s === '-1') return { ok: false, text: '失败' };
    return { ok: false, text: `状态:${s || '-'}` };
  };

  const tryOpenPayUrl = (url) => {
    const tg = window.Telegram?.WebApp;
    if (tg?.openLink) {
      try {
        tg.openLink(url);
        return;
      } catch {}
    }
    try {
      window.location.href = url;
      return;
    } catch {}
    try {
      window.open(url, '_blank');
    } catch {}
  };

  const copyPayUrl = async () => {
    if (!payUrl) return;
    try {
      await navigator.clipboard.writeText(payUrl);
      setStatusText('已复制支付链接');
    } catch {
      setStatusText('复制失败，请手动长按复制');
    }
  };

  const refreshStatus = async () => {
    try {
      setError('');
      const r = await fetchStatus();
      setStatusText(r.text);
      if (r.ok) onGoMySubs?.();
    } catch (e) {
      setError(e?.message || '查单失败');
    }
  };

  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      try {
        setError('');
        setIsLoading(true);
        const url = await fetchPayUrl();
        if (cancelled) return;
        setPayUrl(url);
        tryOpenPayUrl(url);
      } catch (e) {
        if (cancelled) return;
        setError(e?.message || '打开支付失败');
      } finally {
        if (cancelled) return;
        setIsLoading(false);
      }
    };
    if (orderId) run();
    else {
      setIsLoading(false);
      setError('缺少订单号');
    }
    return () => {
      cancelled = true;
    };
  }, [orderId]);

  return (
    <div className="flex flex-col min-h-screen bg-[#0F172A] text-white p-6 pb-24">
      <header className="mb-8">
        <h2 className="text-[28px] font-black tracking-tight">支付</h2>
        <p className="text-gray-400 text-[14px] mt-1">将跳转到浏览器完成支付</p>
      </header>

      {isLoading && (
        <div className="text-[13px] text-gray-400 font-medium px-1">正在获取支付链接…</div>
      )}

      {!isLoading && error && (
        <div className="bg-red-500/10 border border-red-500/20 text-red-300 rounded-2xl p-4 text-[13px]">
          {error}
        </div>
      )}

      {!isLoading && !error && (
        <div className="space-y-4">
          <div className="bg-[#1A2333] rounded-[2rem] p-5 border border-gray-800/50 shadow-xl space-y-3">
            <div className="text-[14px] font-bold">未自动跳转？</div>
            <div className="text-[12px] text-gray-400 leading-relaxed">
              请点击下方按钮继续。支付完成后可返回点击“我已支付”刷新状态，或进入“我的订阅”查看入群入口。
            </div>
            <button
              onClick={() => tryOpenPayUrl(payUrl)}
              disabled={!payUrl}
              className="w-full py-3 bg-[#3B82F6] hover:bg-blue-600 text-white text-[14px] font-bold rounded-2xl shadow-lg shadow-blue-900/20 transition-all active:scale-[0.98] disabled:opacity-40 disabled:cursor-not-allowed"
            >
              打开支付页面
            </button>
            <div className="flex gap-2">
              <button
                onClick={refreshStatus}
                className="flex-1 py-3 bg-[#252D3F] hover:bg-[#2D374D] text-gray-200 text-[13px] font-bold rounded-2xl border border-gray-700/50 transition-all active:scale-[0.98]"
              >
                我已支付
              </button>
              <button
                onClick={onGoMySubs}
                className="flex-1 py-3 bg-transparent border border-gray-700 text-gray-300 text-[13px] font-bold rounded-2xl transition-all active:scale-[0.98]"
              >
                去我的订阅
              </button>
            </div>
            {canCopy ? (
              <button
                onClick={copyPayUrl}
                disabled={!payUrl}
                className="w-full py-3 bg-transparent border border-gray-700 text-gray-300 text-[13px] font-bold rounded-2xl transition-all active:scale-[0.98] disabled:opacity-40 disabled:cursor-not-allowed"
              >
                复制支付链接
              </button>
            ) : null}
            {statusText ? <div className="text-[12px] text-gray-400">{statusText}</div> : null}
          </div>

          <button
            onClick={onBackToPayment}
            className="w-full py-3 bg-transparent border border-gray-700 text-gray-300 text-[13px] font-bold rounded-2xl transition-all active:scale-[0.98]"
          >
            返回重新选择
          </button>
        </div>
      )}
    </div>
  );
};

export default PayRedirectPage;

