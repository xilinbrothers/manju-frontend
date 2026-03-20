import React, { useState, useEffect, useMemo } from 'react';
import WelcomePage from './pages/WelcomePage';
import SeriesListPage from './pages/SeriesListPage';
import PlansPage from './pages/PlansPage';
import MySubscriptionsPage from './pages/MySubscriptionsPage';
import PayRedirectPage from './pages/PayRedirectPage';
import SeasonSelectPage from './pages/SeasonSelectPage';
import ServicePage from './pages/ServicePage';
import PaySuccessPage from './pages/PaySuccessPage';
import AlertBar from './components/AlertBar';
import Card from './components/ui/Card';
import PaymentMethodSelector from './components/PaymentMethodSelector';
// AdminApp 不需要在 App.jsx 中导入，因为它在 main.jsx 中通过路由直接使用
import { getTranslation } from './utils/i18n';
import { apiFetchJson, getApiBaseUrl } from './utils/api';

const App = () => {
  const [currentPage, setCurrentPage] = useState('welcome');
  const [selectedSeries, setSelectedSeries] = useState(null);
  const [selectedPlan, setSelectedPlan] = useState(null);
  const [selectedTargetType, setSelectedTargetType] = useState('series');
  const [selectedSeasonId, setSelectedSeasonId] = useState('');
  const [selectedDisplayTitle, setSelectedDisplayTitle] = useState('');
  const [payOrderId, setPayOrderId] = useState('');
  const [quote, setQuote] = useState(null);
  const [quoteError, setQuoteError] = useState('');
  const [appAlert, setAppAlert] = useState(null);

  const showAlert = (type, message) => {
    setAppAlert({ type, message: String(message || '') });
  };

  const lang = useMemo(() => 'zh', []);
  const t = getTranslation(lang);

  // 模拟 Telegram Web App 样式初始化
  useEffect(() => {
    const p = window.location?.pathname || '/';
    const qs = window.location?.search || '';
    const params = new URLSearchParams(qs);
    const page = String(params.get('page') || '');
    const seriesId = String(params.get('series_id') || params.get('renew_series_id') || '');

    const setPlansForSeriesId = async (id) => {
      try {
        const list = await apiFetchJson('/api/series');
        const found = Array.isArray(list) ? list.find((s) => String(s?.id) === String(id)) : null;
        setSelectedSeries(found || { id: String(id) });
        setSelectedPlan(null);
        setSelectedTargetType('series');
        setSelectedSeasonId('');
        setSelectedDisplayTitle('');
        setCurrentPage('season-select');
      } catch {
        setSelectedSeries({ id: String(id) });
        setSelectedPlan(null);
        setSelectedTargetType('series');
        setSelectedSeasonId('');
        setSelectedDisplayTitle('');
        setCurrentPage('season-select');
      }
    };

    if ((page === 'plans' || page === 'renew' || page === 'season-select') && seriesId) {
      setPlansForSeriesId(seriesId);
      return;
    }

    if (p.startsWith('/my-subs')) setCurrentPage('my-subs');
    else if (p.startsWith('/series')) setCurrentPage('series');
    else setCurrentPage('welcome');
  }, []);

  const startPayment = async (paymentMethod) => {
    if (!selectedSeries?.id || !selectedPlan?.id) {
      showAlert('warning', '请选择剧集和套餐');
      return;
    }
    if (paymentMethod === 'stars') {
      showAlert('warning', 'Telegram Stars 支付已下线');
      return;
    }
    try {
      const baseUrl = getApiBaseUrl();
      const initData = window.Telegram?.WebApp?.initData || '';
      const res = await fetch(`${baseUrl}/api/orders`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(initData ? { 'x-telegram-init-data': initData } : {}),
        },
        body: JSON.stringify({
          series_id: selectedSeries.id,
          plan_id: selectedPlan.id,
          payment_method: paymentMethod,
          target_type: selectedTargetType,
          season_id: selectedSeasonId,
        }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok || !data?.success) throw new Error(data?.message || `创建订单失败: ${res.status}`);

      if (data?.pay?.type === 'alipay' && data?.pay?.url) {
        const orderId = String(data?.order_id || '');
        if (!orderId) throw new Error('缺少订单号');
        setPayOrderId(orderId);
        navigate('pay-redirect');
        return;
      }

      showAlert('error', '未获取到支付信息');
    } catch (e) {
      showAlert('error', e?.message || '支付失败');
    }
  };

  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      try {
        setQuoteError('');
        setQuote(null);
        if (currentPage !== 'payment') return;
        if (!selectedSeries?.id || !selectedPlan?.id) return;
        const initData = window.Telegram?.WebApp?.initData || '';
        const baseUrl = getApiBaseUrl();
        const res = await fetch(`${baseUrl}/api/orders/quote`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(initData ? { 'x-telegram-init-data': initData } : {}),
          },
          body: JSON.stringify({
            series_id: selectedSeries.id,
            plan_id: selectedPlan.id,
            target_type: selectedTargetType,
            season_id: selectedSeasonId,
          }),
        });
        const data = await res.json().catch(() => null);
        if (cancelled) return;
        if (!res.ok || !data?.success) throw new Error(data?.message || `报价失败: ${res.status}`);
        setQuote(data.quote || null);
      } catch (e) {
        if (cancelled) return;
        setQuoteError(e?.message || '报价失败');
        setQuote(null);
      }
    };
    run();
    return () => {
      cancelled = true;
    };
  }, [currentPage, selectedSeries?.id, selectedPlan?.id, selectedTargetType, selectedSeasonId]);

  useEffect(() => {
    document.documentElement.dataset.app = 'frontend';
    // 1. 通知 Telegram SDK 已就绪
    if (window.Telegram?.WebApp) {
      const tg = window.Telegram.WebApp;
      tg.ready();
      tg.expand(); // 展开 Web App 以占据全屏
      
      // 设置头部颜色
      tg.setHeaderColor('#0F172A');
      // 设置主按钮状态 (可选)
      tg.MainButton.setParams({
        text: '确认支付',
        color: '#2563eb'
      });
    }
  }, []);

  // 处理 Telegram SDK 交互按钮 (MainButton / BackButton)
  useEffect(() => {
    if (!window.Telegram?.WebApp) return;
    const tg = window.Telegram.WebApp;

    // 1. 处理返回按钮
    if (currentPage === 'welcome') {
      tg.BackButton.hide();
    } else {
      tg.BackButton.show();
      const handleBack = () => {
        if (currentPage === 'series') navigate('welcome');
        else if (currentPage === 'season-select') navigate('series');
        else if (currentPage === 'plans') navigate('season-select');
        else if (currentPage === 'payment') navigate('plans');
        else if (currentPage === 'pay-redirect') navigate('payment');
        else navigate('welcome');
      };
      tg.onEvent('backButtonClicked', handleBack);
      return () => tg.offEvent('backButtonClicked', handleBack);
    }
  }, [currentPage]);

  useEffect(() => {
    if (!window.Telegram?.WebApp) return;
    const tg = window.Telegram.WebApp;

    // 2. 处理主按钮 (仅在支付页显示)
    if (currentPage === 'payment') {
      const amount = quote?.payAmountFen ? (Number(quote.payAmountFen) / 100).toFixed(2) : (selectedPlan?.price || '69.9');
      tg.MainButton.setParams({
        text: `确认支付 ￥${amount}`,
        color: '#3B82F6',
        is_visible: true
      });
      const handleMainClick = () => startPayment('alipay');
      tg.onEvent('mainButtonClicked', handleMainClick);
      return () => {
        tg.offEvent('mainButtonClicked', handleMainClick);
        tg.MainButton.hide();
      };
    } else {
      tg.MainButton.hide();
    }
  }, [currentPage, selectedPlan, selectedSeries, quote]);

  const navigate = (page) => {
    setCurrentPage(page);
    window.scrollTo(0, 0); // 每次跳转滚动到顶部
  };

  const renderPage = () => {
    switch (currentPage) {
      case 'welcome':
        return <WelcomePage onNavigate={navigate} t={t} />;
      case 'series':
        return (
          <SeriesListPage 
            onNavigate={navigate} 
            onAlert={showAlert}
            onSelectSeries={(s) => {
              setSelectedSeries(s);
              setSelectedPlan(null);
              setSelectedTargetType('series');
              setSelectedSeasonId('');
              setSelectedDisplayTitle('');
            }} 
            t={t}
          />
        );
      case 'season-select':
        return (
          <SeasonSelectPage
            seriesId={selectedSeries?.id}
            onSelectTarget={({ targetType, seasonId, displayTitle }) => {
              setSelectedTargetType(targetType);
              setSelectedSeasonId(seasonId);
              setSelectedDisplayTitle(displayTitle || '');
            }}
            onNavigate={navigate}
          />
        );
      case 'plans':
        return (
          <PlansPage 
            series={selectedSeries} 
            targetType={selectedTargetType}
            seasonId={selectedSeasonId}
            displayTitle={selectedDisplayTitle}
            onSelectPlan={setSelectedPlan} 
            onNavigate={navigate} 
            t={t}
          />
        );
      case 'pay-redirect':
        return (
          <PayRedirectPage
            orderId={payOrderId}
            onGoMySubs={() => navigate('my-subs')}
            onBackToPayment={() => navigate('payment')}
          />
        );
      case 'payment':
        return (
          <div className="flex flex-col min-h-screen bg-[var(--app-bg)] text-[var(--app-fg)] p-5">
            <h2 className="text-[20px] font-black mb-8 px-1">{t.order_confirm}</h2>
            
            <Card className="p-6 mb-6 space-y-5">
              <div className="flex justify-between items-center text-[14px]">
                <span className="text-[color:var(--app-muted)]">{t.sub_series}</span>
                <span className="font-bold">{selectedDisplayTitle || selectedSeries?.title || '剧集'}</span>
              </div>
              <div className="flex justify-between items-center text-[14px]">
                <span className="text-[color:var(--app-muted)]">{t.sub_duration}</span>
                <span className="font-bold">{selectedPlan?.label || '30天'}</span>
              </div>
              {quoteError ? (
                <AlertBar type="error" message={quoteError} />
              ) : quote?.targetType === 'super' ? (
                <div className="rounded-[var(--app-radius-md)] border border-[color:var(--app-border)] bg-black/10 p-4 space-y-2">
                  <div className="flex justify-between items-center text-[13px]">
                    <span className="text-[color:var(--app-muted)]">全季原价</span>
                    <span className="font-mono font-bold">￥{(Number(quote.baseAmountFen || 0) / 100).toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between items-center text-[13px]">
                    <span className="text-[color:var(--app-muted)]">已购季抵扣</span>
                    <span className="font-mono font-bold text-green-400">-￥{(Number(quote.discountFen || 0) / 100).toFixed(2)}</span>
                  </div>
                  {Number(quote.minPayFen || 0) > 0 ? (
                    <div className="text-[11px] text-[color:var(--app-muted)]">
                      最低应付 ￥{(Number(quote.minPayFen || 0) / 100).toFixed(2)}
                    </div>
                  ) : null}
                </div>
              ) : null}
              <div className="border-t border-[color:var(--app-border)] pt-4 flex justify-between items-center">
                <span className="text-[color:var(--app-muted)] text-[14px]">{t.order_amount}</span>
                <span className="text-[22px] font-black font-mono">
                  ￥{quote?.payAmountFen ? (Number(quote.payAmountFen) / 100).toFixed(2) : (selectedPlan?.price || '69.9')}
                </span>
              </div>
            </Card>

            <PaymentMethodSelector className="mb-24" onSelectAlipay={() => startPayment('alipay')} />
            
            {/* 已移除页面底部的固定确认按钮，改用 Telegram 原生 MainButton */}
          </div>
        );
      case 'success':
        return <PaySuccessPage t={t} onGoMySubs={() => navigate('my-subs')} onBackHome={() => navigate('welcome')} />;
      case 'my-subs':
        return (
          <MySubscriptionsPage
            onNavigate={navigate}
            onAlert={showAlert}
            onRenew={async (seriesId) => {
              if (!seriesId) return;
              try {
                const list = await apiFetchJson('/api/series');
                const found = Array.isArray(list) ? list.find((s) => String(s?.id) === String(seriesId)) : null;
                setSelectedSeries(found || { id: String(seriesId) });
                setSelectedPlan(null);
                setSelectedTargetType('series');
                setSelectedSeasonId('');
                setSelectedDisplayTitle('');
                navigate('season-select');
              } catch {
                setSelectedSeries({ id: String(seriesId) });
                setSelectedPlan(null);
                setSelectedTargetType('series');
                setSelectedSeasonId('');
                setSelectedDisplayTitle('');
                navigate('season-select');
              }
            }}
          />
        );
      case 'service':
        return <ServicePage onNavigate={navigate} />;
      default:
        return <WelcomePage onNavigate={navigate} t={t} />;
    }
  };

  return (
    <div className="min-h-screen bg-[var(--app-bg)] text-[var(--app-fg)]">
      {/* 状态栏占位 */}
      <div className="h-6 w-full"></div>
      {appAlert?.message ? (
        <div className="px-5 pb-3">
          <AlertBar type={appAlert.type} message={appAlert.message} onClose={() => setAppAlert(null)} />
        </div>
      ) : null}
      {/* 页面内容 */}
      <div className="pb-12">
        {renderPage()}
      </div>
    </div>
  );
};

export default App;
