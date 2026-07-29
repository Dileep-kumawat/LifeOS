import { apiClient } from '../config/apiClient';
import {
  ApiResponse,
  AuthResponse,
  AuthTokens,
  RegisterInput,
  LoginInput,
  IUser,
} from '@lifeos/shared';

export const authApi = {
  register: async (data: RegisterInput): Promise<ApiResponse<AuthResponse>> => {
    const res = await apiClient.post('/auth/register', data);
    return res.data;
  },

  login: async (data: LoginInput): Promise<ApiResponse<AuthResponse>> => {
    const res = await apiClient.post('/auth/login', data);
    return res.data;
  },

  refreshToken: async (refreshToken: string): Promise<ApiResponse<AuthTokens>> => {
    const res = await apiClient.post('/auth/refresh-token', { refreshToken });
    return res.data;
  },

  logout: async (refreshToken?: string): Promise<ApiResponse<null>> => {
    const res = await apiClient.post('/auth/logout', { refreshToken });
    return res.data;
  },

  getMe: async (): Promise<ApiResponse<IUser>> => {
    const res = await apiClient.get('/auth/me');
    return res.data;
  },

  getSessions: async (): Promise<ApiResponse<any[]>> => {
    const res = await apiClient.get('/auth/sessions');
    return res.data;
  },

  revokeSession: async (sessionId: string): Promise<ApiResponse<null>> => {
    const res = await apiClient.delete(`/auth/sessions/${sessionId}`);
    return res.data;
  },
};
