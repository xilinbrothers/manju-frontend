import React from 'react';
import BottomNav from '../components/BottomNav';
import Button from '../components/ui/Button';
import Card from '../components/ui/Card';
import SectionHeader from '../components/ui/SectionHeader';

const WelcomePage = ({ onNavigate, t }) => {
  return (
    <div className="flex flex-col p-5 min-h-screen bg-[var(--app-bg)] text-[var(--app-fg)] pb-24">
      <div className="mb-6">
        <SectionHeader title={t?.welcome || '欢迎'} subtitle={t?.welcome_desc || ''} />
      </div>

      <div className="space-y-4">
        <Card className="p-4">
          <div className="text-[13px] text-[color:var(--app-muted)] leading-relaxed">
            {t?.welcome_desc || ''}
          </div>
        </Card>

        <Card className="p-4">
          <div className="text-[14px] font-black mb-3">你可以在这里</div>
          <div className="space-y-3">
            {(t?.features || []).map((feature, index) => (
              <div key={index} className="flex items-start gap-3">
                <div className="w-7 h-7 rounded-xl bg-black/15 border border-white/10 flex items-center justify-center flex-shrink-0">
                  <span className="text-[14px]">{['✨', '🎯', '🚀'][index] || '•'}</span>
                </div>
                <div className="text-[13px] text-[color:var(--app-muted)] leading-relaxed">{feature}</div>
              </div>
            ))}
          </div>
        </Card>

        <div className="pt-2">
          <div className="text-[12px] text-[color:var(--app-muted)]">{t?.explore || ''}</div>
        </div>
      </div>

      <div className="mt-auto flex flex-col gap-3 pb-2">
        <Button onClick={() => onNavigate?.('series')} className="py-4 rounded-full text-[15px] flex items-center justify-center gap-2">
          <span>🎬</span>
          <span>{t?.view_all || '查看所有剧集'}</span>
        </Button>
        <Button
          variant="ghost"
          onClick={() => onNavigate?.('my-subs')}
          className="py-4 rounded-full text-[15px] flex items-center justify-center gap-2"
        >
          <span>📌</span>
          <span>{t?.my_subs || '我的订阅'}</span>
        </Button>
        <Button
          variant="ghost"
          onClick={() => onNavigate?.('service')}
          className="py-4 rounded-full text-[15px] flex items-center justify-center gap-2"
        >
          <span>💬</span>
          <span>{t?.contact_support || '联系客服'}</span>
        </Button>
      </div>

      <BottomNav current="welcome" onNavigate={onNavigate} />
    </div>
  );
};

export default WelcomePage;
