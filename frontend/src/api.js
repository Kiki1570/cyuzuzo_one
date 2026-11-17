const configuredOrigin = (import.meta.env.VITE_API_URL || "http://localhost:5000").replace(/\/+$/, "");
const API_URL = configuredOrigin.endsWith("/api") ? configuredOrigin : `${configuredOrigin}/api`;

export async function api(path, { token, ...options } = {}) {
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  const response = await fetch(`${API_URL}${normalizedPath}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers
    }
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const error = new Error(data.message || `Request failed (${response.status})`);
    error.status = response.status;
    throw error;
  }
  return data;
}
