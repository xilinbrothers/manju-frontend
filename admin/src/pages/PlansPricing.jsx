import React, { useState, useEffect } from 'react';
import { apiFetchJson } from '../utils/api';

const PlansPricing = () => {
  const [plans, setPlans] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setIsLoading(true);
      setError('');
      const data = await apiFetchJson('/api/admin/settings');
      setPlans(Array.isArray(data?.plans) ? data.plans : []);
    } catch (e) {
      setError(e?.message || '加载失败');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      setIsSaving(true);
      setError('');
      await apiFetchJson('/api/admin/settings', {
        method: 'POST',
        body: JSON.stringify({ plans })
      });
      alert('保存成功！');
      await loadData();
    } catch (e) {
      setError(e?.message || '保存失败');
      alert(e?.message || '保存失败');
    } finally {
      setIsSaving(false);
    }
  };

  const updatePlan = (index, field, value) => {
    const newPlans = [...plans];
    newPlans[index] = { ...newPlans[index], [field]: value };
    setPlans(newPlans);
  };

  const addPlan = () => {
    const newPlan = {
      id: `plan_${Date.now()}`,
      label: '新套餐',
      days: 30,
      priceCny: 9.9,
      enabled: true
    };
    setPlans([...plans, newPlan]);
  };

  const removePlan = (index) => {
    if (!window.confirm('确定删除此套餐吗？')) return;
    const newPlans = [...plans];
    newPlans.splice(index, 1);
    setPlans(newPlans);
  };

  if (isLoading) {
    return <div className="p-8 text-center text-slate-500 font-semibold">正在加载...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div className="space-y-1">
          <div className="text-xl font-black text-slate-900">全局套餐与定价</div>
          <div className="text-sm text-slate-500 font-medium">配置默认套餐，所有未单独覆盖套餐的剧集将使用此配置。</div>
        </div>
        <button 
          onClick={addPlan}
          className="h-10 px-4 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold transition-colors"
        >
          新增套餐
        </button>
      </div>

      <div className="bg-indigo-50 border border-indigo-200 rounded-2xl p-5">
        <div className="text-sm font-black text-indigo-800">说明</div>
        <div className="mt-1 text-sm text-indigo-700 font-medium leading-relaxed">
          各剧集可使用全局默认套餐，或在剧集编辑页覆盖为独立价格。天数设置为 <span className="font-black bg-indigo-100 px-1 rounded">0</span> 代表“整部剧/永久”，用户购买后将不会被踢出群组。
        </div>
      </div>

      {error && (
        <div className="p-4 bg-rose-50 text-rose-600 rounded-xl text-sm font-bold border border-rose-100">
          {error}
        </div>
      )}

      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <table className="w-full text-left">
          <thead className="bg-slate-50 text-slate-500 text-xs font-black uppercase tracking-wider">
            <tr>
              <th className="px-8 py-5">套餐名称 (Label)</th>
              <th className="px-8 py-5">时长 (天数，0为永久)</th>
              <th className="px-8 py-5">价格 (￥)</th>
              <th className="px-8 py-5">启用状态</th>
              <th className="px-8 py-5 text-right">操作</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200">
            {plans.map((plan, index) => (
              <tr key={plan.id} className="hover:bg-slate-50 transition-colors">
                <td className="px-8 py-5">
                  <input 
                    type="text" 
                    value={plan.label}
                    onChange={(e) => updatePlan(index, 'label', e.target.value)}
                    className="w-full bg-transparent border-none font-black text-slate-900 focus:ring-2 focus:ring-indigo-500 rounded-lg px-2 -ml-2"
                  />
                </td>
                <td className="px-8 py-5">
                  <input 
                    type="number" 
                    value={plan.days}
                    onChange={(e) => updatePlan(index, 'days', Number(e.target.value) || 0)}
                    className="bg-transparent border-none text-sm text-slate-700 font-semibold focus:ring-2 focus:ring-indigo-500 rounded-lg px-2 -ml-2 w-24"
                  />
                </td>
                <td className="px-8 py-5">
                  <input 
                    type="number" 
                    step="0.01"
                    value={plan.priceCny}
                    onChange={(e) => updatePlan(index, 'priceCny', Number(e.target.value) || 0)}
                    className="bg-transparent border-none text-sm font-mono text-indigo-700 font-bold focus:ring-2 focus:ring-indigo-500 rounded-lg px-2 -ml-2 w-28"
                  />
                </td>
                <td className="px-8 py-5">
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input 
                      type="checkbox" 
                      className="sr-only peer" 
                      checked={plan.enabled !== false} 
                      onChange={(e) => updatePlan(index, 'enabled', e.target.checked)}
                    />
                    <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-500"></div>
                  </label>
                </td>
                <td className="px-8 py-5 text-right">
                  <button 
                    onClick={() => removePlan(index)}
                    className="h-9 px-3 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-600 font-bold text-sm transition-colors"
                  >
                    删除
                  </button>
                </td>
              </tr>
            ))}
            {plans.length === 0 && (
              <tr>
                <td colSpan={5} className="px-8 py-8 text-center text-slate-500 text-sm font-semibold">
                  暂无全局套餐
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="flex justify-end">
        <button 
          onClick={handleSave}
          disabled={isSaving}
          className="h-11 px-8 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-bold transition-colors"
        >
          {isSaving ? '保存中...' : '保存全局配置'}
        </button>
      </div>
    </div>
  );
};

export default PlansPricing;
