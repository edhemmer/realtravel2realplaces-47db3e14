import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { BrandedPageLoader } from '@/components/ui/premium-loading';

export default function AuthCallback() {
  const navigate = useNavigate();

  useEffect(() => {
    let cancelled = false;

    async function finishAuth() {
      try {
        const params = new URLSearchParams(window.location.search);
        const code = params.get('code');

        if (code) {
          const { error } = await supabase.auth.exchangeCodeForSession(code);
          if (error) throw error;
        }

        const { data, error } = await supabase.auth.getSession();
        if (error) throw error;

        if (!cancelled) {
          navigate(data.session ? '/dashboard' : '/auth?verified=1', { replace: true });
        }
      } catch (error) {
        console.error('Auth callback error:', error);
        if (!cancelled) {
          window.setTimeout(() => navigate('/auth?error=verification', { replace: true }), 1500);
        }
      }
    }

    finishAuth();

    return () => {
      cancelled = true;
    };
  }, [navigate]);

  return <BrandedPageLoader />;
}
