import { apiRequest } from './client';
import type { AuthResponse, User } from '../types';

interface LoginInput {
  email: string;
  password: string;
}

interface RegisterInput {
  username: string;
  email: string;
  password: string;
  core_values?: string[];
}

export async function login(input: LoginInput): Promise<AuthResponse> {
  return apiRequest<AuthResponse>('/auth/login', {
    method: 'POST',
    body: input,
    requiresAuth: false,
  });
}

export async function register(input: RegisterInput): Promise<AuthResponse> {
  return apiRequest<AuthResponse>('/auth/register', {
    method: 'POST',
    body: input,
    requiresAuth: false,
  });
}

export async function getProfile(): Promise<User> {
  const response = await apiRequest<{ user: User }>('/auth/profile', {
    method: 'GET',
    requiresAuth: true,
  });
  return response.user;
}

