import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import {
  AlertCircle,
  Building2,
  CalendarDays,
  Car,
  Eye,
  EyeOff,
  Loader2,
  Lock,
  Mail,
  Navigation,
  Plane,
  Receipt,
  ShieldCheck,
  User,
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { supabase, supabaseConfig } from '@/integrations/supabase/client';
import { authCallbackUrl } from '@/lib/auth/authRedirects';
import logoImg from '@/assets/rt2rp-logo.png';

function AppleIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M16.365 1.43c0 1.14-.46 2.21-1.21 3.01-.82.88-2.14 1.56-3.27 1.46-.13-1.12.43-2.27 1.18-3.05.84-.88 2.27-1.55 3.3-1.42zM20.5 17.45c-.55 1.27-.81 1.84-1.52 2.96-.99 1.56-2.39 3.5-4.12 3.51-1.54.02-1.94-1-4.03-.99-2.09.01-2.53 1.01-4.07.99-1.73-.02-3.05-1.77-4.04-3.33C-.05 16.78-.34 11.4 1.86 8.51c1.49-1.97 3.83-3.12 6.04-3.12 2.25 0 3.67 1.23 5.53 1.23 1.8 0 2.9-1.23 5.5-1.23 1.97 0 4.05 1.07 5.54 2.93-4.87 2.67-4.08 9.62-3.97 9.13z" />
    </svg>
  );
}

function authErrorMessage(message: string) {
  if (/invalid login credentials/i.test(message)) return 'Incorrect email or password.';
  if (/email not confirmed/i.test(message)) return 'Please verify your email before signing in.';
  if (/already registered|already exists|user already/i.test(message)) {
    return 'An account already exists for this email. Use Sign In or Forgot password.';
  }
  return message || 'Authentication failed. Please try again.';
}

function safeRedirect(value: string | null) {
  if (!value || !value.startsWith('/') || value.startsWith('//')) return '/dashboard';
  if (value.startsWith('/auth')) return '/dashboard';
  return value;
}

type AuthTab = 'signin' | 'signup';

