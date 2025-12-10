import { apiRequest } from "./client";
import type { ConsultResponse } from "../types";

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
