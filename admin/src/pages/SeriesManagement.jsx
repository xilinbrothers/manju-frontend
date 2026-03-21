import React, { useEffect, useMemo, useRef, useState } from 'react';
import { apiFetchJson, getApiBaseUrl } from '../utils/api';
import Button from '../components/ui/Button';
import Card from '../components/ui/Card';
import PageHeader from '../components/ui/PageHeader';

const SeriesManagement = ({ onAlert }) => {
  const [view, setView] = useState('list'); // 'list' or 'edit'
  const [editingSeries, setEditingSeries] = useState(null);
  const [draft, setDraft] = useState(null);
  const [items, setItems] = useState([]);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [globalPlans, setGlobalPlans] = useState([]);
  const coverInputRef = useRef(null);
  const seasonCoverInputRef = useRef(null);
  const [isUploadingCover, setIsUploadingCover] = useState(false);
  const [isUploadingSeasonCover, setIsUploadingSeasonCover] = useState(false);
  const [seasonCoverPickIndex, setSeasonCoverPickIndex] = useState(-1);

  const refresh = async () => {
    try {
      setError('');
      setIsLoading(true);
      const [data, settingsData] = await Promise.all([
        apiFetchJson('/api/admin/series'),
        apiFetchJson('/api/admin/settings')
      ]);
      setItems(Array.isArray(data?.items) ? data.items : []);
      setGlobalPlans(Array.isArray(settingsData?.plans) ? settingsData.plans : []);
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
      planOverride: Boolean(raw.planOverride),
      plans: Array.isArray(raw.plans) && raw.plans.length > 0 ? [...raw.plans] : JSON.parse(JSON.stringify(globalPlans)),
      seasons: Array.isArray(raw.seasons) ? raw.seasons.map((s) => ({
        seasonId: s?.seasonId || '',
        title: s?.title || '',
        cover: s?.cover || '',
        introTitle: s?.introTitle || '',
        introText: s?.introText || '',
        vipGroupId: s?.vipGroupId || '',
        enabled: s?.enabled !== false,
        sort: Number(s?.sort || 0) || 0,
        planOverride: Boolean(s?.planOverride),
        plans: Array.isArray(s?.plans) && s.plans.length > 0 ? [...s.plans] : JSON.parse(JSON.stringify(globalPlans)),
      })) : [],
      superVip: raw.superVip && typeof raw.superVip === 'object' ? {
        enabled: Boolean(raw.superVip.enabled),
        groupId: raw.superVip.groupId || '',
        title: raw.superVip.title || '',
        desc: raw.superVip.desc || '',
        buttonText: raw.superVip.buttonText || '',
        planOverride: Boolean(raw.superVip.planOverride),
        plans: Array.isArray(raw.superVip.plans) && raw.superVip.plans.length > 0 ? [...raw.superVip.plans] : JSON.parse(JSON.stringify(globalPlans)),
        pricing: {
          minPayFen: Number(raw.superVip?.pricing?.minPayFen || 100) || 100,
          upgradeEnabled: raw.superVip?.pricing?.upgradeEnabled !== false,
        },
      } : {
        enabled: false,
        groupId: '',
        title: '',
        desc: '',
        buttonText: '',
        planOverride: false,
        plans: JSON.parse(JSON.stringify(globalPlans)),
        pricing: { minPayFen: 100, upgradeEnabled: true },
      },
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

  const ensureDraftSeries = async () => {
    const id = String(draft?.id || '').trim();
    if (!id) throw new Error('缺少剧集ID');
    const title = String(draft?.title || '').trim() || '未命名剧集';
    const resp = await apiFetchJson('/api/admin/series/draft', { method: 'POST', body: JSON.stringify({ id, title }) });
    if (!resp?.success || !resp?.item?.id) throw new Error(resp?.message || '创建草稿失败');
    setEditingSeries({ id: resp.item.id, raw: resp.item });
    return resp.item;
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

    const targetW = 640;
    const targetH = 360;
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

    const maxBytes = 220 * 1024;
    let q = 0.84;
    let blob = await new Promise((resolve) => canvas.toBlob(resolve, 'image/webp', q));
    while (blob && blob.size > maxBytes && q > 0.5) {
      q = Math.max(0.5, q - 0.06);
      blob = await new Promise((resolve) => canvas.toBlob(resolve, 'image/webp', q));
    }
    if (!blob) throw new Error('图片处理失败');
    if (blob.size > maxBytes) throw new Error('图片过大，请换更小的图片或减少分季数量后再保存');
    return blob;
  };

  const blobToDataUrl = async (blob) => {
    const dataUrl = await new Promise((resolve, reject) => {
      const r = new FileReader();
      r.onload = () => resolve(String(r.result || ''));
      r.onerror = () => reject(new Error('读取失败'));
      r.readAsDataURL(blob);
    });
    return dataUrl;
  };

  const imageFileToCoverDataUrl = async (file) => {
    const blob = await imageFileToCoverBlob(file);
    return blobToDataUrl(blob);
  };

  const imageFileToSeasonCoverBlob = async (file) => {
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
    if (srcW < 480 || srcH < 640) throw new Error('图片分辨率过低，请至少 480×640');

    const targetW = 480;
    const targetH = 640;
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

    const maxBytes = 220 * 1024;
    let q = 0.84;
    let blob = await new Promise((resolve) => canvas.toBlob(resolve, 'image/webp', q));
    while (blob && blob.size > maxBytes && q > 0.5) {
      q = Math.max(0.5, q - 0.06);
      blob = await new Promise((resolve) => canvas.toBlob(resolve, 'image/webp', q));
    }
    if (!blob) throw new Error('图片处理失败');
    if (blob.size > maxBytes) throw new Error('图片过大，请换更小的图片或减少分季数量后再保存');
    return blob;
  };

  const imageFileToSeasonCoverDataUrl = async (file) => {
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
    if (srcW < 480 || srcH < 640) throw new Error('图片分辨率过低，请至少 480×640');

    const targetW = 480;
    const targetH = 640;
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

    const maxBytes = 220 * 1024;
    let q = 0.84;
    let blob = await new Promise((resolve) => canvas.toBlob(resolve, 'image/webp', q));
    while (blob && blob.size > maxBytes && q > 0.5) {
      q = Math.max(0.5, q - 0.06);
      blob = await new Promise((resolve) => canvas.toBlob(resolve, 'image/webp', q));
    }
    if (!blob) throw new Error('图片处理失败');
    if (blob.size > maxBytes) throw new Error('图片过大，请换更小的图片或减少分季数量后再保存');
    return blobToDataUrl(blob);
  };

  const uploadWebpToApi = async (path, blob) => {
    const fd = new FormData();
    fd.append('file', blob, 'cover.webp');
    const baseUrl = getApiBaseUrl();
    const res = await fetch(`${baseUrl}${path}`, { method: 'POST', body: fd });
    const data = await res.json().catch(() => null);
    if (!res.ok || !data?.success) throw new Error(data?.message || `上传失败: ${res.status}`);
    return true;
  };

  const onPickCover = async (file) => {
    if (!file) return;
    try {
      setIsUploadingCover(true);
      const blob = await imageFileToCoverBlob(file);
      const url = await blobToDataUrl(blob);
      if (editingSeries?.id) {
        await uploadWebpToApi(`/api/admin/series/${encodeURIComponent(editingSeries.id)}/cover`, blob);
      } else {
        const created = await ensureDraftSeries();
        await uploadWebpToApi(`/api/admin/series/${encodeURIComponent(created.id)}/cover`, blob);
      }
      setDraft((d) => ({ ...(d || {}), cover: url }));
    } catch (e) {
      onAlert?.('error', e?.message || '封面上传失败');
    } finally {
      setIsUploadingCover(false);
      if (coverInputRef.current) coverInputRef.current.value = '';
    }
  };

  const onPickSeasonCover = async (file) => {
    if (!file) return;
    if (seasonCoverPickIndex < 0) return;
    try {
      setIsUploadingSeasonCover(true);
      const blob = await imageFileToSeasonCoverBlob(file);
      const url = await blobToDataUrl(blob);
      const sid = String(draft?.seasons?.[seasonCoverPickIndex]?.seasonId || '').trim();
      if (!sid) throw new Error('请先填写 seasonId 再上传剧照');
      if (editingSeries?.id) {
        await uploadWebpToApi(`/api/admin/series/${encodeURIComponent(editingSeries.id)}/seasons/${encodeURIComponent(sid)}/cover`, blob);
      } else {
        const created = await ensureDraftSeries();
        await uploadWebpToApi(`/api/admin/series/${encodeURIComponent(created.id)}/seasons/${encodeURIComponent(sid)}/cover`, blob);
      }
      setDraft((d) => {
        const seasons = [...((d?.seasons || []))];
        if (!seasons[seasonCoverPickIndex]) return d;
        seasons[seasonCoverPickIndex] = { ...seasons[seasonCoverPickIndex], cover: url };
        return { ...(d || {}), seasons };
      });
    } catch (e) {
      onAlert?.('error', e?.message || '剧照上传失败');
    } finally {
      setIsUploadingSeasonCover(false);
      setSeasonCoverPickIndex(-1);
      if (seasonCoverInputRef.current) seasonCoverInputRef.current.value = '';
    }
  };

  const renderList = () => (
    <Card className="overflow-hidden">
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

        <Button
          variant="neutral"
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
              planOverride: false,
              plans: JSON.parse(JSON.stringify(globalPlans)),
              seasons: [],
              superVip: {
                enabled: false,
                groupId: '',
                title: '',
                desc: '',
                buttonText: '',
                planOverride: false,
                plans: JSON.parse(JSON.stringify(globalPlans)),
                pricing: { minPayFen: 100, upgradeEnabled: true },
              },
            });
            setView('edit');
          }}
        >
          新建漫剧
        </Button>
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
                <Button variant="secondary" size="sm" className="mr-2" onClick={() => handleEdit(item)}>编辑</Button>
                <Button
                  variant="danger"
                  size="sm"
                  onClick={async () => {
                    if (!confirm('确认删除该剧集？')) return;
                    try {
                      await apiFetchJson(`/api/admin/series/${encodeURIComponent(item.id)}`, { method: 'DELETE' });
                      refresh();
                    } catch (e) {
                      onAlert?.('error', e?.message || '删除失败');
                    }
                  }}
                >
                  删除
                </Button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </Card>
  );

  const renderEdit = () => (
    <>
      <input
        ref={seasonCoverInputRef}
        id="seasonCoverFileInput"
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => onPickSeasonCover(e.target.files?.[0] || null)}
      />
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
      <div className="lg:col-span-2 space-y-6">
        <Card className="p-6 space-y-6">
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
        </Card>

        <Card className="p-6 space-y-6">
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
              <label className="text-sm font-bold text-slate-700">旧版VIP群 ID / 邀请链接（兼容）</label>
              <input 
                type="text" 
                value={draft?.vipGroupId || ''}
                onChange={(e) => setDraft((d) => ({ ...(d || {}), vipGroupId: e.target.value }))}
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
        </Card>
      </div>

      <Card className="p-6 space-y-6">
        <div className="flex items-center justify-between gap-3">
          <div className="space-y-1">
            <div className="text-base font-black text-slate-900">分季配置</div>
            <div className="text-xs text-slate-500 font-medium">为该剧集配置各季信息与对应 VIP 群</div>
          </div>
          <Button
            variant="neutral"
            size="sm"
            onClick={() => {
              const next = [...(draft?.seasons || [])];
              next.push({
                seasonId: `s${next.length + 1}`,
                title: `第${next.length + 1}季`,
                cover: draft?.cover || '',
                introTitle: `第${next.length + 1}季`,
                introText: '',
                vipGroupId: '',
                enabled: true,
                sort: next.length + 1,
                planOverride: false,
                plans: JSON.parse(JSON.stringify(globalPlans)),
              });
              setDraft((d) => ({ ...(d || {}), seasons: next }));
            }}
          >
            + 添加分季
          </Button>
        </div>

        {(draft?.seasons || []).length === 0 ? (
          <div className="text-sm text-slate-500 font-semibold">暂无分季（V4 建议至少配置 1 季）</div>
        ) : (
          <div className="space-y-4">
            {(draft?.seasons || []).map((s, idx) => (
              <div key={`${s.seasonId || 'season'}_${idx}`} className="rounded-2xl border border-slate-200 bg-slate-50 p-4 space-y-4">
                <div className="flex items-center justify-between gap-3">
                  <div className="text-sm font-black text-slate-900">分季 #{idx + 1}</div>
                  <div className="flex items-center gap-2">
                    <label className="text-xs font-bold text-slate-600 flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={s.enabled !== false}
                        onChange={(e) => {
                          const next = [...(draft?.seasons || [])];
                          next[idx] = { ...next[idx], enabled: e.target.checked };
                          setDraft((d) => ({ ...(d || {}), seasons: next }));
                        }}
                      />
                      启用
                    </label>
                    <button
                      onClick={() => {
                        const next = [...(draft?.seasons || [])];
                        next.splice(idx, 1);
                        setDraft((d) => ({ ...(d || {}), seasons: next }));
                      }}
                      className="text-rose-600 hover:text-rose-700 text-xs font-black"
                    >
                      删除
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm font-bold text-slate-700">seasonId *</label>
                    <input
                      type="text"
                      value={s.seasonId || ''}
                      onChange={(e) => {
                        const next = [...(draft?.seasons || [])];
                        next[idx] = { ...next[idx], seasonId: slugify(e.target.value) };
                        setDraft((d) => ({ ...(d || {}), seasons: next }));
                      }}
                      className="w-full h-10 bg-white border border-slate-200 rounded-xl px-3 text-sm font-mono outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                      placeholder="例如: s1"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-bold text-slate-700">季标题</label>
                    <input
                      type="text"
                      value={s.title || ''}
                      onChange={(e) => {
                        const next = [...(draft?.seasons || [])];
                        next[idx] = { ...next[idx], title: e.target.value };
                        setDraft((d) => ({ ...(d || {}), seasons: next }));
                      }}
                      className="w-full h-10 bg-white border border-slate-200 rounded-xl px-3 text-sm font-medium outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                      placeholder="例如：第一季"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm font-bold text-slate-700">季剧照</label>
                    <div className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white px-3 py-2">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="h-10 w-10 rounded-lg overflow-hidden border border-slate-200 bg-slate-100 flex-shrink-0">
                          {s.cover ? <img src={s.cover} alt="season-cover" className="h-full w-full object-cover" /> : null}
                        </div>
                        <div className="min-w-0">
                          <div className="text-xs text-slate-500 font-semibold truncate">{s.cover ? '已上传' : '未上传'}</div>
                          <div className="text-[11px] text-slate-400 font-medium truncate">{s.cover ? String(s.cover).slice(0, 42) : ''}</div>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          setSeasonCoverPickIndex(idx);
                          seasonCoverInputRef.current?.click();
                        }}
                        className="h-9 px-3 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs transition-colors"
                      >
                        {isUploadingSeasonCover && seasonCoverPickIndex === idx ? '上传中…' : '上传'}
                      </button>
                    </div>
                    <div className="text-[11px] text-slate-500 font-medium leading-relaxed">
                      建议竖图 3:4，将自动居中裁剪并压缩为 WEBP，保存到数据库字段。
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-bold text-slate-700">VIP群 chat_id *</label>
                    <input
                      type="text"
                      value={s.vipGroupId || ''}
                      onChange={(e) => {
                        const next = [...(draft?.seasons || [])];
                        next[idx] = { ...next[idx], vipGroupId: e.target.value };
                        setDraft((d) => ({ ...(d || {}), seasons: next }));
                      }}
                      className="w-full h-10 bg-white border border-slate-200 rounded-xl px-3 text-sm font-mono outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                      placeholder="-100123456789"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-bold text-slate-700">剧情介绍标题</label>
                  <input
                    type="text"
                    value={s.introTitle || ''}
                    onChange={(e) => {
                      const next = [...(draft?.seasons || [])];
                      next[idx] = { ...next[idx], introTitle: e.target.value };
                      setDraft((d) => ({ ...(d || {}), seasons: next }));
                    }}
                    className="w-full h-10 bg-white border border-slate-200 rounded-xl px-3 text-sm font-medium outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-bold text-slate-700">剧情详情</label>
                  <textarea
                    rows="4"
                    value={s.introText || ''}
                    onChange={(e) => {
                      const next = [...(draft?.seasons || [])];
                      next[idx] = { ...next[idx], introText: e.target.value };
                      setDraft((d) => ({ ...(d || {}), seasons: next }));
                    }}
                    className="w-full bg-white border border-slate-200 rounded-xl py-3 px-4 text-sm font-medium outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  ></textarea>
                </div>

                <div className="bg-white rounded-2xl border border-slate-200 p-4 space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="space-y-1">
                      <div className="text-sm font-black text-slate-900">本季套餐覆盖</div>
                      <div className="text-xs text-slate-500 font-medium">开启后将覆盖全局/整剧默认价格</div>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        className="sr-only peer"
                        checked={Boolean(s.planOverride)}
                        onChange={(e) => {
                          const next = [...(draft?.seasons || [])];
                          const prev = next[idx] || {};
                          const enabled = e.target.checked;
                          next[idx] = {
                            ...prev,
                            planOverride: enabled,
                            plans: enabled && Array.isArray(prev.plans) && prev.plans.length > 0 ? prev.plans : JSON.parse(JSON.stringify(globalPlans)),
                          };
                          setDraft((d) => ({ ...(d || {}), seasons: next }));
                        }}
                      />
                      <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
                    </label>
                  </div>

                  <div className={`space-y-4 ${!s.planOverride ? 'opacity-50 pointer-events-none' : ''}`}>
                    {(s.plans || []).map((p, pidx) => (
                      <div key={pidx} className="flex items-center justify-between text-sm gap-2">
                        <input
                          type="text"
                          value={p.label}
                          onChange={(e) => {
                            const next = [...(draft?.seasons || [])];
                            const nextPlans = [...(next[idx].plans || [])];
                            nextPlans[pidx] = { ...nextPlans[pidx], label: e.target.value };
                            next[idx] = { ...next[idx], plans: nextPlans };
                            setDraft((d) => ({ ...(d || {}), seasons: next }));
                          }}
                          className="w-24 h-9 bg-slate-50 border border-slate-200 rounded-xl px-3 text-slate-700 font-semibold outline-none"
                          placeholder="套餐名"
                        />
                        <div className="flex items-center gap-2">
                          <input
                            type="number"
                            value={p.days}
                            onChange={(e) => {
                              const next = [...(draft?.seasons || [])];
                              const nextPlans = [...(next[idx].plans || [])];
                              nextPlans[pidx] = { ...nextPlans[pidx], days: Number(e.target.value) || 0 };
                              next[idx] = { ...next[idx], plans: nextPlans };
                              setDraft((d) => ({ ...(d || {}), seasons: next }));
                            }}
                            className="w-20 h-9 bg-slate-50 border border-slate-200 rounded-xl px-3 text-right font-mono text-sm outline-none"
                            placeholder="天数"
                          />
                          <span className="text-slate-500 text-xs">天</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-slate-500 text-xs">￥</span>
                          <input
                            type="number"
                            step="0.01"
                            value={p.priceCny}
                            onChange={(e) => {
                              const next = [...(draft?.seasons || [])];
                              const nextPlans = [...(next[idx].plans || [])];
                              nextPlans[pidx] = { ...nextPlans[pidx], priceCny: Number(e.target.value) || 0 };
                              next[idx] = { ...next[idx], plans: nextPlans };
                              setDraft((d) => ({ ...(d || {}), seasons: next }));
                            }}
                            className="w-24 h-9 bg-slate-50 border border-slate-200 rounded-xl px-3 text-right font-mono text-sm outline-none"
                            placeholder="价格"
                          />
                        </div>
                        <button
                          onClick={() => {
                            const next = [...(draft?.seasons || [])];
                            const nextPlans = [...(next[idx].plans || [])];
                            nextPlans.splice(pidx, 1);
                            next[idx] = { ...next[idx], plans: nextPlans };
                            setDraft((d) => ({ ...(d || {}), seasons: next }));
                          }}
                          className="text-rose-500 hover:text-rose-600 text-xs font-bold px-2"
                        >
                          删除
                        </button>
                      </div>
                    ))}
                    {s.planOverride ? (
                      <button
                        onClick={() => {
                          const next = [...(draft?.seasons || [])];
                          const nextPlans = [...(next[idx].plans || [])];
                          nextPlans.push({ id: `plan_${Date.now()}`, label: '新套餐', days: 30, priceCny: 9.9, enabled: true });
                          next[idx] = { ...next[idx], plans: nextPlans };
                          setDraft((d) => ({ ...(d || {}), seasons: next }));
                        }}
                        className="text-indigo-600 hover:text-indigo-700 text-sm font-bold mt-2"
                      >
                        + 添加本季套餐
                      </button>
                    ) : null}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      <Card className="p-6 space-y-6">
        <div className="space-y-1">
          <div className="text-base font-black text-slate-900">土豪专区（Super VIP）</div>
          <div className="text-xs text-slate-500 font-medium">全季订阅进入一个独立的土豪群</div>
        </div>

        <div className="grid grid-cols-2 gap-6">
          <div className="flex items-center justify-between rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
            <div className="text-sm font-bold text-slate-700">启用土豪专区</div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                className="sr-only peer"
                checked={Boolean(draft?.superVip?.enabled)}
                onChange={(e) => setDraft((d) => ({ ...(d || {}), superVip: { ...(d?.superVip || {}), enabled: e.target.checked } }))}
              />
              <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-amber-500"></div>
            </label>
          </div>
          <div className="space-y-2">
            <label className="text-sm font-bold text-slate-700">土豪群 chat_id *</label>
            <input
              type="text"
              value={draft?.superVip?.groupId || ''}
              onChange={(e) => setDraft((d) => ({ ...(d || {}), superVip: { ...(d?.superVip || {}), groupId: e.target.value } }))}
              className="w-full h-11 bg-slate-100 border border-slate-200 rounded-xl px-4 text-sm font-mono outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent"
              placeholder="-100123456789"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-6">
          <div className="space-y-2">
            <label className="text-sm font-bold text-slate-700">标题</label>
            <input
              type="text"
              value={draft?.superVip?.title || ''}
              onChange={(e) => setDraft((d) => ({ ...(d || {}), superVip: { ...(d?.superVip || {}), title: e.target.value } }))}
              className="w-full h-11 bg-slate-100 border border-slate-200 rounded-xl px-4 text-sm font-medium outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent"
              placeholder="例如：土豪专区"
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-bold text-slate-700">按钮文案</label>
            <input
              type="text"
              value={draft?.superVip?.buttonText || ''}
              onChange={(e) => setDraft((d) => ({ ...(d || {}), superVip: { ...(d?.superVip || {}), buttonText: e.target.value } }))}
              className="w-full h-11 bg-slate-100 border border-slate-200 rounded-xl px-4 text-sm font-medium outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent"
              placeholder="例如：全季订阅（尊享）"
            />
          </div>
        </div>

        <div className="space-y-2">
          <label className="text-sm font-bold text-slate-700">说明</label>
          <textarea
            rows="3"
            value={draft?.superVip?.desc || ''}
            onChange={(e) => setDraft((d) => ({ ...(d || {}), superVip: { ...(d?.superVip || {}), desc: e.target.value } }))}
            className="w-full bg-slate-100 border border-slate-200 rounded-xl py-3 px-4 text-sm font-medium outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent"
          ></textarea>
        </div>

        <div className="grid grid-cols-2 gap-6">
          <div className="space-y-2">
            <label className="text-sm font-bold text-slate-700">最低应付（分）</label>
            <input
              type="number"
              value={draft?.superVip?.pricing?.minPayFen ?? 100}
              onChange={(e) => setDraft((d) => ({ ...(d || {}), superVip: { ...(d?.superVip || {}), pricing: { ...(d?.superVip?.pricing || {}), minPayFen: Number(e.target.value || 0) } } }))}
              className="w-full h-11 bg-slate-100 border border-slate-200 rounded-xl px-4 text-sm font-mono outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent"
              placeholder="100"
            />
          </div>
          <div className="flex items-center justify-between rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
            <div className="text-sm font-bold text-slate-700">启用升级价</div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                className="sr-only peer"
                checked={draft?.superVip?.pricing?.upgradeEnabled !== false}
                onChange={(e) => setDraft((d) => ({ ...(d || {}), superVip: { ...(d?.superVip || {}), pricing: { ...(d?.superVip?.pricing || {}), upgradeEnabled: e.target.checked } } }))}
              />
              <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-amber-500"></div>
            </label>
          </div>
        </div>

        <div className="bg-slate-50 rounded-2xl border border-slate-200 p-4 space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <div className="text-sm font-black text-slate-900">全季套餐覆盖</div>
              <div className="text-xs text-slate-500 font-medium">如不开启，则使用全局默认套餐</div>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                className="sr-only peer"
                checked={Boolean(draft?.superVip?.planOverride)}
                onChange={(e) => setDraft((d) => ({ ...(d || {}), superVip: { ...(d?.superVip || {}), planOverride: e.target.checked } }))}
              />
              <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-amber-500"></div>
            </label>
          </div>

          <div className={`space-y-4 ${!draft?.superVip?.planOverride ? 'opacity-50 pointer-events-none' : ''}`}>
            {(draft?.superVip?.plans || []).map((p, idx) => (
              <div key={idx} className="flex items-center justify-between text-sm gap-2">
                <input
                  type="text"
                  value={p.label}
                  onChange={(e) => {
                    const nextPlans = [...(draft.superVip.plans || [])];
                    nextPlans[idx].label = e.target.value;
                    setDraft((d) => ({ ...(d || {}), superVip: { ...(d?.superVip || {}), plans: nextPlans } }));
                  }}
                  className="w-24 h-9 bg-white border border-slate-200 rounded-xl px-3 text-slate-700 font-semibold outline-none"
                  placeholder="套餐名"
                />
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    value={p.days}
                    onChange={(e) => {
                      const nextPlans = [...(draft.superVip.plans || [])];
                      nextPlans[idx].days = Number(e.target.value) || 0;
                      setDraft((d) => ({ ...(d || {}), superVip: { ...(d?.superVip || {}), plans: nextPlans } }));
                    }}
                    className="w-20 h-9 bg-white border border-slate-200 rounded-xl px-3 text-right font-mono text-sm outline-none"
                    placeholder="天数"
                  />
                  <span className="text-slate-500 text-xs">天</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-slate-500 text-xs">￥</span>
                  <input
                    type="number"
                    step="0.01"
                    value={p.priceCny}
                    onChange={(e) => {
                      const nextPlans = [...(draft.superVip.plans || [])];
                      nextPlans[idx].priceCny = Number(e.target.value) || 0;
                      setDraft((d) => ({ ...(d || {}), superVip: { ...(d?.superVip || {}), plans: nextPlans } }));
                    }}
                    className="w-24 h-9 bg-white border border-slate-200 rounded-xl px-3 text-right font-mono text-sm outline-none"
                    placeholder="价格"
                  />
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    const nextPlans = [...(draft.superVip.plans || [])];
                    nextPlans.splice(idx, 1);
                    setDraft((d) => ({ ...(d || {}), superVip: { ...(d?.superVip || {}), plans: nextPlans } }));
                  }}
                  className="text-rose-600 border-rose-200 hover:bg-rose-50"
                >
                  删除
                </Button>
              </div>
            ))}
            {draft?.superVip?.planOverride ? (
              <Button
                variant="secondary"
                size="sm"
                onClick={() => {
                  const nextPlans = [...(draft.superVip.plans || [])];
                  nextPlans.push({ id: `plan_${Date.now()}`, label: '新套餐', days: 30, priceCny: 9.9, enabled: true });
                  setDraft((d) => ({ ...(d || {}), superVip: { ...(d?.superVip || {}), plans: nextPlans } }));
                }}
              >
                + 添加全季套餐
              </Button>
            ) : null}
          </div>
        </div>
      </Card>

      <div className="space-y-6">
        <Card className="p-6 space-y-4">
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
        </Card>

        <div className="flex flex-col space-y-3">
          <Button
            size="lg"
            className="w-full"
            onClick={async () => {
              try {
                if (!draft?.title) {
                  onAlert?.('warning', '请填写剧名');
                  return;
                }
                const seasons = Array.isArray(draft?.seasons) ? draft.seasons : [];
                if (seasons.length === 0) {
                  onAlert?.('warning', '请至少配置 1 个分季');
                  return;
                }
                const seen = new Set();
                for (const s of seasons) {
                  const seasonId = String(s?.seasonId || '').trim();
                  if (!seasonId) {
                    onAlert?.('warning', '分季 seasonId 不能为空');
                    return;
                  }
                  if (seen.has(seasonId)) {
                    onAlert?.('warning', `分季 seasonId 重复：${seasonId}`);
                    return;
                  }
                  seen.add(seasonId);
                  if (s?.enabled !== false && !String(s?.vipGroupId || '').trim()) {
                    onAlert?.('warning', `分季 ${seasonId} 未配置 VIP 群 chat_id`);
                    return;
                  }
                  if (Boolean(s?.planOverride) && (!Array.isArray(s?.plans) || s.plans.length === 0)) {
                    onAlert?.('warning', `分季 ${seasonId} 已开启套餐覆盖但未配置套餐`);
                    return;
                  }
                }
                if (draft?.superVip?.enabled) {
                  if (!String(draft?.superVip?.groupId || '').trim()) {
                    onAlert?.('warning', '已启用土豪专区但未配置土豪群 chat_id');
                    return;
                  }
                  if (Boolean(draft?.superVip?.planOverride) && (!Array.isArray(draft?.superVip?.plans) || draft.superVip.plans.length === 0)) {
                    onAlert?.('warning', '土豪专区已开启套餐覆盖但未配置套餐');
                    return;
                  }
                }
                if (editingSeries?.id) {
                  const payload = { ...draft };
                  delete payload.cover;
                  if (Array.isArray(payload.seasons)) {
                    payload.seasons = payload.seasons.map((s) => {
                      if (!s || typeof s !== 'object') return s;
                      const { cover, ...rest } = s;
                      return rest;
                    });
                  }
                  await apiFetchJson(`/api/admin/series/${encodeURIComponent(editingSeries.id)}`, {
                    method: 'PUT',
                    body: JSON.stringify(payload),
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
                onAlert?.('error', e?.message || '保存失败');
              }
            }}
          >
            保存修改
          </Button>
          <Button variant="ghost" size="lg" className="w-full" onClick={() => setView('list')}>
            取消
          </Button>
        </div>
      </div>
    </div>
    </>
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title="剧集管理"
        subtitle="管理剧集信息、绑定群组与基础配置（示例数据）"
        right={view === 'edit' ? <Button variant="ghost" onClick={() => setView('list')}>返回列表</Button> : null}
      />

      {view === 'list' ? renderList() : renderEdit()}
    </div>
  );
};

export default SeriesManagement;
