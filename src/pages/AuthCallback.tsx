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
        const code = searchParams.get('code');
        if (code) {
          const { error } = await supabase.auth.exchangeCodeForSession(code);
          if (error) throw error;
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
