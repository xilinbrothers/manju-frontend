import React, { useEffect, useMemo, useRef, useState } from 'react';
import { apiFetchJson, getApiBaseUrl } from '../utils/api';

const SeriesManagement = () => {
  const [view, setView] = useState('list'); // 'list' or 'edit'
  const [editingSeries, setEditingSeries] = useState(null);
  const [draft, setDraft] = useState(null);
  const [items, setItems] = useState([]);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const coverInputRef = useRef(null);
  const [isUploadingCover, setIsUploadingCover] = useState(false);

  const refresh = async () => {
    try {
      setError('');
      setIsLoading(true);
      const data = await apiFetchJson('/api/admin/series');
      setItems(Array.isArray(data?.items) ? data.items : []);
    } catch (e) {
      setError(e?.message || '加载失败');
      setItems([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    refresh();
  }, []);

  const seriesData = useMemo(() => {
    return items.map((s) => ({
      id: s.id,
      name: s.title,
      status: s.status,
      updated: s.updated || 0,
      total: s.total || 0,
      groupBound: Boolean(s.trialGroupId && s.vipGroupId),
      slug: s.slug || s.id,
      raw: s,
    }));
  }, [items]);

  const handleEdit = (series) => {
    setEditingSeries(series);
    const raw = series?.raw || {};
    setDraft({
      id: raw.id || '',
      title: raw.title || '',
      description: raw.description || '',
      cover: raw.cover || '',
      status: raw.status || '连载中',
      total: raw.total || 0,
      category: raw.category || '',
      enabled: raw.enabled !== false,
      trialGroupId: raw.trialGroupId || '',
      vipGroupId: raw.vipGroupId || '',
      memberGroupId: raw.memberGroupId || '',
    });
    setView('edit');
  };

  const slugify = (value) => {
    const s = String(value || '')
      .toLowerCase()
      .trim()
      .replace(/\s+/g, '-')
      .replace(/[^a-z0-9_-]/g, '')
      .replace(/-+/g, '-')
      .replace(/^-+|-+$/g, '');
    return s;
  };

  const buildDefaultId = () => `series_${Date.now()}`;

  const imageFileToCoverBlob = async (file) => {
    const ok = /image\/(png|jpeg|webp)/.test(file.type || '');
    if (!ok) throw new Error('仅支持 JPG/PNG/WEBP 图片');
    const img = await new Promise((resolve, reject) => {
      const url = URL.createObjectURL(file);
      const i = new Image();
      i.onload = () => {
        URL.revokeObjectURL(url);
        resolve(i);
      };
      i.onerror = () => {
        URL.revokeObjectURL(url);
        reject(new Error('图片加载失败'));
      };
      i.src = url;
    });

    const srcW = img.naturalWidth || img.width;
    const srcH = img.naturalHeight || img.height;
    if (srcW < 640 || srcH < 360) throw new Error('图片分辨率过低，请至少 640×360');

    const targetW = 960;
    const targetH = 540;
    const targetRatio = targetW / targetH;
    const srcRatio = srcW / srcH;

    let cropW = srcW;
    let cropH = srcH;
    if (srcRatio > targetRatio) {
      cropW = Math.round(srcH * targetRatio);
    } else {
      cropH = Math.round(srcW / targetRatio);
    }
    const cropX = Math.round((srcW - cropW) / 2);
    const cropY = Math.round((srcH - cropH) / 2);

    const canvas = document.createElement('canvas');
    canvas.width = targetW;
    canvas.height = targetH;
    const ctx = canvas.getContext('2d');
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(img, cropX, cropY, cropW, cropH, 0, 0, targetW, targetH);

    const maxBytes = 450 * 1024;
    let q = 0.86;
    let blob = await new Promise((resolve) => canvas.toBlob(resolve, 'image/webp', q));
    while (blob && blob.size > maxBytes && q > 0.62) {
      q = Math.max(0.62, q - 0.06);
      blob = await new Promise((resolve) => canvas.toBlob(resolve, 'image/webp', q));
    }
    if (!blob) throw new Error('图片处理失败');
    return blob;
  };

  const uploadCover = async (file) => {
    const blob = await imageFileToCoverBlob(file);
    const fd = new FormData();
    fd.append('file', blob, 'cover.webp');
    const baseUrl = getApiBaseUrl();
    const res = await fetch(`${baseUrl}/api/admin/upload/cover`, { method: 'POST', body: fd });
    const data = await res.json().catch(() => null);
    if (!res.ok || !data?.success || !data?.url) throw new Error(data?.message || `上传失败: ${res.status}`);
    return `${baseUrl}${data.url}`;
  };

  const onPickCover = async (file) => {
    if (!file) return;
    try {
      setIsUploadingCover(true);
      const url = await uploadCover(file);
      setDraft((d) => ({ ...(d || {}), cover: url }));
    } catch (e) {
      alert(e?.message || '封面上传失败');
    } finally {
      setIsUploadingCover(false);
      if (coverInputRef.current) coverInputRef.current.value = '';
    }
  };

  const renderList = () => (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
      <div className="px-6 py-5 border-b border-slate-200 flex items-center justify-between">
        <div className="flex items-center gap-3 min-w-0">
          <div className="relative w-[360px] max-w-[42vw] min-w-[220px]">
            <input
              type="text"
              placeholder="搜索剧名 / Slug / ID"
              className="w-full h-10 rounded-xl bg-slate-100 border border-slate-200 px-4 text-sm font-medium outline-none focus:ring-2 focus:ring-slate-900/20 focus:border-slate-300"
            />
          </div>
        </div>

        <button
          onClick={() => {
            setEditingSeries(null);
            setDraft({
              id: buildDefaultId(),
              title: '',
              description: '',
              cover: '',
              status: '连载中',
              total: 0,
              category: '',
              enabled: true,
              trialGroupId: '',
              vipGroupId: '',
              memberGroupId: '',
            });
            setView('edit');
          }}
          className="h-10 px-4 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold transition-colors flex items-center"
        >
          新建漫剧
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
          {isLoading && (
            <tr>
              <td className="px-6 py-6 text-sm text-slate-500 font-semibold" colSpan={6}>正在加载…</td>
            </tr>
          )}
          {!isLoading && error && (
            <tr>
              <td className="px-6 py-6 text-sm text-rose-700 font-semibold" colSpan={6}>{error}</td>
            </tr>
          )}
          {!isLoading && !error && seriesData.length === 0 && (
            <tr>
              <td className="px-6 py-6 text-sm text-slate-500 font-semibold" colSpan={6}>暂无剧集</td>
            </tr>
          )}
          {!isLoading && !error && seriesData.map((item) => (
            <tr key={item.id} className="hover:bg-slate-50 transition-colors">
              <td className="px-6 py-4 text-sm font-mono text-slate-400">{item.id}</td>
              <td className="px-6 py-4">
                <div className="flex items-center gap-3">
                  {item.raw?.cover ? (
                    <img src={item.raw.cover} alt="cover" className="h-10 w-16 rounded-xl object-cover border border-slate-200 bg-slate-100" />
                  ) : (
                    <div className="h-10 w-16 rounded-xl bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-400 text-xs font-bold">
                      Cover
                    </div>
                  )}
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
                <button
                  onClick={async () => {
                    if (!confirm('确认删除该剧集？')) return;
                    try {
                      await apiFetchJson(`/api/admin/series/${encodeURIComponent(item.id)}`, { method: 'DELETE' });
                      refresh();
                    } catch (e) {
                      alert(e?.message || '删除失败');
                    }
                  }}
                  className="h-9 px-3 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 font-bold text-sm transition-colors"
                >
                  删除
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );

  const renderEdit = () => (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
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
                value={draft?.title || ''}
                onChange={(e) => setDraft((d) => ({ ...(d || {}), title: e.target.value }))}
                className="w-full h-11 bg-slate-100 border border-slate-200 rounded-xl px-4 text-sm font-medium outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                placeholder="请输入剧集名称"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-bold text-slate-700">内部标识（Slug）</label>
              <input 
                type="text" 
                value={draft?.id || ''}
                onChange={(e) => setDraft((d) => ({ ...(d || {}), id: slugify(e.target.value) }))}
                className="w-full h-11 bg-slate-100 border border-slate-200 rounded-xl px-4 text-sm font-medium outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                placeholder="例如: series_001 / manju_001"
              />
              <div className="text-[11px] text-slate-500 font-medium leading-relaxed">
                Slug 是剧集唯一标识，会用于接口与数据关联，建议只用小写字母/数字/下划线/短横线，且全局唯一。
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-bold text-slate-700">状态</label>
              <select
                value={draft?.status || '连载中'}
                onChange={(e) => setDraft((d) => ({ ...(d || {}), status: e.target.value }))}
                className="w-full h-11 bg-slate-100 border border-slate-200 rounded-xl px-4 text-sm font-medium outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              >
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
          <div className="grid grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-sm font-bold text-slate-700">总集数</label>
              <input
                type="number"
                value={draft?.total ?? 0}
                onChange={(e) => setDraft((d) => ({ ...(d || {}), total: Number(e.target.value || 0) }))}
                className="w-full h-11 bg-slate-100 border border-slate-200 rounded-xl px-4 text-sm font-medium outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-bold text-slate-700">分类</label>
              <input
                type="text"
                value={draft?.category || ''}
                onChange={(e) => setDraft((d) => ({ ...(d || {}), category: e.target.value }))}
                className="w-full h-11 bg-slate-100 border border-slate-200 rounded-xl px-4 text-sm font-medium outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              />
            </div>
          </div>
          <div className="space-y-2">
            <label className="text-sm font-bold text-slate-700">简介</label>
            <textarea 
              rows="4" 
              value={draft?.description || ''}
              onChange={(e) => setDraft((d) => ({ ...(d || {}), description: e.target.value }))}
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
              <label className="text-sm font-bold text-slate-700">试看群 ID / 邀请链接</label>
              <input 
                type="text" 
                value={draft?.trialGroupId || ''}
                onChange={(e) => setDraft((d) => ({ ...(d || {}), trialGroupId: e.target.value }))}
                className="w-full h-11 bg-slate-100 border border-slate-200 rounded-xl px-4 text-sm font-medium outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                placeholder="例如: -100123456789"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-bold text-slate-700">VIP群 ID / 邀请链接</label>
              <input 
                type="text" 
                value={draft?.vipGroupId || ''}
                onChange={(e) => setDraft((d) => ({ ...(d || {}), vipGroupId: e.target.value }))}
                className="w-full h-11 bg-slate-100 border border-slate-200 rounded-xl px-4 text-sm font-medium outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                placeholder="例如: -100123456789"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-bold text-slate-700">会员群 ID / 邀请链接</label>
              <input 
                type="text" 
                value={draft?.memberGroupId || ''}
                onChange={(e) => setDraft((d) => ({ ...(d || {}), memberGroupId: e.target.value }))}
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
            <div className="text-xs text-slate-500 font-medium">要求 16:9，自动居中裁剪并压缩（建议至少 640×360）</div>
          </div>
          <input
            ref={coverInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => onPickCover(e.target.files?.[0] || null)}
          />
          <div
            className="aspect-video w-full bg-slate-100 rounded-2xl border-2 border-dashed border-slate-200 flex items-center justify-center cursor-pointer hover:border-slate-300 hover:bg-slate-50 transition-colors overflow-hidden relative"
            onClick={() => coverInputRef.current?.click()}
            onDragOver={(e) => {
              e.preventDefault();
              e.stopPropagation();
            }}
            onDrop={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onPickCover(e.dataTransfer?.files?.[0] || null);
            }}
          >
            {draft?.cover ? (
              <img src={draft.cover} alt="cover" className="absolute inset-0 h-full w-full object-cover" />
            ) : null}
            <div className={`relative text-center ${draft?.cover ? 'bg-white/80 border border-white/60' : ''} rounded-xl px-4 py-3`}>
              <div className="text-slate-700 font-black">{isUploadingCover ? '上传中…' : draft?.cover ? '更换封面' : '上传封面'}</div>
              <div className="text-xs text-slate-600 font-medium mt-1">点击或拖拽图片</div>
            </div>
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
          <button
            onClick={async () => {
              try {
                if (!draft?.title) return alert('请填写剧名');
                if (editingSeries?.id) {
                  await apiFetchJson(`/api/admin/series/${encodeURIComponent(editingSeries.id)}`, {
                    method: 'PUT',
                    body: JSON.stringify(draft),
                  });
                } else {
                  await apiFetchJson('/api/admin/series', {
                    method: 'POST',
                    body: JSON.stringify(draft),
                  });
                }
                setView('list');
                refresh();
              } catch (e) {
                alert(e?.message || '保存失败');
              }
            }}
            className="w-full h-11 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl transition-colors"
          >
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
