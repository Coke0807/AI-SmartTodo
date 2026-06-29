// SmartTodo AI - API Service Client
// Configured to communicate with the Go Backend (Gin)

const API_BASE_URL = '/api';

export const getAuthHeader = (): Record<string, string> => {
  const token = localStorage.getItem('smarttodo_token');
  return token ? { Authorization: `Bearer ${token}` } : {};
};

export const apiService = {
  async fetch(endpoint: string, options: RequestInit = {}) {
    const headers = {
      'Content-Type': 'application/json',
      ...getAuthHeader(),
      ...options.headers,
    };

    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      ...options,
      headers,
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      const errorMsg = errorData.error || '网络请求错误';
      throw new Error(errorMsg);
    }

    return response.json();
  }
};
