import { apiRequest } from "./client";
import type {
  ConsultInput,
  ConsultResponse,
  ContextLog,
  ButlerProfileInput,
  User,
} from "../types";

interface HistoryResponse {
  history: ContextLog[];
}

// ==================== CONSULTATION (CREATE) ====================
export async function consult(input: ConsultInput): Promise<ConsultResponse> {
  return apiRequest<ConsultResponse>("/butler/consult", {
    method: "POST",
    body: input,
  });
}

// ==================== CONTEXT LOG CRUD ====================

// CREATE - Create a context log entry (usually done via consult, but can be created directly)
export async function createContextLog(
  input: ConsultInput
): Promise<ContextLog> {
  return apiRequest<ContextLog>("/butler/history", {
    method: "POST",
    body: input,
  });
}

// READ - Get all context log entries (history)
export async function getHistory(limit = 10): Promise<ContextLog[]> {
  const response = await apiRequest<HistoryResponse>(
    `/butler/history?limit=${limit}`
  );
  return response.history;
}

// READ - Get a single context log entry by ID
export async function getContextLog(id: string): Promise<ContextLog | null> {
  try {
    return await apiRequest<ContextLog>(`/butler/history/${id}`, {
      method: "GET",
    });
  } catch (error) {
    // If GET endpoint doesn't exist, return null
    // Frontend will fall back to polling the history list
    return null;
  }
}

// UPDATE - Update an existing context log entry
export interface UpdateContextLogInput {
  mood?: string;
  current_energy?: number;
  raw_input?: string;
}

export async function updateContextLog(
  id: string,
  input: UpdateContextLogInput
): Promise<ContextLog> {
  return apiRequest<ContextLog>(`/butler/history/${id}`, {
    method: "PATCH",
    body: input,
  });
}

// DELETE - Delete a context log entry
export async function deleteContextLog(id: string): Promise<void> {
  return apiRequest<void>(`/butler/history/${id}`, {
    method: "DELETE",
  });
}

// ==================== BUTLER PROFILE CRUD ====================

// READ - Get butler profile (user profile with butler-specific fields)
export async function getButlerProfile(): Promise<User> {
  const response = await apiRequest<{ user: User }>("/butler/profile", {
    method: "GET",
  });
  return response.user;
}

// UPDATE - Update butler profile
export async function updateButlerProfile(
  input: ButlerProfileInput
): Promise<User> {
  const response = await apiRequest<{ user: User }>("/butler/profile", {
    method: "PATCH",
    body: input,
  });
  return response.user;
}
