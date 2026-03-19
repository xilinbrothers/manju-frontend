import React, { useEffect, useState } from 'react';
import { apiFetchJson } from '../utils/api';
import { getApiBaseUrl } from '../utils/api';

const PaymentConfig = () => {
  const [draft, setDraft] = useState({
    alipay: { merchantNo: '', merchantKey: '', apiUrl: '', productId: '' },
  });
  const [error, setError] = useState('');

  const refresh = async () => {
    try {
      setError('');
      const data = await apiFetchJson('/api/admin/payment');
      setDraft({
        alipay: {
          merchantNo: data?.payment?.alipay?.merchantNo || '',
          merchantKey: data?.payment?.alipay?.merchantKey || '',
          apiUrl: data?.payment?.alipay?.apiUrl || '',
          productId: data?.payment?.alipay?.productId || '',
        },
      });
    } catch (e) {
      setError(e?.message || '加载失败');
    }
  };

  useEffect(() => {
    refresh();
  }, []);

  const saveAll = async () => {
    try {
      setError('');
      await apiFetchJson('/api/admin/payment', { method: 'POST', body: JSON.stringify(draft) });
      alert('已保存');
      refresh();
    } catch (e) {
      setError(e?.message || '保存失败');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div className="space-y-1">
          <div className="text-xl font-black text-slate-900">支付配置</div>
          <div className="text-sm text-slate-500 font-medium">配置支付宝通道</div>
        </div>
        <button onClick={saveAll} className="h-10 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold transition-colors">
          保存全部
        </button>
      </div>

      {error && (
        <div className="bg-rose-50 border border-rose-200 text-rose-700 text-sm font-semibold rounded-2xl p-4">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 gap-4">
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
              <label className="text-sm font-bold text-slate-700">下单地址</label>
              <input
                type="text"
                value={draft.alipay.apiUrl}
                onChange={(e) => setDraft((d) => ({ ...d, alipay: { ...d.alipay, apiUrl: e.target.value } }))}
                className="w-full h-11 bg-slate-100 border border-slate-200 rounded-xl px-4 text-sm font-medium outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                placeholder="http://host:port 或 http://host:port/api/order/create"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-bold text-slate-700">商户编号 (merchant_no)</label>
                <input
                  type="text"
                  value={draft.alipay.merchantNo}
                  onChange={(e) => setDraft((d) => ({ ...d, alipay: { ...d.alipay, merchantNo: e.target.value } }))}
                  className="w-full h-11 bg-slate-100 border border-slate-200 rounded-xl px-4 text-sm font-medium outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-bold text-slate-700">回调路径</label>
                <input type="text" readOnly value="/api/order/notify" className="w-full h-11 bg-slate-100 border border-slate-200 rounded-xl px-4 text-slate-500 font-mono text-xs cursor-not-allowed" />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-bold text-slate-700">产品编号 (product_id)</label>
              <input
                type="text"
                value={draft.alipay.productId}
                onChange={(e) => setDraft((d) => ({ ...d, alipay: { ...d.alipay, productId: e.target.value } }))}
                className="w-full h-11 bg-slate-100 border border-slate-200 rounded-xl px-4 text-sm font-medium outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                placeholder="如支付平台要求填写通道编码/产品编号"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-bold text-slate-700">商户密钥 (key)</label>
              <input
                type="password"
                value={draft.alipay.merchantKey}
                onChange={(e) => setDraft((d) => ({ ...d, alipay: { ...d.alipay, merchantKey: e.target.value } }))}
                className="w-full h-11 bg-slate-100 border border-slate-200 rounded-xl px-4 text-sm font-medium outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-bold text-slate-700">回调地址 (Notify URL)</label>
              <input
                type="text"
                readOnly
                className="w-full h-11 bg-slate-100 border border-slate-200 rounded-xl px-4 text-slate-500 font-mono text-xs cursor-not-allowed"
                value={`${getApiBaseUrl()}/api/order/notify`}
              />
            </div>
          </div>

          <div className="mt-6 flex gap-2">
            <button onClick={refresh} className="flex-1 h-11 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold transition-colors">
              重置
            </button>
            <button onClick={saveAll} className="flex-1 h-11 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold transition-colors">
              保存
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PaymentConfig;
