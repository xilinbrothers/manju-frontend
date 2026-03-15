export const getApiBaseUrl = () => {
  const base = import.meta.env.VITE_API_BASE_URL;
  if (!base) throw new Error('未配置 VITE_API_BASE_URL');
  return String(base).replace(/\/+$/, '');
};

export const apiFetchJson = async (path, options = {}) => {
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
};

