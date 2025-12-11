import { apiRequest } from './client';
import type { Task, CreateTaskInput, UpdateTaskInput } from '../types';

interface TasksResponse {
  tasks: Task[];
}

interface TaskResponse {
  task: Task;
}

export async function getTasks(includeCompleted = false): Promise<Task[]> {
  const query = includeCompleted ? '?includeCompleted=true' : '';
  const response = await apiRequest<TasksResponse>(`/tasks${query}`);
  return response.tasks;
}

export async function getTask(id: string): Promise<Task> {
  const response = await apiRequest<TaskResponse>(`/tasks/${id}`);
  return response.task;
}

export async function createTask(input: CreateTaskInput): Promise<Task> {
  const response = await apiRequest<TaskResponse>('/tasks', {
    method: 'POST',
    body: input,
  });
  return response.task;
}

export async function updateTask(id: string, input: UpdateTaskInput): Promise<Task> {
  const response = await apiRequest<TaskResponse>(`/tasks/${id}`, {
    method: 'PUT',
    body: input,
  });
  return response.task;
}

export async function deleteTask(id: string): Promise<void> {
  await apiRequest(`/tasks/${id}`, { method: 'DELETE' });
}

export async function completeTask(id: string): Promise<Task> {
  const response = await apiRequest<TaskResponse>(`/tasks/${id}/complete`, {
    method: 'PATCH',
  });
  return response.task;
}

// Magic parse - uses AI to extract task details from natural language
export async function parseTask(text: string): Promise<{
  title: string;
  energy_cost: number;
  emotional_friction: 'Low' | 'Medium' | 'High';
  due_date?: string;
}> {
  const response = await apiRequest<{
    title: string;
    energy_cost: number;
    emotional_friction: 'Low' | 'Medium' | 'High';
    due_date?: string;
  }>('/tasks/magic-parse', {
    method: 'POST',
    body: { text },
  });
  return response;
}

