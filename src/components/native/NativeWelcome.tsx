import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { Plane } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { tapHaptic } from '@/lib/native/haptics';

const WELCOMED_KEY = 'nt_welcomed';

export function hasSeenNativeWelcome(): boolean {
  try { return localStorage.getItem(WELCOMED_KEY) === '1'; } catch { return true; }
}

/**
 * Signature first-launch hero shown once per native install.
 * Calm, branded, single CTA. Sets a localStorage flag and routes onward.
 */
export default function NativeWelcome() {
  const navigate = useNavigate();
  const { user } = useAuth();

  const onContinue = async () => {
    try { localStorage.setItem(WELCOMED_KEY, '1'); } catch { /* ignore */ }
    void tapHaptic();
    navigate(user ? '/dashboard' : '/auth', { replace: true });
  };

  return (
    <div className="min-h-screen w-full flex flex-col items-center justify-between bg-[#F6F8FB] px-6 pt-24 pb-10">
      <div className="flex-1 flex flex-col items-center justify-center text-center max-w-md">
        <motion.div
          initial={{ scale: 0.6, opacity: 0, rotate: -12 }}
          animate={{ scale: 1, opacity: 1, rotate: 0 }}
          transition={{ type: 'spring', stiffness: 140, damping: 14, delay: 0.05 }}
          className="mb-10 h-24 w-24 rounded-3xl bg-white shadow-[0_20px_60px_-20px_rgba(15,23,42,0.25)] flex items-center justify-center"
        >
          <Plane className="h-11 w-11 text-foreground" strokeWidth={1.5} />
        </motion.div>

        <motion.h1
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.25 }}
          className="text-4xl font-semibold tracking-tight text-foreground"
        >
          Real travel.<br />Real places.
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.4 }}
          className="mt-5 text-base leading-relaxed text-muted-foreground"
        >
          A calm place for everything your trip needs — bookings, timing, and the next step, always one tap away.
        </motion.p>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.6 }}
        className="w-full max-w-md"
      >
        <Button
          onClick={onContinue}
          className="w-full h-12 rounded-xl text-base font-medium"
          size="lg"
        >
          Get started
        </Button>
      </motion.div>
    </div>
  );
}
