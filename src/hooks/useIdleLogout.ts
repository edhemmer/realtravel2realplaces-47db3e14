/**
 * useIdleLogout.ts
 * 
 * v2.1.39: Security feature - Auto-logout after 2 hours of inactivity.
 * 
 * "Inactivity" is defined as no user interaction events:
 * - No clicks/taps
 * - No keypresses
 * - No touch events
 * - No mouse movement
 * - No scrolling
 * - No navigation within the app
 * 
 * When timeout fires:
 * 1. User is logged out via signOut()
 * 2. Redirected to /auth?reason=idle
 * 3. Auth page shows security message
 */
import { useEffect, useRef, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';

// 2 hours in milliseconds
const IDLE_TIMEOUT_MS = 120 * 60 * 1000;

/**
 * Hook to auto-logout users after 2 hours of inactivity.
 * 
 * Usage: Call this hook once in your authenticated layout (e.g., Layout.tsx).
 * The hook only runs when a user is authenticated.
 */
export function useIdleLogout() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastActivityRef = useRef<number>(Date.now());

  const handleLogout = useCallback(async () => {
    console.log('Idle timeout reached - logging out user');
    await signOut();
    navigate('/auth?reason=idle', { replace: true });
  }, [signOut, navigate]);

  const resetTimer = useCallback(() => {
    lastActivityRef.current = Date.now();
    
    // Clear existing timeout
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    
    // Set new timeout
    timeoutRef.current = setTimeout(() => {
      handleLogout();
    }, IDLE_TIMEOUT_MS);
  }, [handleLogout]);

  useEffect(() => {
    // Only run if user is authenticated
    if (!user) return;

    // Activity event handlers
    const handleActivity = () => {
      resetTimer();
    };

    // Reset timer on navigation (location changes)
    resetTimer();

    // Attach global event listeners
    const events: (keyof WindowEventMap)[] = ['click', 'keydown', 'touchstart', 'mousemove', 'scroll'];
    
    events.forEach(event => {
      window.addEventListener(event, handleActivity, { passive: true });
    });

    // Cleanup
    return () => {
      events.forEach(event => {
        window.removeEventListener(event, handleActivity);
      });
      
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [user, resetTimer, location.pathname]);

  return null;
}
