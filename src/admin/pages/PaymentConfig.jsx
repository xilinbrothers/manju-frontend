import React from 'react';

const PaymentConfig = () => {
  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div className="space-y-1">
          <div className="text-xl font-black text-slate-900">支付配置</div>
          <div className="text-sm text-slate-500 font-medium">配置 Telegram 支付与第三方支付通道（示例表单）</div>
        </div>
        <button className="h-10 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold transition-colors">
          保存全部
        </button>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 flex flex-col">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="h-11 w-11 rounded-2xl bg-[#24A1DE] flex items-center justify-center">
                <img src="https://telegram.org/img/t_logo.svg" className="w-6 h-6" alt="TG" />
              </div>
              <div className="min-w-0">
                <div className="text-base font-black text-slate-900">Telegram 支付</div>
                <div className="text-xs text-slate-500 font-medium">Stars / Provider Token</div>
              </div>
            </div>
            <button className="h-10 px-3 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold transition-colors">
              测试
            </button>
          </div>

          <div className="mt-6 space-y-4 flex-1">
            <div className="space-y-2">
              <label className="text-sm font-bold text-slate-700">Provider Token</label>
              <input
                type="password"
                className="w-full h-11 bg-slate-100 border border-slate-200 rounded-xl px-4 font-mono text-sm outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                placeholder="123456789:TEST:abcdefg..."
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-bold text-slate-700">币种 / 网络</label>
              <select className="w-full h-11 bg-slate-100 border border-slate-200 rounded-xl px-4 text-sm font-medium outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent">
                <option>USDT-TRC20</option>
                <option>TON</option>
                <option>CNY</option>
                <option>USD</option>
              </select>
            </div>

            <div className="rounded-2xl bg-indigo-50 border border-indigo-200 p-4 text-sm text-indigo-700 font-medium leading-relaxed">
              在 @BotFather 中开启 Payments 并获取 Provider Token 后填写此处。
            </div>
          </div>

          <div className="mt-6 flex gap-2">
            <button className="flex-1 h-11 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold transition-colors">
              重置
            </button>
            <button className="flex-1 h-11 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold transition-colors">
              保存
            </button>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 flex flex-col">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="h-11 w-11 rounded-2xl bg-[#1677FF] flex items-center justify-center">
                <img src="https://gw.alipayobjects.com/zos/rmsportal/nxpXpSpxvQpXpXp.png" className="w-6 h-6" alt="Alipay" />
              </div>
              <div className="min-w-0">
                <div className="text-base font-black text-slate-900">支付宝第三方</div>
                <div className="text-xs text-slate-500 font-medium">易支付 / 当面付 / 聚合</div>
              </div>
            </div>
            <button className="h-10 px-3 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold transition-colors">
              测试
            </button>
          </div>

          <div className="mt-6 space-y-4 flex-1">
            <div className="space-y-2">
              <label className="text-sm font-bold text-slate-700">接口 URL</label>
              <input
                type="text"
                className="w-full h-11 bg-slate-100 border border-slate-200 rounded-xl px-4 text-sm font-medium outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                placeholder="https://api.yourpay.com/submit.php"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-bold text-slate-700">AppId / PID</label>
                <input type="text" className="w-full h-11 bg-slate-100 border border-slate-200 rounded-xl px-4 text-sm font-medium outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent" />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-bold text-slate-700">超时时间 (秒)</label>
                <input type="number" defaultValue="300" className="w-full h-11 bg-slate-100 border border-slate-200 rounded-xl px-4 text-sm font-medium outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent" />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-bold text-slate-700">Key / Secret</label>
              <input type="password" title="Key/Secret" className="w-full h-11 bg-slate-100 border border-slate-200 rounded-xl px-4 text-sm font-medium outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent" />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-bold text-slate-700">回调地址 (Notify URL)</label>
              <input
                type="text"
                readOnly
                className="w-full h-11 bg-slate-100 border border-slate-200 rounded-xl px-4 text-slate-500 font-mono text-xs cursor-not-allowed"
                value="https://your-bot-backend.com/api/payment/notify"
              />
            </div>
          </div>

          <div className="mt-6 flex gap-2">
            <button className="flex-1 h-11 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold transition-colors">
              重置
            </button>
            <button className="flex-1 h-11 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold transition-colors">
              保存
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PaymentConfig;
