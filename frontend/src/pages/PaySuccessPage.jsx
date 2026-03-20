import React from 'react';
import Button from '../components/ui/Button';
import Card from '../components/ui/Card';
import SectionHeader from '../components/ui/SectionHeader';

const PaySuccessPage = ({ t, onGoMySubs, onBackHome }) => {
  return (
    <div className="flex flex-col min-h-screen bg-[var(--app-bg)] text-[var(--app-fg)] p-5 pb-24 items-center text-center">
      <div className="mt-10 mb-8">
        <div className="w-24 h-24 bg-green-500 rounded-full flex items-center justify-center shadow-[0_0_40px_rgba(34,197,94,0.25)]">
          <svg className="w-12 h-12 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="4" d="M5 13l4 4L19 7"></path>
          </svg>
        </div>
      </div>

      <div className="w-full mb-6">
        <SectionHeader title={t?.pay_success || '支付成功'} subtitle={t?.sub_active || '订阅已激活'} />
      </div>

      <Card className="w-full p-6 mb-7 text-left">
        <div className="flex items-center gap-2 mb-6">
          <span className="text-orange-400">👑</span>
          <span className="text-[15px] font-black">{t?.benefits || '会员权益'}</span>
        </div>

        <div className="space-y-5">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 bg-blue-500/10 rounded-xl flex items-center justify-center flex-shrink-0">
              <span className="text-blue-500 text-lg">📅</span>
            </div>
            <div>
              <div className="text-[14px] font-bold">{t?.valid_until || '有效期至'}</div>
              <div className="text-[12px] text-[color:var(--app-muted)] mt-0.5">支付成功后可在「我的订阅」查看</div>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <div className="w-10 h-10 bg-purple-500/10 rounded-xl flex items-center justify-center flex-shrink-0">
              <span className="text-purple-500 text-lg">👥</span>
            </div>
            <div>
              <div className="text-[14px] font-bold">{t?.vip_group || '专属观影群'}</div>
              <div className="text-[12px] text-[color:var(--app-muted)] mt-0.5">进入「我的订阅」点击“进入群组”即可申请加入</div>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <div className="w-10 h-10 bg-green-500/10 rounded-xl flex items-center justify-center flex-shrink-0">
              <span className="text-green-500 text-lg">✓</span>
            </div>
            <div>
              <div className="text-[14px] font-bold">{t?.full_unlock || '全集解锁'}</div>
              <div className="text-[12px] text-[color:var(--app-muted)] mt-0.5">{t?.hd_no_ads || '高清无广告，更新秒推送'}</div>
            </div>
          </div>
        </div>
      </Card>

      <div className="w-full flex flex-col gap-3">
        <Button onClick={onGoMySubs} className="rounded-full py-4 text-[15px] flex items-center justify-center gap-2">
          <span>📌</span>
          <span>查看我的订阅</span>
        </Button>
        <Button variant="ghost" onClick={onBackHome} className="rounded-full py-4 text-[15px]">
          {t?.back_home || '返回首页'}
        </Button>
      </div>
    </div>
  );
};

export default PaySuccessPage;

