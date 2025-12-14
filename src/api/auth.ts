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

export interface UpdateProfileInput {
  username?: string;
  email?: string;
  profile_picture?: string;
  health?: string;
  career?: string;
  relationship?: string;
  preferences?: string[];
}

export async function updateProfile(input: UpdateProfileInput): Promise<User> {
  const response = await apiRequest<{ user: User }>('/auth/profile', {
    method: 'PATCH',
    body: input,
    requiresAuth: true,
  });
  return response.user;
}

export async function deleteAccount(): Promise<{ message: string }> {
  return apiRequest<{ message: string }>('/auth/profile', {
    method: 'DELETE',
    requiresAuth: true,
  });
}

export async function changePassword(
  currentPassword: string,
  newPassword: string
): Promise<{ message: string }> {
  return apiRequest<{ message: string }>('/auth/change-password', {
    method: 'POST',
    body: {
      current_password: currentPassword,
      new_password: newPassword,
    },
    requiresAuth: true,
  });
}

