import { supabase } from '@/integrations/supabase/client';

/**
 * Centralized API request handler with safe JSON parsing and session expiration handling.
 * Prevents crashes from non-JSON responses and handles auth errors gracefully.
 */

export interface ApiResponse<T = unknown> {
  success: boolean;
  data: T | null;
  message: string;
  error?: string;
}

export class SessionExpiredError extends Error {
  constructor() {
    super('Session expired');
    this.name = 'SessionExpiredError';
  }
}

/**
 * Check if response is JSON before parsing
 */
function isJsonResponse(response: Response): boolean {
  const contentType = response.headers.get('Content-Type') || '';
  return contentType.includes('application/json');
}

/**
 * Handle session expiration - clear auth and redirect
 */
export async function handleSessionExpired(): Promise<void> {
  try {
    await supabase.auth.signOut();
  } catch (e) {
    console.warn('Error during sign out:', e);
  }
  
  // Clear any local storage auth tokens
  localStorage.removeItem('sb-tlrviwlfckiahhfmeilv-auth-token');
  
  // Redirect to auth page with reason
  window.location.href = '/auth?reason=sessionExpired';
}

/**
 * Safe fetch wrapper that handles session expiration and non-JSON responses
 */
export async function safeFetch<T = unknown>(
  input: RequestInfo | URL,
  init?: RequestInit
): Promise<ApiResponse<T>> {
  try {
    const response = await fetch(input, init);

    // Handle session expired / unauthorized
    if (response.status === 401 || response.status === 403) {
      await handleSessionExpired();
      return {
        success: false,
        data: null,
        message: 'Your session has expired. Please log in again.',
        error: 'SESSION_EXPIRED'
      };
    }

    // Check if response is JSON
    if (!isJsonResponse(response)) {
      const textContent = await response.text();
      console.warn('Non-JSON response received:', textContent.substring(0, 200));
      
      // Check for common session timeout messages
      const lowerText = textContent.toLowerCase();
      if (lowerText.includes('session') || lowerText.includes('timeout') || lowerText.includes('expired')) {
        await handleSessionExpired();
        return {
          success: false,
          data: null,
          message: 'Your session has expired. Please log in again.',
          error: 'SESSION_EXPIRED'
        };
      }
      
      return {
        success: false,
        data: null,
        message: 'Unexpected server response. Please try again.',
        error: 'INVALID_RESPONSE'
      };
    }

    // Parse JSON safely
    try {
      const jsonData = await response.json();
      
      // Handle our standardized API response format
      if ('success' in jsonData && 'data' in jsonData) {
        return jsonData as ApiResponse<T>;
      }
      
      // Handle raw data response
      return {
        success: response.ok,
        data: jsonData as T,
        message: response.ok ? 'Success' : 'Request failed'
      };
    } catch (parseError) {
      console.error('JSON parse error:', parseError);
      return {
        success: false,
        data: null,
        message: 'Failed to parse server response.',
        error: 'PARSE_ERROR'
      };
    }
  } catch (networkError) {
    console.error('Network error:', networkError);
    return {
      success: false,
      data: null,
      message: 'Network error. Please check your connection.',
      error: 'NETWORK_ERROR'
    };
  }
}

/**
 * Make authenticated API request with session handling
 */
export async function authenticatedFetch<T = unknown>(
  input: RequestInfo | URL,
  init?: RequestInit
): Promise<ApiResponse<T>> {
  // Get current session
  const { data: { session } } = await supabase.auth.getSession();
  
  if (!session) {
    await handleSessionExpired();
    return {
      success: false,
      data: null,
      message: 'Please log in to continue.',
      error: 'NOT_AUTHENTICATED'
    };
  }

  // Add auth header
  const headers = new Headers(init?.headers);
  headers.set('Authorization', `Bearer ${session.access_token}`);
  
  return safeFetch<T>(input, {
    ...init,
    headers
  });
}
