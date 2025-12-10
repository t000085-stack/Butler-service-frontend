// User types
export interface User {
  id: string;
  username: string;
  email: string;
  baseline_energy?: number;
  core_values?: string[];
  created_at?: string;
}

export interface AuthResponse {
  message: string;
  user: User;
  token: string;
}

// Task types
export type EmotionalFriction = 'Low' | 'Medium' | 'High';

export interface Task {
  _id: string;
  user_id: string;
  title: string;
  energy_cost: number;
  emotional_friction: EmotionalFriction;
  associated_value?: string;
  is_completed: boolean;
  due_date?: string;
  created_at: string;
}

export interface CreateTaskInput {
  title: string;
  energy_cost: number;
  emotional_friction: EmotionalFriction;
  associated_value?: string;
  due_date?: string;
}

export interface UpdateTaskInput {
  title?: string;
  energy_cost?: number;
  emotional_friction?: EmotionalFriction;
  associated_value?: string;
  due_date?: string;
}

// Butler types
export interface ConsultInput {
  current_mood: string;
  current_energy: number;
  raw_input?: string;
}

export interface ConsultResponse {
  recommendation: string;
  context_log_id: string;
}

export interface ContextLog {
  _id: string;
  user_id: string;
  raw_input: string;
  mood: string;
  current_energy: number;
  timestamp: string;
}

export interface ButlerProfileInput {
  core_values?: string[];
  baseline_energy?: number;
}

// API Error
export interface ApiError {
  message: string;
  status?: number;
}

