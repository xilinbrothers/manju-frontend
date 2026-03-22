import React from 'react';
import BottomNav from '../components/BottomNav';
import Button from '../components/ui/Button';
import Card from '../components/ui/Card';
import SectionHeader from '../components/ui/SectionHeader';

const WelcomePage = ({ onNavigate, t }) => {
  return (
    <div className="relative min-h-screen bg-[#070A12] text-[var(--app-fg)] pb-24 overflow-hidden">
      <div className="absolute inset-0 pointer-events-none [background:radial-gradient(920px_620px_at_18%_12%,rgba(255,61,219,.30),transparent_62%),radial-gradient(920px_620px_at_82%_10%,rgba(46,233,255,.24),transparent_60%),radial-gradient(980px_760px_at_50%_110%,rgba(124,58,237,.20),transparent_62%),linear-gradient(to_bottom,#070A12,#0B1022)]" />

      <div className="relative px-6 pt-12 pb-10 min-h-[calc(100dvh-96px)] flex items-start justify-center">
        <div className="w-full max-w-[420px]">
          <div className="rounded-[28px] border border-white/12 bg-white/5 backdrop-blur-xl shadow-[0_24px_80px_rgba(255,61,219,.16),0_18px_60px_rgba(46,233,255,.10),0_14px_36px_rgba(0,0,0,.55)] overflow-hidden">
            <div className="px-6 pt-10 pb-8 flex flex-col min-h-[520px] text-center">
              <div className="mx-auto h-24 w-24 rounded-full bg-[linear-gradient(135deg,#FF3DDB_0%,#7C3AED_45%,#2EE9FF_100%)] shadow-[0_20px_70px_rgba(255,61,219,.18),0_14px_50px_rgba(46,233,255,.10)] flex items-center justify-center">
                <div className="h-[86px] w-[86px] rounded-full bg-black/25 border border-white/10 backdrop-blur flex items-center justify-center">
                  <span className="text-3xl font-black text-white">M</span>
                </div>
              </div>

              <div className="mt-7">
                <div className="text-[22px] leading-tight font-black tracking-tight text-transparent bg-clip-text bg-[linear-gradient(135deg,#FF3DDB_0%,#7C3AED_45%,#2EE9FF_100%)]">
                  {t?.welcome || '欢迎'}
                </div>
              </div>

              <div className="mt-4 text-[13px] leading-relaxed text-white/75">
                {t?.welcome_desc || ''}
              </div>

              <div className="flex-1" />

              <div className="space-y-4">
                <Button
                  onClick={() => onNavigate?.('series')}
                  className="py-4 rounded-2xl text-[15px] flex items-center justify-center gap-2 bg-[linear-gradient(135deg,#FF3DDB_0%,#7C3AED_45%,#2EE9FF_100%)] shadow-[0_18px_50px_rgba(255,61,219,.22),0_10px_30px_rgba(46,233,255,.16)] hover:brightness-110 hover:-translate-y-[1px] active:translate-y-0 active:brightness-95 focus:outline-none focus-visible:shadow-[0_0_0_3px_rgba(46,233,255,.35),0_0_0_1px_rgba(255,255,255,.18)_inset]"
                >
                  <span>🎬</span>
                  <span>{t?.view_all || '查看所有剧集'}</span>
                </Button>

                <div className="grid grid-cols-2 gap-4">
                  <Button
                    variant="ghost"
                    onClick={() => onNavigate?.('my-subs')}
                    className="py-4 rounded-2xl text-[14px] flex items-center justify-center gap-2 border border-white/18 bg-white/6 backdrop-blur text-white/90 hover:bg-white/10 hover:border-white/26 hover:-translate-y-[1px] active:translate-y-0 active:bg-white/7 focus:outline-none focus-visible:shadow-[0_0_0_3px_rgba(255,61,219,.22),0_0_0_1px_rgba(255,255,255,.18)_inset]"
                  >
                    <span>📌</span>
                    <span>{t?.my_subs || '我的订阅'}</span>
                  </Button>
                  <Button
                    variant="ghost"
                    onClick={() => onNavigate?.('service')}
                    className="py-4 rounded-2xl text-[14px] flex items-center justify-center gap-2 border border-white/18 bg-white/6 backdrop-blur text-white/90 hover:bg-white/10 hover:border-white/26 hover:-translate-y-[1px] active:translate-y-0 active:bg-white/7 focus:outline-none focus-visible:shadow-[0_0_0_3px_rgba(46,233,255,.28),0_0_0_1px_rgba(255,255,255,.18)_inset]"
                  >
                    <span>💬</span>
                    <span>{t?.contact_support || '联系客服'}</span>
                  </Button>
                </div>
              </div>
            </div>
          </div>

          {t?.explore ? (
            <div className="mt-6 text-center text-[12px] text-white/60">{t?.explore}</div>
          ) : null}
        </div>
      </div>

      <BottomNav current="welcome" onNavigate={onNavigate} />
    </div>
  );
};

export default WelcomePage;
