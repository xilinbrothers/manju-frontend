export const getApiBaseUrl = () => {
  const base = import.meta.env.VITE_API_BASE_URL;
  if (!base) return 'http://localhost:3000';
  return String(base).replace(/\/+$/, '');
};

export const apiFetchJson = async (path, options = {}) => {
  const baseUrl = getApiBaseUrl();
  const res = await fetch(`${baseUrl}${path}`, {
    ...options,
    headers: {
      ...(options.headers || {}),
      ...(options.body ? { 'Content-Type': 'application/json' } : {}),
    },
  });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(text || `请求失败: ${res.status}`);
  }
  return res.json();
};
