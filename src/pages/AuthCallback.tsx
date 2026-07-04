import { useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { BrandedPageLoader } from '@/components/ui/premium-loading';

function safeRedirect(value: string | null) {
  if (!value || !value.startsWith('/') || value.startsWith('//') || value.startsWith('/auth')) {
    return '/dashboard';
  }
  return value;
}

export default function AuthCallback() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  useEffect(() => {
    let cancelled = false;
    const redirectTo = safeRedirect(searchParams.get('redirect'));

    async function readSessionWithRetry() {
      for (let attempt = 0; attempt < 5; attempt += 1) {
        const { data, error } = await supabase.auth.getSession();
        if (error) throw error;
        if (data.session) return data.session;
        await new Promise((resolve) => window.setTimeout(resolve, 200));
      }
      return null;
    }

    async function finishAuth() {
      try {
        const hashParams = new URLSearchParams(window.location.hash.substring(1));
        const recoveryType = hashParams.get('type');
        const recoveryAccessToken = hashParams.get('access_token');
        const recoveryError = hashParams.get('error_description');

        if (recoveryError) {
          navigate(`/reset-password?error=${encodeURIComponent(recoveryError)}`, { replace: true });
          return;
        }

        if (recoveryType === 'recovery' && recoveryAccessToken) {
          navigate(`/reset-password${window.location.hash}`, { replace: true });
          return;
        }

        const code = searchParams.get('code');
        const type = searchParams.get('type');
        if (code) {
          const { error } = await supabase.auth.exchangeCodeForSession(code);
          if (error) throw error;

          if (type === 'recovery') {
            navigate('/reset-password', { replace: true });
            return;
          }
        }

        const session = await readSessionWithRetry();
        if (cancelled) return;

        navigate(session ? redirectTo : '/auth?verified=1', { replace: true });
      } catch (error) {
        console.error('Auth callback error:', error);
        if (!cancelled) {
          navigate('/auth?error=verification', { replace: true });
        }
      }
    }

    finishAuth();

    return () => {
      cancelled = true;
    };
  }, [navigate, searchParams]);

  return <BrandedPageLoader />;
}
