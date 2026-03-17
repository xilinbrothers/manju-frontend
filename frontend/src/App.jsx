import React, { useState, useEffect, useMemo } from 'react';
import WelcomePage from './pages/WelcomePage';
import SeriesListPage from './pages/SeriesListPage';
import PlansPage from './pages/PlansPage';
import MySubscriptionsPage from './pages/MySubscriptionsPage';
// AdminApp 不需要在 App.jsx 中导入，因为它在 main.jsx 中通过路由直接使用
import { getTranslation } from './utils/i18n';
import { getApiBaseUrl } from './utils/api';

const App = () => {
  const [currentPage, setCurrentPage] = useState('welcome');
  const [selectedSeries, setSelectedSeries] = useState(null);
  const [selectedPlan, setSelectedPlan] = useState(null);

  // 多语言支持
  const lang = useMemo(() => {
    if (window.Telegram?.WebApp?.initDataUnsafe?.user?.language_code === 'en') return 'en';
    return 'zh';
  }, []);
  const t = getTranslation(lang);

  // 模拟 Telegram Web App 样式初始化
  useEffect(() => {
    const p = window.location?.pathname || '/';
    if (p.startsWith('/my-subs')) setCurrentPage('my-subs');
    else if (p.startsWith('/series')) setCurrentPage('series');
    else setCurrentPage('welcome');
  }, []);

  const startPayment = async (paymentMethod) => {
    if (!selectedSeries?.id || !selectedPlan?.id) {
      alert('请选择剧集和套餐');
      return;
    }
    if (paymentMethod === 'usdt') {
      alert('USDT 暂不支持自动支付，请联系客服完成付款');
      navigate('service');
      return;
    }
    if (paymentMethod === 'stars') {
      alert('Telegram Stars 支付已下线');
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
        }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok || !data?.success) throw new Error(data?.message || `创建订单失败: ${res.status}`);

      if (data?.pay?.type === 'alipay' && data?.pay?.url) {
        window.open(data.pay.url, '_blank');
        alert('请在新打开的页面中完成支付，支付成功后返回查看“我的订阅”。');
        return;
      }

      alert('未获取到支付信息');
    } catch (e) {
      alert(e?.message || '支付失败');
    }
  };

  useEffect(() => {
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

    document.body.style.backgroundColor = '#0F172A';
    document.body.style.color = '#FFFFFF';
    document.body.style.margin = '0';
    document.body.style.fontFamily = 'Inter, -apple-system, sans-serif';
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
        else if (currentPage === 'plans') navigate('series');
        else if (currentPage === 'payment') navigate('plans');
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
      tg.MainButton.setParams({
        text: `确认支付 ￥${selectedPlan?.price || '69.9'}`,
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
  }, [currentPage, selectedPlan, selectedSeries]);

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
            onSelectSeries={setSelectedSeries} 
            t={t}
          />
        );
      case 'plans':
        return (
          <PlansPage 
            series={selectedSeries} 
            onSelectPlan={setSelectedPlan} 
            onNavigate={navigate} 
            t={t}
          />
        );
      case 'payment':
        return (
          <div className="flex flex-col min-h-screen bg-[#0F172A] text-white p-5">
            <h2 className="text-[20px] font-black mb-8 px-1">{t.order_confirm}</h2>
            
            <div className="bg-[#1A2333] rounded-3xl p-6 mb-6 border border-gray-800/50 space-y-5 shadow-xl">
              <div className="flex justify-between items-center text-[14px]">
                <span className="text-gray-400">{t.sub_series}</span>
                <span className="font-bold">{selectedSeries?.title || 'Series Name'}</span>
              </div>
              <div className="flex justify-between items-center text-[14px]">
                <span className="text-gray-400">{t.sub_duration}</span>
                <span className="font-bold">{selectedPlan?.label || '30 days'}</span>
              </div>
              <div className="border-t border-gray-800/50 pt-4 flex justify-between items-center">
                <span className="text-gray-400 text-[14px]">{t.order_amount}</span>
                <span className="text-[22px] font-black font-mono text-white">￥{selectedPlan?.price || '69.9'}</span>
              </div>
            </div>



            <h4 className="text-[15px] font-bold mb-5 px-1">{t.select_pay_method}</h4>

            <div className="flex flex-col space-y-3.5 mb-24">
              <button 
                onClick={() => startPayment('usdt')}
                className="w-full p-5 bg-[#1A2333] hover:bg-[#252D3F] rounded-3xl border border-gray-800 flex items-center group transition-all"
              >
                <div className="w-12 h-12 bg-green-500 rounded-2xl flex items-center justify-center mr-4 shadow-lg shadow-green-500/20">
                  <span className="text-white font-bold">₿</span>
                </div>
                <div className="flex-1 text-left">
                  <div className="text-[15px] font-bold">USDT（联系客服）</div>
                  <div className="text-[11px] text-gray-500">暂不支持自动支付，人工对接</div>
                </div>
              </button>
              
              <button 
                onClick={() => startPayment('alipay')}
                className="w-full p-5 bg-[#1A2333] hover:bg-[#252D3F] rounded-3xl border border-gray-800 flex items-center group transition-all"
              >
                <div className="w-12 h-12 bg-[#1677FF] rounded-2xl flex items-center justify-center mr-4 shadow-lg shadow-blue-500/20">
                  <img src="https://www.alipayobjects.com/static/images/common/logo.png" className="w-6 h-6" alt="支付宝" />
                </div>
                <div className="flex-1 text-left">
                  <div className="text-[15px] font-bold">支付宝（Alipay）</div>
                  <div className="text-[11px] text-gray-500">Fast & Secure</div>
                </div>
              </button>
            </div>
            
            {/* 已移除页面底部的固定确认按钮，改用 Telegram 原生 MainButton */}
          </div>
        );
      case 'success':
        return (
          <div className="flex flex-col min-h-screen bg-[#0F172A] p-5 text-center items-center">
            <div className="mt-12 mb-10 relative">
              <div className="w-24 h-24 bg-green-500 rounded-full flex items-center justify-center shadow-[0_0_40px_rgba(34,197,94,0.3)] animate-in zoom-in duration-500">
                <svg className="w-12 h-12 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="4" d="M5 13l4 4L19 7"></path>
                </svg>
              </div>
            </div>

            <h2 className="text-[24px] font-black text-white mb-2">{t.pay_success}</h2>
            <p className="text-gray-400 text-[14px] mb-10">{t.sub_active}</p>

            <div className="w-full bg-[#1A2333] rounded-3xl p-6 mb-8 border border-gray-800/50 text-left shadow-xl">
              <div className="flex items-center space-x-2 mb-6">
                <span className="text-orange-400">👑</span>
                <span className="text-[15px] font-bold text-white">{t.benefits}</span>
              </div>
              
              <div className="space-y-6">
                <div className="flex items-start space-x-4">
                  <div className="w-10 h-10 bg-blue-500/10 rounded-xl flex items-center justify-center flex-shrink-0">
                    <span className="text-blue-500 text-lg">📅</span>
                  </div>
                  <div>
                    <div className="text-[14px] font-bold text-white">{t.valid_until}</div>
                    <div className="text-[12px] text-gray-400 mt-0.5">2026-06-14 23:59</div>
                  </div>
                </div>

                <div className="flex items-start space-x-4">
                  <div className="w-10 h-10 bg-purple-500/10 rounded-xl flex items-center justify-center flex-shrink-0">
                    <span className="text-purple-500 text-lg">👥</span>
                  </div>
                  <div>
                    <div className="text-[14px] font-bold text-white">{t.vip_group}</div>
                    <div className="text-[12px] text-gray-400 mt-0.5">请进入"我的订阅"查看并进入VIP群</div>
                  </div>
                </div>

                <div className="flex items-start space-x-4">
                  <div className="w-10 h-10 bg-green-500/10 rounded-xl flex items-center justify-center flex-shrink-0">
                    <span className="text-green-500 text-lg">✓</span>
                  </div>
                  <div>
                    <div className="text-[14px] font-bold text-white">{t.full_unlock}</div>
                    <div className="text-[12px] text-gray-400 mt-0.5">{t.hd_no_ads}</div>
                  </div>
                </div>
              </div>
            </div>

            <div className="w-full flex flex-col space-y-3.5 pb-10">
              <button onClick={() => navigate('my-subs')} className="w-full py-4.5 bg-[#3B82F6] hover:bg-blue-600 text-white text-[16px] font-bold rounded-full shadow-lg shadow-blue-900/20 transition-all active:scale-[0.98] flex items-center justify-center space-x-2">
                <span>📌</span>
                <span>查看我的订阅</span>
              </button>
              <button 
                onClick={() => navigate('welcome')}
                className="w-full py-4.5 bg-transparent hover:bg-white/5 text-gray-300 text-[16px] font-bold rounded-full transition-all border border-gray-800/50"
              >
                {t.back_home}
              </button>
            </div>
          </div>
        );
      case 'my-subs':
        return <MySubscriptionsPage onNavigate={navigate} />;
      case 'service':
        return (
          <div className="flex flex-col min-h-screen bg-[#0F172A] text-white p-6 items-center justify-center text-center">
            <div className="w-24 h-24 bg-[#1A2333] rounded-full flex items-center justify-center mb-8 shadow-2xl border border-gray-800/50">
              <div className="text-4xl">💬</div>
            </div>
            <h3 className="text-[20px] font-bold mb-4">联系客服</h3>
            <p className="text-gray-400 text-[14px] max-w-[240px] leading-relaxed mb-10">
              遇到支付、进群或其他问题？<br/>
              点击下方按钮联系我们的人工客服，我们将为您提供 1对1 服务。
            </p>
            <button 
              className="w-full py-4.5 bg-[#3B82F6] hover:bg-blue-600 text-white font-bold rounded-full shadow-lg shadow-blue-900/20 transition-all active:scale-[0.98] flex items-center justify-center space-x-2"
              onClick={() => window.open('https://t.me/manjudingyue', '_blank')}
            >
              <span>👤</span>
              <span>联系人工客服</span>
            </button>
            
            <button 
              onClick={() => navigate('welcome')}
              className="mt-6 text-gray-500 text-[14px] hover:text-white transition-colors"
            >
              返回首页
            </button>
          </div>
        );
      default:
        return <WelcomePage onNavigate={navigate} />;
    }
  };

  return (
    <div className="min-h-screen bg-[#0F172A] text-white">
      {/* 状态栏占位 */}
      <div className="h-6 w-full"></div>
      {/* 页面内容 */}
      <div className="pb-12">
        {renderPage()}
      </div>
    </div>
  );
};

export default App;
