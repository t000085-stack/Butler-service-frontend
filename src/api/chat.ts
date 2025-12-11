import { apiRequest } from './client';
import type { ChatResponse } from '../types';

export async function sendMessage(message: string): Promise<ChatResponse> {
  return apiRequest<ChatResponse>('/chat/message', {
    method: 'POST',
    body: { message },
  });
}

export async function getChatHistory(): Promise<{ messages: Array<{ role: 'user' | 'assistant'; content: string; timestamp: string }> }> {
  return apiRequest('/chat/history', {
    method: 'GET',
  });
}