export default function Auth() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { signIn, signUp, status } = useAuth();

  const redirectTo = useMemo(() => safeRedirect(searchParams.get('redirect')), [searchParams]);
  const [activeTab, setActiveTab] = useState<AuthTab>(searchParams.get('tab') === 'signup' ? 'signup' : 'signin');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const authConfigError = !supabaseConfig.hasConfig
    ? `Auth is not configured. Missing ${supabaseConfig.missingKeys.join(', ')}.`
    : '';

  useEffect(() => {
    if (status === 'authenticated') {
      navigate(redirectTo, { replace: true });
    }
  }, [navigate, redirectTo, status]);

  useEffect(() => {
    const reason = searchParams.get('reason');
    const verified = searchParams.get('verified');
    const callbackError = searchParams.get('error');

    if (reason === 'sessionExpired') {
      setError('Your session has expired. Please sign in again.');
    } else if (reason === 'idle') {
      setError('You were logged out after 2 hours of inactivity for security.');
    } else if (verified === '1') {
      setActiveTab('signin');
      setSuccessMessage('Email verified. Please sign in to continue.');
    } else if (callbackError === 'verification') {
      setError('We could not finish email verification. Please try signing in again.');
    }
  }, [searchParams]);

  const clearMessages = ({ clearPassword = true }: { clearPassword?: boolean } = {}) => {
    setError('');
    setSuccessMessage('');
    if (clearPassword) setPassword('');
  };

  const handleTabChange = (value: string) => {
    setActiveTab(value === 'signup' ? 'signup' : 'signin');
    clearMessages();
  };

  const handleSignIn = async (event: React.FormEvent) => {
    event.preventDefault();
    if (submitting || status !== 'anonymous' || authConfigError) return;

    clearMessages({ clearPassword: false });
    const normalizedEmail = email.trim().toLowerCase();
    if (!normalizedEmail) {
      setError('Email is required.');
      return;
    }

    setSubmitting(true);
    try {
      const { error: signInError, session } = await signIn(normalizedEmail, password);
      if (signInError) {
        setError(authErrorMessage(signInError.message));
        return;
      }

      if (!session) {
        setError('Sign in did not return a session. Please try again.');
        return;
      }

      navigate(redirectTo, { replace: true });
    } catch {
      setError('An unexpected sign-in error occurred. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleSignUp = async (event: React.FormEvent) => {
    event.preventDefault();
    if (submitting || status !== 'anonymous' || authConfigError) return;

    clearMessages();
    const normalizedEmail = email.trim().toLowerCase();

    if (!firstName.trim()) {
      setError('First name is required.');
      return;
    }
    if (!lastName.trim()) {
      setError('Last name is required.');
      return;
    }
    if (!normalizedEmail) {
      setError('Email is required.');
      return;
    }
    if (password.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }

    setSubmitting(true);
    try {
      const { error: signUpError, existingAccount, session } = await signUp({
        email: normalizedEmail,
        password,
        firstName,
        lastName,
      });

      if (signUpError) {
        setActiveTab('signin');
        setError(authErrorMessage(signUpError.message));
        return;
      }

      if (existingAccount) {
        setActiveTab('signin');
        setPassword('');
        setError('An account already exists for this email. Use Sign In or Forgot password.');
        return;
      }

      if (session) {
        navigate(redirectTo, { replace: true });
        return;
      }

      setActiveTab('signin');
      setFirstName('');
      setLastName('');
      setPassword('');
      setSuccessMessage('Account created. Check your email to verify it, then sign in.');
    } catch {
      setError('An unexpected signup error occurred. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleApple = async () => {
    if (submitting || status !== 'anonymous' || authConfigError) return;

    clearMessages();
    setSubmitting(true);
    try {
      const { isNativeIOS } = await import('@/lib/native/platform');
      if (isNativeIOS()) {
        const { SignInWithApple } = await import('@capacitor-community/apple-sign-in');
        const nonce = crypto.randomUUID();
        const response = await SignInWithApple.authorize({
          clientId: 'com.inlighttai.rt2rp',
          redirectURI: `${window.location.origin}${redirectTo}`,
          scopes: 'email name',
          state: crypto.randomUUID(),
          nonce,
        });
        const token = response.response?.identityToken;
        if (!token) {
          setError('Apple did not return an identity token. Please try again.');
          return;
        }

        const { error: appleError } = await supabase.auth.signInWithIdToken({
          provider: 'apple',
          token,
          nonce,
        });
        if (appleError) {
          setError(appleError.message || 'Could not sign in with Apple.');
          return;
        }

        navigate(redirectTo, { replace: true });
        return;
      }

      const { error: appleError } = await supabase.auth.signInWithOAuth({
        provider: 'apple',
        options: {
          redirectTo: authCallbackUrl(redirectTo),
        },
      });
      if (appleError) setError(appleError.message || 'Could not sign in with Apple.');
    } catch (err: unknown) {
      const message = String((err as { message?: string })?.message || err || '');
      if (!/cancel|1001/i.test(message)) {
        setError('Could not sign in with Apple. Please try again.');
      }
    } finally {
      setSubmitting(false);
    }
  };

  const blocked = submitting || status !== 'anonymous' || Boolean(authConfigError);
  const formStatus = status === 'loading' || status === 'authenticated';
  const activeMessage = authConfigError || error;
  const fieldChrome = 'h-12 rounded-xl border-white/10 bg-white/[0.04] text-slate-50 placeholder:text-slate-500 shadow-inner shadow-black/20 focus-visible:ring-brand-signal/70';
  const labelChrome = 'text-xs font-semibold uppercase tracking-[0.12em] text-slate-400';

  return (
    <div className="relative min-h-screen overflow-hidden bg-[hsl(var(--brand-obsidian))] text-slate-50">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_18%_10%,hsl(var(--brand-signal)/0.18),transparent_34%),radial-gradient(circle_at_88%_18%,hsl(var(--brand-champagne)/0.10),transparent_32%),linear-gradient(135deg,hsl(228_42%_5%),hsl(224_44%_7%)_46%,hsl(220_32%_11%))]" />
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-brand-signal/60 to-transparent" />

      <main className="relative mx-auto grid min-h-screen w-full max-w-7xl grid-cols-1 items-center gap-10 px-5 py-8 lg:grid-cols-[minmax(0,1.1fr)_minmax(420px,0.82fr)] lg:px-10">
        <section className="hidden lg:block">
          <div className="mb-10 flex items-center gap-4">
            <img src={logoImg} alt="RealTravel2RealPlaces" className="h-14 w-14 rounded-2xl shadow-glow" />
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.24em] text-brand-champagne">Chaos to Clarity</p>
              <p className="mt-1 text-sm text-slate-400">RealTravel2RealPlaces travel operations</p>
            </div>
          </div>

          <div className="max-w-2xl">
            <h1 className="text-5xl font-semibold leading-[0.98] tracking-[-0.04em] text-white xl:text-6xl">
              Travel operations that hold together when the trip does not.
            </h1>
            <p className="mt-6 max-w-xl text-lg leading-8 text-slate-300">
              One operating layer for flights, lodging, drive days, local movement, receipts, weather, timing, and the next right move.
            </p>
          </div>

          <div className="mt-10 grid max-w-2xl grid-cols-3 gap-3">
            {[
              { icon: Plane, label: 'Flights', value: 'watch timing' },
              { icon: Car, label: 'Drive', value: 'route ready' },
              { icon: Receipt, label: 'Spend', value: 'receipts held' },
            ].map((item) => (
              <div key={item.label} className="rounded-2xl border border-white/10 bg-white/[0.045] p-4 shadow-2xl shadow-black/20 backdrop-blur-xl">
                <item.icon className="h-4 w-4 text-brand-signal" />
                <p className="mt-4 text-sm font-semibold text-white">{item.label}</p>
                <p className="mt-1 text-xs text-slate-400">{item.value}</p>
              </div>
            ))}
          </div>

          <div className="mt-8 max-w-2xl rounded-[1.35rem] border border-white/10 bg-white/[0.055] p-5 shadow-2xl shadow-black/30 backdrop-blur-2xl">
            <div className="flex items-start justify-between gap-4 border-b border-white/10 pb-4">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.18em] text-brand-champagne">Today command</p>
                <h2 className="mt-2 text-xl font-semibold text-white">Orlando weekend</h2>
              </div>
              <div className="rounded-full border border-brand-signal/30 bg-brand-signal/10 px-3 py-1 text-xs font-semibold text-brand-signal">
                Live ready
              </div>
            </div>

            <div className="mt-4 grid grid-cols-2 gap-3">
              {[
                { icon: Navigation, title: 'Next move', detail: 'Leave by 7:10 AM' },
                { icon: Building2, title: 'Airport window', detail: 'Terminal, parking, map' },
                { icon: CalendarDays, title: 'Local timing', detail: 'Weather and transit' },
                { icon: ShieldCheck, title: 'Prepared', detail: 'Docs and receipts synced' },
              ].map((item) => (
                <div key={item.title} className="rounded-2xl bg-black/20 p-4">
                  <item.icon className="h-4 w-4 text-brand-signal" />
                  <p className="mt-3 text-sm font-semibold text-white">{item.title}</p>
                  <p className="mt-1 text-xs text-slate-400">{item.detail}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="mx-auto w-full max-w-md lg:mx-0">
          <div className="mb-6 flex items-center justify-center gap-3 lg:hidden">
            <img src={logoImg} alt="RealTravel2RealPlaces" className="h-14 w-14 rounded-2xl shadow-glow" />
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-brand-champagne">Chaos to Clarity</p>
              <p className="text-sm text-slate-400">Travel operations</p>
            </div>
          </div>

          <Card className="overflow-hidden rounded-[1.5rem] border border-white/10 bg-slate-950/78 text-slate-50 shadow-2xl shadow-black/40 backdrop-blur-2xl">
            <CardHeader className="space-y-3 border-b border-white/10 px-6 pb-5 pt-6">
              <CardTitle className="text-2xl tracking-[-0.03em] text-white">
                {activeTab === 'signin' ? 'Open your command center' : 'Create your command center'}
              </CardTitle>
              <CardDescription className="text-slate-400">
                {activeTab === 'signin'
                  ? 'Sign in to manage the moving parts of every trip.'
                  : 'Start with one place for every trip detail after booking.'}
              </CardDescription>
            </CardHeader>
            <CardContent className="px-6 pb-6 pt-5">
              {formStatus ? (
                <div className="flex flex-col items-center justify-center gap-3 py-12 text-center">
                  <Loader2 className="h-5 w-5 animate-spin text-brand-signal" />
                  <div>
                    <p className="text-sm font-medium text-white">Checking your session</p>
                    <p className="mt-1 text-xs text-slate-400">Securely opening your travel dashboard.</p>
                  </div>
                </div>
              ) : (
                <Tabs value={activeTab} className="w-full" onValueChange={handleTabChange}>
                  <TabsList className="mb-6 grid h-12 w-full grid-cols-2 rounded-2xl border border-white/10 bg-white/[0.055] p-1">
                    <TabsTrigger value="signin" className="rounded-xl text-sm font-semibold text-slate-300 data-[state=active]:bg-white data-[state=active]:text-slate-950">
                      Sign In
                    </TabsTrigger>
                    <TabsTrigger value="signup" className="rounded-xl text-sm font-semibold text-slate-300 data-[state=active]:bg-white data-[state=active]:text-slate-950">
                      Sign Up
                    </TabsTrigger>
                  </TabsList>

                  <TabsContent value="signin">
                    <form onSubmit={handleSignIn} className="space-y-4">
                      <AuthEmailField id="signin-email" value={email} onChange={setEmail} disabled={blocked} labelChrome={labelChrome} fieldChrome={fieldChrome} />
                      <AuthPasswordField id="signin-password" value={password} onChange={setPassword} disabled={blocked} showPassword={showPassword} setShowPassword={setShowPassword} labelChrome={labelChrome} fieldChrome={fieldChrome} placeholder="Password" autoComplete="current-password" />
                      <AuthMessages message={activeMessage} successMessage={successMessage} />
                      <AuthSubmitButton disabled={blocked} submitting={submitting} label="Sign In" loadingLabel="Signing in..." />
                      <AuthDivider />
                      <AppleButton disabled={blocked} onClick={handleApple} />
                      <div className="text-center">
                        <Link to="/forgot-password" className="text-sm text-slate-400 transition-colors hover:text-brand-signal">
                          Forgot password?
                        </Link>
                      </div>
                    </form>
                  </TabsContent>

                  <TabsContent value="signup">
                    <form onSubmit={handleSignUp} className="space-y-4">
                      <div className="grid grid-cols-2 gap-3">
                        <AuthNameField id="signup-firstname" label="First Name" value={firstName} onChange={setFirstName} disabled={blocked} labelChrome={labelChrome} fieldChrome={fieldChrome} autoComplete="given-name" />
                        <AuthNameField id="signup-lastname" label="Last Name" value={lastName} onChange={setLastName} disabled={blocked} labelChrome={labelChrome} fieldChrome={fieldChrome} autoComplete="family-name" />
                      </div>
                      <AuthEmailField id="signup-email" value={email} onChange={setEmail} disabled={blocked} labelChrome={labelChrome} fieldChrome={fieldChrome} />
                      <AuthPasswordField id="signup-password" value={password} onChange={setPassword} disabled={blocked} showPassword={showPassword} setShowPassword={setShowPassword} labelChrome={labelChrome} fieldChrome={fieldChrome} placeholder="Minimum 6 characters" autoComplete="new-password" />
                      <AuthMessages message={activeMessage} successMessage={successMessage} />
                      <AuthSubmitButton disabled={blocked} submitting={submitting} label="Create Account" loadingLabel="Creating account..." />
                      <AuthDivider />
                      <AppleButton disabled={blocked} onClick={handleApple} />
                    </form>
                  </TabsContent>
                </Tabs>
              )}
            </CardContent>
          </Card>

          <p className="mt-5 text-center text-xs text-slate-500">
            By continuing, you agree to our terms of service.
          </p>
        </section>
      </main>
    </div>
  );
}

function AuthEmailField({
  id,
  value,
  onChange,
  disabled,
  labelChrome,
  fieldChrome,
}: {
  id: string;
  value: string;
  onChange: (value: string) => void;
  disabled: boolean;
  labelChrome: string;
  fieldChrome: string;
}) {
  return (
    <div className="space-y-2">
      <Label htmlFor={id} className={labelChrome}>Email</Label>
      <div className="relative">
        <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
        <Input id={id} type="email" placeholder="you@example.com" value={value} onChange={(event) => onChange(event.target.value)} className={`pl-10 ${fieldChrome}`} required disabled={disabled} autoComplete="email" />
      </div>
    </div>
  );
}

function AuthNameField({
  id,
  label,
  value,
  onChange,
  disabled,
  labelChrome,
  fieldChrome,
  autoComplete,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  disabled: boolean;
  labelChrome: string;
  fieldChrome: string;
  autoComplete: string;
}) {
  return (
    <div className="space-y-2">
      <Label htmlFor={id} className={labelChrome}>{label}</Label>
      <div className="relative">
        <User className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
        <Input id={id} type="text" value={value} onChange={(event) => onChange(event.target.value)} className={`pl-10 ${fieldChrome}`} required disabled={disabled} autoComplete={autoComplete} />
      </div>
    </div>
  );
}

function AuthPasswordField({
  id,
  value,
  onChange,
  disabled,
  showPassword,
  setShowPassword,
  labelChrome,
  fieldChrome,
  placeholder,
  autoComplete,
}: {
  id: string;
  value: string;
  onChange: (value: string) => void;
  disabled: boolean;
  showPassword: boolean;
  setShowPassword: (updater: (value: boolean) => boolean) => void;
  labelChrome: string;
  fieldChrome: string;
  placeholder: string;
  autoComplete: string;
}) {
  return (
    <div className="space-y-2">
      <Label htmlFor={id} className={labelChrome}>Password</Label>
      <div className="relative">
        <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
        <Input id={id} type={showPassword ? 'text' : 'password'} placeholder={placeholder} value={value} onChange={(event) => onChange(event.target.value)} className={`pl-10 pr-10 ${fieldChrome}`} required minLength={id.includes('signup') ? 6 : undefined} disabled={disabled} autoComplete={autoComplete} />
        <button type="button" onClick={() => setShowPassword((current) => !current)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 transition-colors hover:text-white" tabIndex={-1}>
          {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
        </button>
      </div>
    </div>
  );
}

function AuthMessages({ message, successMessage }: { message: string; successMessage: string }) {
  return (
    <>
      {message && (
        <div className="flex items-center gap-2 rounded-xl border border-destructive/25 bg-destructive/10 p-3 text-sm text-red-200">
          <AlertCircle className="h-4 w-4 flex-shrink-0" />
          <span>{message}</span>
        </div>
      )}
      {successMessage && <div className="rounded-xl border border-success/20 bg-success/10 p-3 text-sm text-emerald-200">{successMessage}</div>}
    </>
  );
}

function AuthSubmitButton({
  disabled,
  submitting,
  label,
  loadingLabel,
}: {
  disabled: boolean;
  submitting: boolean;
  label: string;
  loadingLabel: string;
}) {
  return (
    <Button type="submit" className="h-12 w-full rounded-xl bg-brand-signal font-semibold text-slate-950 shadow-glow hover:bg-brand-signal/90" disabled={disabled}>
      {submitting ? (
        <>
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          {loadingLabel}
        </>
      ) : label}
    </Button>
  );
}

function AuthDivider() {
  return (
    <div className="relative my-2">
      <div className="absolute inset-0 flex items-center"><span className="w-full border-t border-white/10" /></div>
      <div className="relative flex justify-center text-xs uppercase"><span className="bg-slate-950 px-2 text-slate-500">or</span></div>
    </div>
  );
}

function AppleButton({ disabled, onClick }: { disabled: boolean; onClick: () => void }) {
  return (
    <Button type="button" variant="outline" onClick={onClick} disabled={disabled} className="h-12 w-full rounded-xl border-white/10 bg-white text-slate-950 hover:bg-slate-100">
      <AppleIcon className="mr-2 h-4 w-4" />
      Continue with Apple
    </Button>
  );
}
