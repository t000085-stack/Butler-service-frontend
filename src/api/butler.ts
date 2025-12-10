import { apiRequest } from './client';
import type { ConsultInput, ConsultResponse, ContextLog, ButlerProfileInput, User } from '../types';

interface HistoryResponse {
  history: ContextLog[];
}

export async function consult(input: ConsultInput): Promise<ConsultResponse> {
  return apiRequest<ConsultResponse>('/butler/consult', {
    method: 'POST',
    body: input,
  });
}

export async function getHistory(limit = 10): Promise<ContextLog[]> {
  const response = await apiRequest<HistoryResponse>(`/butler/history?limit=${limit}`);
  return response.history;
}

export async function updateButlerProfile(input: ButlerProfileInput): Promise<User> {
  const response = await apiRequest<{ user: User }>('/butler/profile', {
    method: 'PATCH',
    body: input,
  });
  return response.user;
}

