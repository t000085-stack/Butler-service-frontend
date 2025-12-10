import axios, { AxiosInstance, AxiosError } from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_URL } from '../constants/config';
import type { ApiError } from '../types';

const TOKEN_KEY = 'auth_token';

console.log('[API Client] Configured API URL:', API_URL);

// Create axios instance
const api: AxiosInstance = axios.create({
  baseURL: API_URL,
  timeout: 30000, // Increased timeout for remote server
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to add auth token
api.interceptors.request.use(
  async (config) => {
    console.log('[API Client] Request:', config.method?.toUpperCase(), config.url);
    const token = await getToken();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    console.log('[API Client] Request error:', error);
    return Promise.reject(error);
  }
);

// Response interceptor for error handling
api.interceptors.response.use(
  (response) => {
    console.log('[API Client] Response:', response.status, response.config.url);
    return response;
  },
  (error: AxiosError<{ message?: string }>) => {
    console.log('[API Client] Error:', error.code, error.message);
    console.log('[API Client] Error details:', JSON.stringify({
      status: error.response?.status,
      data: error.response?.data,
      code: error.code,
    }));
    const apiError: ApiError = {
      message: error.response?.data?.message || error.message || 'Request failed',
      status: error.response?.status,
    };
    return Promise.reject(apiError);
  }
);

export async function getToken(): Promise<string | null> {
  return AsyncStorage.getItem(TOKEN_KEY);
}

export async function setToken(token: string): Promise<void> {
  await AsyncStorage.setItem(TOKEN_KEY, token);
}

export async function removeToken(): Promise<void> {
  await AsyncStorage.removeItem(TOKEN_KEY);
}

interface RequestOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  body?: unknown;
  requiresAuth?: boolean;
}

export async function apiRequest<T>(
  endpoint: string,
  options: RequestOptions = {}
): Promise<T> {
  const { method = 'GET', body, requiresAuth = true } = options;

  // For non-auth requests, temporarily remove the token
  const config = requiresAuth ? {} : { headers: { Authorization: undefined } };

  const response = await api.request<T>({
    url: endpoint,
    method,
    data: body,
    ...config,
  });

  return response.data;
}

export default api;
