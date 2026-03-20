import React, { useEffect, useMemo, useState } from 'react';
import { apiFetchJson } from '../utils/api';
import AlertBar from '../components/AlertBar';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import SectionHeader from '../components/ui/SectionHeader';

const PayRedirectPage = ({ orderId, onGoMySubs, onBackToPayment }) => {
  const [isLoading, setIsLoading] = useState(true);
  const [payUrl, setPayUrl] = useState('');
  const [error, setError] = useState('');
  const [statusText, setStatusText] = useState('');
  const canCopy = useMemo(() => Boolean(navigator?.clipboard?.writeText), []);
  const skipAutoOpen = useMemo(() => {
    const ua = String(navigator?.userAgent || '');
    const isIOS = /iPad|iPhone|iPod/i.test(ua);
    const isTelegram = /Telegram/i.test(ua) || Boolean(window.Telegram?.WebApp);
    return isIOS && isTelegram;
  }, []);

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
        if (skipAutoOpen) setStatusText('检测到 iOS Telegram 内置浏览器，已关闭自动跳转，请点击“打开支付页面”或“复制支付链接”。');
        else tryOpenPayUrl(url);
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
  }, [orderId, skipAutoOpen]);

  return (
    <div className="flex flex-col min-h-screen bg-[var(--app-bg)] text-[var(--app-fg)] p-6 pb-24">
      <header className="mb-8">
        <SectionHeader title="支付" subtitle="将跳转到浏览器完成支付" />
      </header>

      {isLoading && (
        <div className="text-[13px] text-[color:var(--app-muted)] font-medium px-1">正在获取支付链接…</div>
      )}

      {!isLoading && error && (
        <AlertBar type="error" message={error} />
      )}

      {!isLoading && !error && (
        <div className="space-y-4">
          <Card className="p-5 space-y-3">
            <div className="text-[14px] font-bold">未自动跳转？</div>
            <div className="text-[12px] text-[color:var(--app-muted)] leading-relaxed">
              请点击下方按钮继续。支付完成后可返回点击“我已支付”刷新状态，或进入“我的订阅”查看入群入口。
            </div>
            <Button onClick={() => tryOpenPayUrl(payUrl)} disabled={!payUrl}>
              打开支付页面
            </Button>
            <div className="flex gap-2">
              <Button
                variant="ghost"
                className="flex-1 py-3 text-[13px]"
                onClick={refreshStatus}
              >
                我已支付
              </Button>
              <Button
                variant="ghost"
                className="flex-1 py-3 text-[13px]"
                onClick={onGoMySubs}
              >
                去我的订阅
              </Button>
            </div>
            {canCopy ? (
              <Button
                variant="ghost"
                className="py-3 text-[13px]"
                onClick={copyPayUrl}
                disabled={!payUrl}
              >
                复制支付链接
              </Button>
            ) : null}
            {statusText ? <div className="text-[12px] text-[color:var(--app-muted)]">{statusText}</div> : null}
          </Card>

          <Button variant="ghost" className="py-3 text-[13px]" onClick={onBackToPayment}>
            返回重新选择
          </Button>
        </div>
      )}
    </div>
  );
};

export default PayRedirectPage;
