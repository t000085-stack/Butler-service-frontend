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

export async function consult(input: ConsultInput): Promise<ConsultResponse> {
  return apiRequest<ConsultResponse>("/butler/consult", {
    method: "POST",
    body: input,
  });
}

export async function getHistory(limit = 10): Promise<ContextLog[]> {
  const response = await apiRequest<HistoryResponse>(
    `/butler/history?limit=${limit}`
  );
  return response.history;
}

export async function updateButlerProfile(
  input: ButlerProfileInput
): Promise<User> {
  const response = await apiRequest<{ user: User }>("/butler/profile", {
    method: "PATCH",
    body: input,
  });
  return response.user;
}

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

export async function deleteContextLog(id: string): Promise<void> {
  return apiRequest<void>(`/butler/history/${id}`, {
    method: "DELETE",
  });
}

/**
 * Get a single context log entry by ID
 *
 * Backend endpoint needed (following the router pattern):
 *
 * GET /api/butler/history/:id
 * Authorization: Bearer <token>
 *
 * Response should include:
 * {
 *   _id: string,
 *   user_id: string,
 *   raw_input: string,
 *   mood: string,
 *   current_energy: number,
 *   timestamp: string,
 *   recommendation?: string  // AI recommendation (may be delayed)
 * }
 *
 * This endpoint is used to poll for AI recommendations that are generated asynchronously.
 */
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
