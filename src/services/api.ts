import { File } from 'expo-file-system';
import { fetch } from 'expo/fetch';

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

