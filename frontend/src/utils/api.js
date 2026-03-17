export const getApiBaseUrl = () => {
  const base = import.meta.env.VITE_API_BASE_URL;
  // 提供默认值，用于本地开发
  if (!base) return 'http://localhost:3000';
  return String(base).replace(/\/+$/, '');
};

export const apiFetchJson = async (path, options = {}) => {
  try {
    const baseUrl = getApiBaseUrl();
    const initData = window.Telegram?.WebApp?.initData || '';

    const headers = new Headers(options.headers || {});
    if (!headers.has('Content-Type') && options.body) headers.set('Content-Type', 'application/json');
    if (initData) headers.set('x-telegram-init-data', initData);

    const res = await fetch(`${baseUrl}${path}`, { ...options, headers });
    if (!res.ok) {
      const text = await res.text().catch(() => '');
      throw new Error(text || `请求失败: ${res.status}`);
    }
    return res.json();
  } catch (error) {
    const useMock = String(import.meta.env.VITE_USE_MOCK || '').toLowerCase() === 'true';
    if (useMock) {
      if (path === '/api/series') {
        return [
          { id: 'series_mock_1', title: '重生之我是大魔王', cover: 'https://picsum.photos/seed/cover1/300/450', description: '重生回到过去，成为大魔王的故事' },
          { id: 'series_mock_2', title: '校园恋爱物语', cover: 'https://picsum.photos/seed/cover2/300/450', description: '校园里的青春恋爱故事' },
        ];
      }
      if (path.startsWith('/api/plans')) {
        return [
          { id: '30days', label: '30天', price: '69.9', daily: '2.33', enabled: true, popular: true, days: 30 },
          { id: '90days', label: '90天', price: '169.9', daily: '1.89', save: '40', enabled: true, days: 90 },
        ];
      }
      if (path === '/api/user/subscriptions') {
        return { activeSubs: [], expiredSubs: [], userId: 'mock' };
      }
    }
    throw error;
  }
};

