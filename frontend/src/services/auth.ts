import { apiService } from './api';

export interface UserInfo {
  id: number;
  username: string;
  email?: string;
}

export interface LoginResponse {
  token: string;
  user: UserInfo;
}

export const authApi = {
  // Why: Send POST request to backend "/auth/register" for user registration.
  async register(username: string, password: string): Promise<{ message: string }> {
    return apiService.fetch('/auth/register', {
      method: 'POST',
      body: JSON.stringify({ username, password }),
    });
  },

  // Why: Send POST request to backend "/auth/login" and return JWT token with user metadata.
  async login(username: string, password: string): Promise<LoginResponse> {
    return apiService.fetch('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ username, password }),
    });
  },

  // Why: Send GET request to fetch the authenticated user profile based on stored JWT.
  async getMe(): Promise<UserInfo> {
    return apiService.fetch('/auth/me');
  },

  // Why: Send PUT request to update user profile (username and email).
  async updateProfile(username: string, email?: string): Promise<UserInfo> {
    const res = await apiService.fetch('/auth/profile', {
      method: 'PUT',
      body: JSON.stringify({ username, email }),
    });
    return res.data;
  },

  // Why: Send PUT request to change the user's password with old/new password validation.
  async changePassword(oldPassword: string, newPassword: string): Promise<void> {
    await apiService.fetch('/auth/password', {
      method: 'PUT',
      body: JSON.stringify({ oldPassword, newPassword }),
    });
  },

  // Why: Fetch AI config from backend database for the current user.
  async getAiConfig(): Promise<string> {
    const res = await apiService.fetch('/auth/ai-config');
    return res.data;
  },

  // Why: Persist AI config to backend database for cross-device/session persistence.
  async updateAiConfig(configJson: string): Promise<void> {
    await apiService.fetch('/auth/ai-config', {
      method: 'PUT',
      body: JSON.stringify({ config: configJson }),
    });
  },
};
