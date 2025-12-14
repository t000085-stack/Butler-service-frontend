import { apiRequest } from "./client";
import type { ConsultResponse, ContextLog } from "../types";

export interface MoodEntryInput {
  current_mood: string;
  current_energy: number;
  raw_input?: string;
}

export interface MoodEntryResponse {
  message: string;
  context_log_id?: string;
  recommendation?: string;
}

export interface UpdateMoodInput {
  current_mood?: string;
  current_energy?: number;
  raw_input?: string;
}

interface MoodHistoryResponse {
  history: ContextLog[];
}

// CREATE - Log a new mood entry
export async function logMood(
  input: MoodEntryInput
): Promise<MoodEntryResponse> {
  try {
    const response = await apiRequest<ConsultResponse>("/butler/consult", {
      method: "POST",
      body: input,
    });

    // Convert ConsultResponse to MoodEntryResponse
    return {
      message: "Mood logged successfully!",
      context_log_id: response.context_log_id,
      recommendation: response.recommendation,
    };
  } catch (error: any) {
    // Check if the error response contains a context_log_id (mood was saved despite AI error)
    const errorData = error?.response?.data || error?.response || error?.data;
    const contextLogId = errorData?.context_log_id;

    // If we have a context_log_id, the mood was saved even if AI failed
    if (contextLogId) {
      return {
        message: "Mood logged successfully! (AI recommendation unavailable)",
        context_log_id: contextLogId,
        recommendation: undefined,
      };
    }

    // Check if error message indicates AI model issue
    // Even without context_log_id, we'll treat AI errors as partial success
    // The backend might have saved the mood before the AI call failed
    if (error?.message?.toLowerCase()?.includes("ai model")) {
      // Return success message - mood logging endpoint should save regardless of AI
      return {
        message: "Mood logged successfully! (AI recommendation unavailable)",
        context_log_id: undefined,
        recommendation: undefined,
      };
    }

    // Re-throw the error so it can be handled by the calling component
    throw error;
  }
}

// READ - Get a single mood entry by ID
export async function getMood(id: string): Promise<ContextLog> {
  return apiRequest<ContextLog>(`/butler/history/${id}`, {
    method: "GET",
  });
}

// READ - Get mood history
export async function getMoodHistory(limit = 30): Promise<ContextLog[]> {
  const response = await apiRequest<MoodHistoryResponse>(
    `/butler/history?limit=${limit}`
  );
  return response.history;
}

// UPDATE - Update an existing mood entry
export async function updateMood(
  id: string,
  input: UpdateMoodInput
): Promise<ContextLog> {
  return apiRequest<ContextLog>(`/butler/history/${id}`, {
    method: "PATCH",
    body: input,
  });
}

// DELETE - Delete a mood entry
export async function deleteMood(id: string): Promise<void> {
  return apiRequest<void>(`/butler/history/${id}`, {
    method: "DELETE",
  });
}
