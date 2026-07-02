import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { AlertCircle, Calendar, Eye, EyeOff, Loader2, Lock, Mail, MapPin, User } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { supabase, supabaseConfig } from '@/integrations/supabase/client';
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
          redirectTo: `${window.location.origin}/auth/callback?redirect=${encodeURIComponent(redirectTo)}`,
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

  return (
    <div className="min-h-screen bg-gradient-dawn flex flex-col items-center justify-center p-4">
      <div className="absolute bottom-10 right-10 text-primary/20 animate-float" style={{ animationDelay: '2s' }}>
        <MapPin className="w-12 h-12" />
      </div>
      <div className="absolute top-1/4 right-20 text-accent-foreground/20 animate-float" style={{ animationDelay: '1s' }}>
        <Calendar className="w-10 h-10" />
      </div>

      <img
        src={logoImg}
        alt="RealTravel2RealPlaces"
        className="w-20 h-20 mb-6 rounded-2xl shadow-md animate-fade-in"
      />

      <Card className="w-full max-w-md animate-fade-in shadow-lg border-0">
        <CardHeader className="text-center pb-4">
          <CardTitle className="text-2xl">Welcome</CardTitle>
          <CardDescription>Sign in to manage your trips</CardDescription>
        </CardHeader>
        <CardContent>
          {status === 'loading' || status === 'authenticated' ? (
            <div className="flex flex-col items-center justify-center gap-3 py-10 text-center">
              <Loader2 className="h-5 w-5 animate-spin text-primary" />
              <div>
                <p className="text-sm font-medium">Checking your session</p>
                <p className="mt-1 text-xs text-muted-foreground">We are securely opening your travel dashboard.</p>
              </div>
            </div>
          ) : (
            <Tabs value={activeTab} className="w-full" onValueChange={handleTabChange}>
              <TabsList className="grid w-full grid-cols-2 mb-6">
                <TabsTrigger value="signin">Sign In</TabsTrigger>
                <TabsTrigger value="signup">Sign Up</TabsTrigger>
              </TabsList>

              <TabsContent value="signin">
                <form onSubmit={handleSignIn} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="signin-email">Email</Label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <Input id="signin-email" type="email" placeholder="you@example.com" value={email} onChange={(event) => setEmail(event.target.value)} className="pl-10" required disabled={blocked} autoComplete="email" />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="signin-password">Password</Label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <Input id="signin-password" type={showPassword ? 'text' : 'password'} placeholder="••••••••" value={password} onChange={(event) => setPassword(event.target.value)} className="pl-10 pr-10" required disabled={blocked} autoComplete="current-password" />
                      <button type="button" onClick={() => setShowPassword((value) => !value)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors" tabIndex={-1}>
                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  {(authConfigError || error) && (
                    <div className="flex items-center gap-2 text-sm text-destructive bg-destructive/10 p-3 rounded-md">
                      <AlertCircle className="w-4 h-4 flex-shrink-0" />
                      <span>{authConfigError || error}</span>
                    </div>
                  )}

                  {successMessage && <div className="text-sm text-success bg-success/10 p-3 rounded-md">{successMessage}</div>}

                  <Button type="submit" className="w-full bg-gradient-ocean hover:opacity-90 transition-opacity" disabled={blocked}>
                    {submitting ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Signing in...
                      </>
                    ) : 'Sign In'}
                  </Button>

                  <div className="relative my-2">
                    <div className="absolute inset-0 flex items-center"><span className="w-full border-t border-border/60" /></div>
                    <div className="relative flex justify-center text-xs uppercase"><span className="bg-card px-2 text-muted-foreground">or</span></div>
                  </div>

                  <Button type="button" variant="outline" onClick={handleApple} disabled={blocked} className="w-full h-11 rounded-xl bg-black text-white hover:bg-black/90 border-black focus-ring-canonical">
                    <AppleIcon className="w-4 h-4 mr-2" />
                    Continue with Apple
                  </Button>

                  <div className="text-center">
                    <Link to="/forgot-password" className="text-sm text-muted-foreground hover:text-primary transition-colors">
                      Forgot password?
                    </Link>
                  </div>
                </form>
              </TabsContent>

              <TabsContent value="signup">
                <form onSubmit={handleSignUp} className="space-y-4">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-2">
                      <Label htmlFor="signup-firstname">First Name</Label>
                      <div className="relative">
                        <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                        <Input id="signup-firstname" type="text" value={firstName} onChange={(event) => setFirstName(event.target.value)} className="pl-10" required disabled={blocked} autoComplete="given-name" />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="signup-lastname">Last Name</Label>
                      <div className="relative">
                        <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                        <Input id="signup-lastname" type="text" value={lastName} onChange={(event) => setLastName(event.target.value)} className="pl-10" required disabled={blocked} autoComplete="family-name" />
                      </div>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="signup-email">Email</Label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <Input id="signup-email" type="email" placeholder="you@example.com" value={email} onChange={(event) => setEmail(event.target.value)} className="pl-10" required disabled={blocked} autoComplete="email" />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="signup-password">Password</Label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <Input id="signup-password" type={showPassword ? 'text' : 'password'} placeholder="••••••••" value={password} onChange={(event) => setPassword(event.target.value)} className="pl-10 pr-10" required minLength={6} disabled={blocked} autoComplete="new-password" />
                      <button type="button" onClick={() => setShowPassword((value) => !value)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors" tabIndex={-1}>
                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                    <p className="text-xs text-muted-foreground">Minimum 6 characters</p>
                  </div>

                  {(authConfigError || error) && (
                    <div className="flex items-center gap-2 text-sm text-destructive bg-destructive/10 p-3 rounded-md">
                      <AlertCircle className="w-4 h-4 flex-shrink-0" />
                      <span>{authConfigError || error}</span>
                    </div>
                  )}

                  {successMessage && <div className="text-sm text-success bg-success/10 p-3 rounded-md">{successMessage}</div>}

                  <Button type="submit" className="w-full bg-gradient-ocean hover:opacity-90 transition-opacity" disabled={blocked}>
                    {submitting ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Creating account...
                      </>
                    ) : 'Create Account'}
                  </Button>

                  <div className="relative my-2">
                    <div className="absolute inset-0 flex items-center"><span className="w-full border-t border-border/60" /></div>
                    <div className="relative flex justify-center text-xs uppercase"><span className="bg-card px-2 text-muted-foreground">or</span></div>
                  </div>

                  <Button type="button" variant="outline" onClick={handleApple} disabled={blocked} className="w-full h-11 rounded-xl bg-black text-white hover:bg-black/90 border-black focus-ring-canonical">
                    <AppleIcon className="w-4 h-4 mr-2" />
                    Continue with Apple
                  </Button>
                </form>
              </TabsContent>
            </Tabs>
          )}
        </CardContent>
      </Card>

      <p className="text-xs text-muted-foreground mt-8 text-center">
        By continuing, you agree to our terms of service.
      </p>
    </div>
  );
}
