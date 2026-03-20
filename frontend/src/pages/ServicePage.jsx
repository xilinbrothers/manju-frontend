import React from 'react';
import BottomNav from '../components/BottomNav';
import Button from '../components/ui/Button';
import Card from '../components/ui/Card';
import SectionHeader from '../components/ui/SectionHeader';

const ServicePage = ({ onNavigate, supportLink = 'https://t.me/manjudingyue' }) => {
  return (
    <div className="flex flex-col min-h-screen bg-[var(--app-bg)] text-[var(--app-fg)] p-6 pb-24">
      <header className="mb-8">
        <SectionHeader title="联系客服" subtitle="遇到支付、进群或其他问题，客服会为你解答" />
      </header>

      <Card className="p-5">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-12 h-12 rounded-[var(--app-radius-md)] bg-black/15 border border-white/10 flex items-center justify-center">
            <span className="text-[22px]">💬</span>
          </div>
          <div className="text-[15px] font-black">人工客服</div>
        </div>
        <div className="text-[13px] text-[color:var(--app-muted)] leading-relaxed mb-5">
          点击下方按钮联系人工客服。支付成功后入群入口在「我的订阅」里。
        </div>
        <Button onClick={() => window.open(supportLink, '_blank')} className="rounded-full py-4 text-[15px] flex items-center justify-center gap-2">
          <span>👤</span>
          <span>联系人工客服</span>
        </Button>
      </Card>

      <div className="mt-4">
        <Button variant="ghost" onClick={() => onNavigate?.('welcome')} className="rounded-full py-4 text-[15px]">
          返回首页
        </Button>
      </div>

      <BottomNav current="service" onNavigate={onNavigate} />
    </div>
  );
};

export default ServicePage;

