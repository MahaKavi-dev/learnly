import { Platform } from 'react-native';

import { API_BASE_URL } from '@/config/api';
import { getCurrentChildId } from '@/config/learner';
import { READING_EXERCISES, WRITING_EXERCISES } from '@/data/exercises';
import { AssessmentRequest, AssessmentResponse } from '@/types/assessment';
import { ExerciseItem } from '@/types/exercise';

/**
 * Sends a reading or writing exercise assessment payload to the FastAPI backend.
 * Automatically attaches authenticated user ID so attempts, progress, and streaks persist in Supabase.
 * 
 * Endpoint: POST /api/assess
 */
export async function assessReading(payload: AssessmentRequest): Promise<AssessmentResponse> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 10000); // 10s timeout

  const requestPayload: AssessmentRequest = {
    ...payload,
    childId: payload.childId || getCurrentChildId(),
  };

  try {
    const response = await globalThis.fetch(`${API_BASE_URL}/api/assess`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestPayload),
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
 * Uses standard React Native multipart FormData serialization compatible with Android & iOS.
 * 
 * Language codes:
 * English -> en-IN
 * Tamil -> ta-IN
 * 
 * Primary Endpoint: POST /api/stt
 * Fallback Endpoint: POST /api/transcribe
 */
export function transcribeAudio(audioUri: string, language: string): Promise<string> {
  const languageCode = language === 'ta' ? 'ta-IN' : 'en-IN';

  // Ensure uri starts with file:// on Android if missing local file scheme
  const cleanUri =
    Platform.OS === 'android' && !audioUri.startsWith('file://') && !audioUri.startsWith('content://')
      ? `file://${audioUri}`
      : audioUri;

  const fileExtension = cleanUri.split('.').pop()?.split('?')[0] || 'm4a';
  const fileName = `recording.${fileExtension}`;
  const mimeType =
    fileExtension === 'wav'
      ? 'audio/wav'
      : fileExtension === 'mp3'
      ? 'audio/mp3'
      : fileExtension === 'ogg'
      ? 'audio/ogg'
      : 'audio/m4a';

  // Native React Native FormData part object shape
  const formData = new FormData();
  formData.append('file', {
    uri: cleanUri,
    name: fileName,
    type: mimeType,
  } as any);
  formData.append('language', languageCode);

  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    const url = `${API_BASE_URL}/api/stt`;

    xhr.open('POST', url);
    xhr.timeout = 60000; // 60s timeout for local Whisper STT inference

    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        try {
          const data = JSON.parse(xhr.responseText);
          resolve(data.transcript || data.text || '');
        } catch (error) {
          reject(new Error('Failed to parse STT response JSON.'));
        }
      } else {
        reject(new Error(`STT server returned status ${xhr.status}`));
      }
    };

    xhr.onerror = (error) => {
      console.error('XHR STT request failed:', error);
      reject(new Error('STT network request failed.'));
    };

    xhr.ontimeout = () => {
      reject(new Error('STT request timed out (60s).'));
    };

    xhr.send(formData);
  });
}

export interface FetchExercisesParams {
  language: 'en' | 'ta';
  type: 'reading' | 'writing';
  difficulty?: 'easy' | 'medium' | 'hard' | 1 | 2 | 3;
  skill?: string;
}

/**
 * Fetches exercise list from backend API endpoint: GET /api/exercises
 * Query params: language, type, difficulty, skill
 * Falls back gracefully to local dataset if network request fails.
 */
export async function fetchBackendExercises(params: FetchExercisesParams): Promise<ExerciseItem[]> {
  const queryParams = new URLSearchParams();
  queryParams.append('language', params.language);
  queryParams.append('type', params.type);
  if (params.difficulty !== undefined) {
    queryParams.append('difficulty', String(params.difficulty));
  }
  if (params.skill) {
    queryParams.append('skill', params.skill);
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 6000); // 6s timeout

  try {
    const url = `${API_BASE_URL}/api/exercises?${queryParams.toString()}`;
    const response = await globalThis.fetch(url, { signal: controller.signal });
    clearTimeout(timeoutId);

    if (response.ok) {
      const data = await response.json();
      if (Array.isArray(data) && data.length > 0) {
        return data.map((item: any, idx: number) => ({
          ...item,
          text: item.content || item.text || '',
          prompt: item.content || item.prompt || '',
          expectedAnswer: item.expected_answer || item.expectedAnswer || '',
          expected_answer: item.expected_answer || item.expectedAnswer || '',
          questionNumber: idx + 1,
        }));
      }
    }
  } catch (error) {
    clearTimeout(timeoutId);
    console.warn('Backend GET /api/exercises fetch failed or timed out, falling back to local dataset:', error);
  }

  // Local fallback filtering
  const localList: ExerciseItem[] = params.type === 'reading'
    ? READING_EXERCISES[params.language]
    : WRITING_EXERCISES[params.language];

  const diffNum = params.difficulty === 'easy' ? 1
    : params.difficulty === 'medium' ? 2
    : params.difficulty === 'hard' ? 3
    : typeof params.difficulty === 'number' ? params.difficulty
    : undefined;

  let filtered = localList;
  if (diffNum !== undefined) {
    filtered = filtered.filter((ex) => ex.difficulty === diffNum);
  }
  if (params.skill) {
    filtered = filtered.filter((ex) => ex.skill === params.skill);
  }

  return filtered.length > 0 ? filtered : localList;
}
