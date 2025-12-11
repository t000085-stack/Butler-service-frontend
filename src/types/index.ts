// User types
export interface User {
  id: string;
  username: string;
  email: string;
  baseline_energy?: number;
  core_values?: string[];
  created_at?: string;
  profile_picture?: string;
  health?: string;
  career?: string;
  relationship?: string;
  preferences?: string[];
  personal_value?: string;
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
  // Structured AI response fields
  empathy_statement?: string;
  chosen_task_id?: string | null;
  reasoning?: string;
  micro_step?: string;
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
  personal_value?: string;
}

// Magic Parse types
export interface MagicParseResponse {
  title: string;
  energy_cost: number;
  emotional_friction: EmotionalFriction;
  due_date?: string;
}

// Chat types
export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

export interface ChatResponse {
  response: string;
}

// Enhanced Consult Response with empathy and micro-step
export interface EnhancedConsultResponse {
  recommendation: string;
  context_log_id: string;
  empathy_statement?: string;
  micro_step?: string;
  suggested_task?: Task;
}

// API Error
export interface ApiError {
  message: string;
  status?: number;
}

