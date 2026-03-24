export const apiFetch = async (url, options = {}) => {
  const token = localStorage.getItem("token");

  const headers = {
    Authorization: `Bearer ${token}`,
    ...options.headers
  };

  if (!(options.body instanceof FormData)) {
    headers["Content-Type"] = headers["Content-Type"] || "application/json";
  }

const baseUrl = import.meta.env.VITE_API_URL || 'http://localhost:5001';
const response = await fetch(`${baseUrl}${url}`, {
    cache: 'no-store',
    ...options,
    headers
  });

  if (response.status === 401 || response.status === 403) {
    if (window.location.pathname !== '/login') {
      localStorage.removeItem("token");
      localStorage.removeItem("user");
      window.location.href = "/login";
    }
  }

  return response;
};

