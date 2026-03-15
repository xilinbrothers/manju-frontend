import React, { useState } from 'react';

const SeriesManagement = () => {
  const [view, setView] = useState('list'); // 'list' or 'edit'
  const [editingSeries, setEditingSeries] = useState(null);

  const seriesData = [
    { id: 1, name: '重生之我是大魔王', status: '连载中', updated: 24, total: 50, groupBound: true, slug: 'reborn-demon' },
    { id: 2, name: '校园恋爱物语：第二季', status: '已完结', updated: 12, total: 12, groupBound: true, slug: 'school-love-2' },
    { id: 3, name: '星际争霸：破晓', status: '连载中', updated: 8, total: 20, groupBound: false, slug: 'star-war' },
  ];

  const handleEdit = (series) => {
    setEditingSeries(series);
    setView('edit');
  };

  const renderList = () => (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
      <div className="px-6 py-5 border-b border-slate-200 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="relative w-[360px]">
            <input
              type="text"
              placeholder="搜索剧名 / Slug / ID"
              className="w-full h-10 rounded-xl bg-slate-100 border border-slate-200 px-4 text-sm font-medium outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            />
          </div>
          <select className="h-10 rounded-xl bg-slate-100 border border-slate-200 px-3 text-sm font-semibold text-slate-700 outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent">
            <option>全部状态</option>
            <option>连载中</option>
            <option>已完结</option>
            <option>未开播</option>
          </select>
        </div>

        <button
          onClick={() => { setEditingSeries(null); setView('edit'); }}
          className="h-10 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold transition-colors flex items-center"
        >
          新建剧集
        </button>
      </div>

      <table className="w-full text-left">
        <thead className="bg-slate-50 text-slate-500 text-xs font-black uppercase tracking-wider">
          <tr>
            <th className="px-6 py-4 w-16">ID</th>
            <th className="px-6 py-4">剧集</th>
            <th className="px-6 py-4 w-24">状态</th>
            <th className="px-6 py-4 w-32">更新进度</th>
            <th className="px-6 py-4 w-28">群组</th>
            <th className="px-6 py-4 w-44 text-right">操作</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-200">
          {seriesData.map((item) => (
            <tr key={item.id} className="hover:bg-slate-50 transition-colors">
              <td className="px-6 py-4 text-sm font-mono text-slate-400">{item.id}</td>
              <td className="px-6 py-4">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-16 rounded-xl bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-400 text-xs font-bold">
                    Cover
                  </div>
                  <div className="min-w-0">
                    <div className="text-sm font-black text-slate-900 truncate">{item.name}</div>
                    <div className="text-xs text-slate-500 font-medium truncate">{item.slug}</div>
                  </div>
                </div>
              </td>
              <td className="px-6 py-4">
                <span className={`inline-flex items-center px-2.5 py-1 rounded-lg text-[11px] font-black border ${
                  item.status === '已完结'
                    ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                    : 'bg-indigo-50 text-indigo-700 border-indigo-200'
                }`}>
                  {item.status}
                </span>
              </td>
              <td className="px-6 py-4 text-sm text-slate-700 font-semibold">
                {item.updated} / {item.total} 集
              </td>
              <td className="px-6 py-4">
                <span className={`text-sm font-bold ${item.groupBound ? 'text-emerald-600' : 'text-slate-400'}`}>
                  {item.groupBound ? '已绑定' : '未绑定'}
                </span>
              </td>
              <td className="px-6 py-4 text-right">
                <button 
                  onClick={() => handleEdit(item)}
                  className="h-9 px-3 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-sm transition-colors mr-2"
                >
                  编辑
                </button>
                <button className="h-9 px-3 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 font-bold text-sm transition-colors">
                  下架
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );

  const renderEdit = () => (
    <div className="grid grid-cols-3 gap-4">
      <div className="lg:col-span-2 space-y-6">
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-6">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <div className="text-base font-black text-slate-900">基本信息</div>
              <div className="text-xs text-slate-500 font-medium">用于展示与内部管理</div>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-sm font-bold text-slate-700">剧名 *</label>
              <input 
                type="text" 
                defaultValue={editingSeries?.name} 
                className="w-full h-11 bg-slate-100 border border-slate-200 rounded-xl px-4 text-sm font-medium outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                placeholder="请输入剧集名称"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-bold text-slate-700">内部标识 (Slug)</label>
              <input 
                type="text" 
                defaultValue={editingSeries?.slug}
                className="w-full h-11 bg-slate-100 border border-slate-200 rounded-xl px-4 text-sm font-medium outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                placeholder="例如: demon-reborn"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-bold text-slate-700">状态</label>
              <select className="w-full h-11 bg-slate-100 border border-slate-200 rounded-xl px-4 text-sm font-medium outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent">
                <option>连载中</option>
                <option>已完结</option>
                <option>未开播</option>
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-bold text-slate-700">预计完结日期</label>
              <input type="date" className="w-full h-11 bg-slate-100 border border-slate-200 rounded-xl px-4 text-sm font-medium outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent" />
            </div>
          </div>
          <div className="space-y-2">
            <label className="text-sm font-bold text-slate-700">简介</label>
            <textarea 
              rows="4" 
              className="w-full bg-slate-100 border border-slate-200 rounded-xl py-3 px-4 text-sm font-medium outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              placeholder="请输入剧集简介..."
            ></textarea>
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-6">
          <div className="space-y-1">
            <div className="text-base font-black text-slate-900">群组 / 频道绑定</div>
            <div className="text-xs text-slate-500 font-medium">用于支付后跳转与进群信息下发</div>
          </div>
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-bold text-slate-700">观影群 ID / 邀请链接</label>
              <input 
                type="text" 
                className="w-full h-11 bg-slate-100 border border-slate-200 rounded-xl px-4 text-sm font-medium outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                placeholder="例如: -100123456789"
              />
            </div>
            <div className="p-4 bg-amber-50 rounded-2xl border border-amber-200">
              <p className="text-xs text-amber-700 leading-relaxed font-medium">
                💡 提示：需在 Telegram 群设置中手动开启“对新成员隐藏历史记录”，Bot 无法为单个用户单独解锁历史内容。
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="space-y-6">
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
          <div className="space-y-1">
            <div className="text-base font-black text-slate-900">封面</div>
            <div className="text-xs text-slate-500 font-medium">建议 16:9，清晰可读</div>
          </div>
          <div className="aspect-video w-full bg-slate-100 rounded-2xl border-2 border-dashed border-slate-200 flex flex-col items-center justify-center cursor-pointer hover:border-indigo-300 hover:bg-indigo-50 transition-colors">
            <div className="text-slate-400 font-black">上传封面</div>
            <div className="text-xs text-slate-500 font-medium mt-1">点击或拖拽</div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-5">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <div className="text-base font-black text-slate-900">套餐覆盖</div>
              <div className="text-xs text-slate-500 font-medium">为该剧集单独配置价格（示例）</div>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input type="checkbox" className="sr-only peer" />
              <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
            </label>
          </div>
          <div className="space-y-4 opacity-50 pointer-events-none">
             {['30天', '90天', '年度', '整部剧'].map(p => (
               <div key={p} className="flex items-center justify-between text-sm">
                 <span className="text-slate-700 font-semibold">{p}</span>
                 <input type="text" placeholder="默认价格" className="w-28 h-9 bg-slate-100 border border-slate-200 rounded-xl px-3 text-right font-mono text-sm outline-none" />
               </div>
             ))}
          </div>
        </div>

        <div className="flex flex-col space-y-3">
          <button className="w-full h-11 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl transition-colors">
            保存修改
          </button>
          <button 
            onClick={() => setView('list')}
            className="w-full h-11 bg-white border border-slate-200 text-slate-700 font-bold rounded-xl hover:bg-slate-50 transition-colors"
          >
            取消
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div className="space-y-1">
          <div className="text-xl font-black text-slate-900">剧集管理</div>
          <div className="text-sm text-slate-500 font-medium">管理剧集信息、绑定群组与基础配置（示例数据）</div>
        </div>
        {view === 'edit' && (
          <button
            onClick={() => setView('list')}
            className="h-10 px-4 rounded-xl bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 font-bold transition-colors"
          >
            返回列表
          </button>
        )}
      </div>

      {view === 'list' ? renderList() : renderEdit()}
    </div>
  );
};

export default SeriesManagement;
