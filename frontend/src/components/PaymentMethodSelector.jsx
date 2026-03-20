import React from 'react';
import Card from './ui/Card';

const PaymentMethodSelector = ({ title = '选择支付方式', onSelectAlipay, disabled = false, className = '' }) => {
  return (
    <div className={className}>
      <h4 className="text-[15px] font-bold mb-5 px-1">{title}</h4>
      <Card className="p-5">
        <button
          disabled={disabled}
          onClick={onSelectAlipay}
          className="w-full flex items-center transition-all active:scale-[0.99] disabled:cursor-default"
        >
          <div className="w-6 h-6 rounded-full border-2 flex items-center justify-center mr-4 border-blue-500 bg-blue-500">
            <div className="w-2.5 h-2.5 bg-white rounded-full"></div>
          </div>
          <div className="w-12 h-12 bg-[#1677FF] rounded-[var(--app-radius-md)] flex items-center justify-center mr-4 shadow-[0_18px_40px_rgba(22,119,255,0.18)]">
            <img src="https://www.alipayobjects.com/static/images/common/logo.png" className="w-6 h-6" alt="支付宝" />
          </div>
          <div className="flex-1 text-left">
            <div className="text-[15px] font-bold">支付宝（Alipay）</div>
            <div className="text-[11px] text-[color:var(--app-muted)]">默认选中，不可取消</div>
          </div>
        </button>
      </Card>
    </div>
  );
};

export default PaymentMethodSelector;

