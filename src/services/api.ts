import { File } from 'expo-file-system';
import { fetch } from 'expo/fetch';

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
    const response = await globalThis.fetch(`${API_BASE_URL}/api/assess`, {
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

/**
 * Sends a recorded audio file to the backend Speech-to-Text (STT) endpoint.
 * Uses Expo SDK 57 native File object (expo-file-system) and Expo fetch (expo/fetch).
 * 
 * Language codes:
 * English -> en-IN
 * Tamil -> ta-IN
 * 
 * Primary Endpoint: POST /api/stt
 * Fallback Endpoint: POST /api/transcribe
 */
export async function transcribeAudio(audioUri: string, language: string): Promise<string> {
  const languageCode = language === 'ta' ? 'ta-IN' : 'en-IN';

  // Construct Expo SDK 57 native File instance from audio URI
  const audioFile = new File(audioUri);

  // Validate that recorded audio file actually exists on device disk before upload
  if (!audioFile.exists) {
    throw new Error(`Audio file does not exist on device disk: ${audioUri}`);
  }

  const formData = new FormData();
  formData.append('file', audioFile as any);
  formData.append('language', languageCode);

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 15000); // 15s timeout for STT audio upload

  try {
    // Attempt primary backend STT endpoint /api/stt using expo/fetch
    let response = await fetch(`${API_BASE_URL}/api/stt`, {
      method: 'POST',
      body: formData as any,
      signal: controller.signal,
    });

    // Fallback to /api/transcribe if /api/stt returns 404
    if (response.status === 404) {
      const fallbackFormData = new FormData();
      fallbackFormData.append('file', audioFile as any);
      fallbackFormData.append('language', languageCode);

      response = await fetch(`${API_BASE_URL}/api/transcribe`, {
        method: 'POST',
        body: fallbackFormData as any,
        signal: controller.signal,
      });
    }

    clearTimeout(timeoutId);

    if (!response.ok) {
      throw new Error(`STT server returned status ${response.status}`);
    }

    const data = await response.json();
    return data.transcript || data.text || '';
  } catch (error: any) {
    clearTimeout(timeoutId);
    console.error('STT request failed:', error);
    throw error;
  }
}
