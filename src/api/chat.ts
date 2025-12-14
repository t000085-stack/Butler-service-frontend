import { apiRequest } from './client';
import type { ChatResponse } from '../types';

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
}

export interface ChatHistoryResponse {
  messages: ChatMessage[];
}

export interface UpdateMessageInput {
  content: string;
}

// CREATE - Send a new chat message
export async function sendMessage(message: string): Promise<ChatResponse> {
  return apiRequest<ChatResponse>('/chat/message', {
    method: 'POST',
    body: { message },
  });
}

// READ - Get chat history
export async function getChatHistory(): Promise<ChatMessage[]> {
  const response = await apiRequest<ChatHistoryResponse>('/chat/history', {
    method: 'GET',
  });
  return response.messages;
}

// READ - Get a single message by ID
export async function getMessage(id: string): Promise<ChatMessage> {
  return apiRequest<ChatMessage>(`/chat/messages/${id}`, {
    method: 'GET',
  });
}

// UPDATE - Update an existing message
export async function updateMessage(
  id: string,
  input: UpdateMessageInput
): Promise<ChatMessage> {
  return apiRequest<ChatMessage>(`/chat/messages/${id}`, {
    method: 'PATCH',
    body: input,
  });
}

// DELETE - Delete a message
export async function deleteMessage(id: string): Promise<void> {
  return apiRequest<void>(`/chat/messages/${id}`, {
    method: 'DELETE',
  });
}

// DELETE - Clear all chat history
export async function clearChatHistory(): Promise<{ message: string }> {
  return apiRequest<{ message: string }>('/chat/history', {
    method: 'DELETE',
  });
}

