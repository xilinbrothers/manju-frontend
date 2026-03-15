import React from 'react';

const CopywritingConfig = () => {
  const templates = [
    { 
      id: 'welcome', 
      name: '欢迎消息', 
      content: '你好 {user_name}！ 👋\n\n欢迎来到漫剧订阅助手！在这里你可以：\n\n📺 浏览并订阅全网热门漫剧\n🎟 付费进群观影，永久有效\n💎 支持多种支付方式\n\n请点击下方按钮开始探索吧！',
      vars: ['{user_name}']
    },
    { 
      id: 'pay_success', 
      name: '支付成功通知', 
      content: '🎉 支付成功！您已成功订阅《{series_name}》，套餐类型：{plan_name}。\n\n有效截止日期：{expire_date}\n请点击下方按钮进入观影群。',
      vars: ['{series_name}', '{plan_name}', '{expire_date}']
    },
    { 
      id: 'no_subs', 
      name: '无订阅提示', 
      content: '你当前还没有任何订阅。快去看看有没有喜欢的剧集吧！ 👇',
      vars: []
    },
    { 
      id: 'expire_remind', 
      name: '到期提醒', 
      content: '⚠️ 提醒：您的剧集《{series_name}》订阅即将于 {expire_date} 到期。为了不影响观影，请及时续费。',
      vars: ['{series_name}', '{expire_date}']
    }
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div className="space-y-1">
          <div className="text-xl font-black text-slate-900">文案配置</div>
          <div className="text-sm text-slate-500 font-medium">管理 Bot 消息模板（示例内容）</div>
        </div>
        <button className="h-10 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold transition-colors">
          保存所有文案
        </button>
      </div>

      <div className="grid grid-cols-2 gap-4">
        {templates.map((tpl) => (
          <div key={tpl.id} className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-black text-slate-900">{tpl.name}</h3>
              <button className="h-9 px-3 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-sm transition-colors">保存</button>
            </div>
            <div className="space-y-3 flex-1">
              <textarea 
                rows="6" 
                defaultValue={tpl.content}
                className="w-full bg-slate-100 border border-slate-200 rounded-2xl py-3 px-4 focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-colors text-sm leading-relaxed text-slate-800 font-medium"
              ></textarea>
              {tpl.vars.length > 0 && (
                <div className="flex flex-wrap gap-2 pt-1">
                  <span className="text-[11px] text-slate-500 font-black mr-2 self-center">可用变量</span>
                  {tpl.vars.map(v => (
                    <code key={v} className="px-2 py-1 bg-indigo-50 text-indigo-700 text-[11px] font-black rounded-lg border border-indigo-200 cursor-copy">
                      {v}
                    </code>
                  ))}
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default CopywritingConfig;
