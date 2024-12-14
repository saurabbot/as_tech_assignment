import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios';

// Enable credentials
axios.defaults.withCredentials = true;

// Types
export interface RegisterData {
  email: string;
  username: string;
  password: string;
  confirm_password: string;
  full_name: string;
  phone_number: string;
}
interface MFASetupResponse extends ApiResponse {
  qr_code?: string;
  secret_key?: string;
}

interface MFAStatusResponse extends ApiResponse {
  mfa_enabled: boolean;
  devices_count: number;
  mfa_verified: boolean;
}

export interface LoginData {
  email: string;
  password: string;
}

export interface User {
  user_id: number;
  email: string;
  full_name: string;
  phone_number: string;
  username: string;
}

export interface LoginResponse {
  status: string;
  message: string;
  user: User;
  tokens: {
    refresh: string;
    access: string;
  };
}

export interface ApiResponse<T = unknown> {
  status: 'success' | 'error';
  message?: string;
  data?: T;
  errors?: unknown;
}

export interface TokenResponse {
  tokens: {
    access: string;
    refresh: string;
  };
}

// Create axios instance
const api = axios.create({
  baseURL: 'http://127.0.0.1:8000',
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor
api.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  const token = localStorage.getItem('accessToken');
  if (token && config.headers) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Response interceptor for token refresh
api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config;
    if (!originalRequest) return Promise.reject(error);

    // Check if error is due to invalid token and request hasn't been retried
    if (
      error.response?.status === 401 &&
      error.response?.data?.code === 'token_not_valid' &&
      !(originalRequest as any)._retry
    ) {
      (originalRequest as any)._retry = true;

      try {
        const refreshToken = localStorage.getItem('refreshToken');
        if (!refreshToken) throw new Error('No refresh token available');

        // Try to refresh the token
        const response = await api.post<TokenResponse>('/api/auth/token/refresh/', {
          refresh: refreshToken,
        });

        const { access, refresh } = response.data.tokens;
        localStorage.setItem('accessToken', access);
        localStorage.setItem('refreshToken', refresh);

        // Retry the original request
        originalRequest.headers.Authorization = `Bearer ${access}`;
        return api(originalRequest);
      } catch (refreshError) {
        // Clear auth data and redirect to login
        localStorage.removeItem('accessToken');
        localStorage.removeItem('refreshToken');
        localStorage.removeItem('user');
        window.location.href = '/login';
        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  }
);

const apiUtils = {
  auth: {
    mfa: {
      setup: async (data?: { code?: string }) => {
        try {
          const response = await api.post('/api/mfa/setup/', data || {});
          return response.data;
        } catch (error) {
          if (axios.isAxiosError(error) && error.response) {
            throw error.response.data;
          }
          throw { status: 'error', message: 'Network error occurred' };
        }
      },

      verify: async (code: string) => {
        try {
          const response = await api.post<ApiResponse>('/api/mfa/verify/', {
            code
          });
          return response.data;
        } catch (error) {
          if (axios.isAxiosError(error) && error.response) {
            throw error.response.data;
          }
          throw { status: 'error', message: 'Network error occurred' };
        }
      },

      disable: async () => {
        try {
          const response = await api.post<ApiResponse>('/api/mfa/disable/');
          return response.data;
        } catch (error) {
          if (axios.isAxiosError(error) && error.response) {
            throw error.response.data;
          }
          throw { status: 'error', message: 'Network error occurred' };
        }
      },

      getStatus: async () => {
        try {
          const response = await api.get<MFAStatusResponse>('/api/mfa/status/');
          return response.data;
        } catch (error) {
          if (axios.isAxiosError(error) && error.response) {
            throw error.response.data;
          }
          throw { status: 'error', message: 'Network error occurred' };
        }
      }
    },
    register: async (data: RegisterData) => {
      try {
        const response = await api.post<ApiResponse>('/api/auth/register/', data);
        return response.data;
      } catch (error) {
        if (axios.isAxiosError(error) && error.response) {
          throw error.response.data;
        }
        throw { status: 'error', message: 'Network error occurred' };
      }
    },

    login: async (data: LoginData) => {
      try {
        const response = await api.post<LoginResponse>('/api/auth/login/', data);
        
        if (response.data.tokens) {
          localStorage.setItem('accessToken', response.data.tokens.access);
          localStorage.setItem('refreshToken', response.data.tokens.refresh);
        }
        
        if (response.data.user) {
          localStorage.setItem('user', JSON.stringify(response.data.user));
        }
        
        return response.data;
      } catch (error) {
        if (axios.isAxiosError(error) && error.response) {
          throw error.response.data;
        }
        throw { status: 'error', message: 'Network error occurred' };
      }
    },

    logout: async () => {
      try {
        const refreshToken = localStorage.getItem('refreshToken');
        const response = await api.post<ApiResponse>('/api/auth/logout/', {
          refresh_token: refreshToken
        });

        localStorage.removeItem('accessToken');
        localStorage.removeItem('refreshToken');
        localStorage.removeItem('user');

        return response.data;
      } catch (error) {
        if (axios.isAxiosError(error) && error.response) {
          throw error.response.data;
        }
        throw { status: 'error', message: 'Network error occurred' };
      }
    }
  },

  files: {
    getList: async () => {
      try {
        // Now using the complete path: /api/files/files/
        const response = await api.get<File[]>('/api/files/files/');
        return response.data;
      } catch (error) {
        if (axios.isAxiosError(error) && error.response) {
          throw error.response.data;
        }
        throw { status: 'error', message: 'Network error occurred' };
      }
    },

    upload: async (formData: FormData, onProgress?: (progress: number) => void) => {
      try {
        const response = await api.post('/api/files/files/upload/', formData, {
          headers: {
            'Content-Type': 'multipart/form-data',
          },
          onUploadProgress: (progressEvent) => {
            if (onProgress && progressEvent.total) {
              const percentCompleted = Math.round(
                (progressEvent.loaded * 100) / progressEvent.total
              );
              onProgress(percentCompleted);
            }
          },
        });
        return response.data;
      } catch (error) {
        if (axios.isAxiosError(error) && error.response) {
          throw error.response.data;
        }
        throw { status: 'error', message: 'Network error occurred' };
      }
    },

    share: async (fileId: number, userId: number) => {
      try {
        // Complete path: /api/files/files/{id}/share/
        const response = await api.post(`/api/files/files/share/${fileId}`, {
          user_id: userId,
        });
        return response.data;
      } catch (error) {
        if (axios.isAxiosError(error) && error.response) {
          throw error.response.data;
        }
        throw { status: 'error', message: 'Network error occurred' };
      }
    },

    delete: async (fileId: number) => {
      try {
        // Complete path: /api/files/files/{id}/
        const response = await api.delete(`/api/files/files/${fileId}/`);
        return response.data;
      } catch (error) {
        if (axios.isAxiosError(error) && error.response) {
          throw error.response.data;
        }
        throw { status: 'error', message: 'Network error occurred' };
      }
    },

    download: async (fileId: number) => {
      try {
        // Complete path: /api/files/files/{id}/download/
        const response = await api.get(`/api/files/files/${fileId}/download/`, {
          responseType: 'blob',
        });
        return response.data;
      } catch (error) {
        if (axios.isAxiosError(error) && error.response) {
          throw error.response.data;
        }
        throw { status: 'error', message: 'Network error occurred' };
      }
    },
  },

  user: {
    getProfile: async () => {
      try {
        const response = await api.get<ApiResponse>('/api/user/profile/');
        return response.data;
      } catch (error) {
        if (axios.isAxiosError(error) && error.response) {
          throw error.response.data;
        }
        throw { status: 'error', message: 'Network error occurred' };
      }
    },

    updateProfile: async (data: Partial<RegisterData>) => {
      try {
        const response = await api.put<ApiResponse>('/api/user/profile/', data);
        return response.data;
      } catch (error) {
        if (axios.isAxiosError(error) && error.response) {
          throw error.response.data;
        }
        throw { status: 'error', message: 'Network error occurred' };
      }
    },
  },
};

export default apiUtils;