import { ExamPlan, Question, ProgressItem } from './types';

const PLANS_CACHE_KEY = 'promptpass_cached_plans';
const QUESTIONS_CACHE_KEY = (planId: string) => `promptpass_cached_questions_${planId}`;
const PROGRESS_CACHE_KEY = (planId: string) => `promptpass_cached_progress_${planId}`;

/**
 * Saves study plans to localStorage
 */
export function cachePlans(plans: ExamPlan[]): void {
  try {
    localStorage.setItem(PLANS_CACHE_KEY, JSON.stringify(plans));
  } catch (err) {
    console.warn('[OFFLINE CACHE] Failed to cache plans list:', err);
  }
}

/**
 * Retrieves study plans from localStorage
 */
export function getCachedPlans(): ExamPlan[] {
  try {
    const data = localStorage.getItem(PLANS_CACHE_KEY);
    return data ? JSON.parse(data) : [];
  } catch {
    return [];
  }
}

/**
 * Saves question set of a specific study plan to localStorage
 */
export function cacheQuestions(planId: string, questions: Question[]): void {
  try {
    localStorage.setItem(QUESTIONS_CACHE_KEY(planId), JSON.stringify(questions));
  } catch (err) {
    console.warn(`[OFFLINE CACHE] Failed to cache questions for plan ${planId}:`, err);
  }
}

/**
 * Retrieves questions of a specific study plan from localStorage
 */
export function getCachedQuestions(planId: string): Question[] {
  try {
    const data = localStorage.getItem(QUESTIONS_CACHE_KEY(planId));
    return data ? JSON.parse(data) : [];
  } catch {
    return [];
  }
}

/**
 * Saves progress of a specific study plan to localStorage
 */
export function cacheProgress(planId: string, progress: ProgressItem[]): void {
  try {
    localStorage.setItem(PROGRESS_CACHE_KEY(planId), JSON.stringify(progress));
  } catch (err) {
    console.warn(`[OFFLINE CACHE] Failed to cache progress for plan ${planId}:`, err);
  }
}

/**
 * Retrieves progress for a specific study plan from localStorage
 */
export function getCachedProgress(planId: string): ProgressItem[] {
  try {
    const data = localStorage.getItem(PROGRESS_CACHE_KEY(planId));
    return data ? JSON.parse(data) : [];
  } catch {
    return [];
  }
}

/**
 * Helper to check online status (or network availability)
 */
export function isUserOnline(): boolean {
  if (typeof window !== 'undefined' && 'onLine' in navigator) {
    return navigator.onLine;
  }
  return true;
}

const DEVICE_ID_KEY = 'promptpass_device_id';
const DEVICE_NAME_KEY = 'promptpass_device_name';

/**
 * Retrieves or creates a resilient device UUID
 */
export function getOrCreateDeviceId(): string {
  try {
    let id = localStorage.getItem(DEVICE_ID_KEY);
    if (!id) {
      // Generate standard user friendly device tag (e.g. DEV_XYZ123)
      id = 'DEV_' + Math.random().toString(36).substring(2, 8).toUpperCase();
      localStorage.setItem(DEVICE_ID_KEY, id);
    }
    return id;
  } catch {
    return 'DEV_UNKNOWN';
  }
}

/**
 * Updates the local device identifier (enables device-workspace bridging/pairing)
 */
export function setDeviceId(id: string): void {
  try {
    localStorage.setItem(DEVICE_ID_KEY, id.trim());
  } catch {}
}

/**
 * Retrieves the descriptive label for the active device
 */
export function getDeviceName(): string {
  try {
    const name = localStorage.getItem(DEVICE_NAME_KEY);
    if (name) return name;
    
    let guessed = 'Web Workspace';
    if (typeof navigator !== 'undefined') {
      const ua = navigator.userAgent.toLowerCase();
      if (/iphone|ipad|ipod/.test(ua)) guessed = 'iOS Device';
      else if (/android/.test(ua)) guessed = 'Android Mobile';
      else if (/mobile|touch/.test(ua)) guessed = 'Mobile Device';
      else if (/macintosh/.test(ua)) guessed = 'Mac Computer';
      else if (/windows/.test(ua)) guessed = 'Windows PC';
    }
    return guessed;
  } catch {
    return 'Primary Device';
  }
}

/**
 * Updates the user-defined active device name
 */
export function setDeviceName(name: string): void {
  try {
    localStorage.setItem(DEVICE_NAME_KEY, name.trim());
  } catch {}
}

const MODEL_CACHE_KEY = 'promptpass_gemini_model';

/**
 * Retrieves the currently selected Gemini model or defaults to gemini-3.5-flash
 */
export function getActiveGeminiModel(): string {
  try {
    return localStorage.getItem(MODEL_CACHE_KEY) || 'gemini-3.5-flash';
  } catch {
    return 'gemini-3.5-flash';
  }
}

/**
 * Saves the selected Gemini model
 */
export function setActiveGeminiModel(modelName: string): void {
  try {
    localStorage.setItem(MODEL_CACHE_KEY, modelName);
  } catch {}
}

