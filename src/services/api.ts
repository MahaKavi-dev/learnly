import { API_BASE_URL } from '@/config/api';
import { AssessmentRequest, AssessmentResponse } from '@/types/assessment';

/**
 * Sends a reading or writing exercise assessment payload to the FastAPI backend.
 * 
 * Endpoint: POST /api/assess
 */
export async function assessReading(payload: AssessmentRequest): Promise<AssessmentResponse> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 10000); // 10s timeout

  try {
    const response = await fetch(`${API_BASE_URL}/api/assess`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      throw new Error(`Server returned status ${response.status}`);
    }

    const data: AssessmentResponse = await response.json();
    return data;
  } catch (error: any) {
    clearTimeout(timeoutId);
    console.error('FastAPI assessment request failed:', error);
    throw error;
  }
}
