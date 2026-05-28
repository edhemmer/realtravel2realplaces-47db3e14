import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { MapPin, Calendar, Eye, EyeOff, Loader2, AlertCircle, Mail, Lock } from 'lucide-react';
import { User } from 'lucide-react';
import logoImg from '@/assets/rt2rp-logo.png';
import { lovable } from '@/integrations/lovable';

function AppleIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M16.365 1.43c0 1.14-.46 2.21-1.21 3.01-.82.88-2.14 1.56-3.27 1.46-.13-1.12.43-2.27 1.18-3.05.84-.88 2.27-1.55 3.3-1.42zM20.5 17.45c-.55 1.27-.81 1.84-1.52 2.96-.99 1.56-2.39 3.5-4.12 3.51-1.54.02-1.94-1-4.03-.99-2.09.01-2.53 1.01-4.07.99-1.73-.02-3.05-1.77-4.04-3.33C-.05 16.78-.34 11.4 1.86 8.51c1.49-1.97 3.83-3.12 6.04-3.12 2.25 0 3.67 1.23 5.53 1.23 1.8 0 2.9-1.23 5.5-1.23 1.97 0 4.05 1.07 5.54 2.93-4.87 2.67-4.08 9.62-3.97 9.13z"/>
    </svg>
  );
}

export default function Auth() {
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const {
    signIn,
    signUp,
    user
  } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  
  // Determine initial tab from URL param (e.g., /auth?tab=signup)
  const tabParam = searchParams.get('tab');
  const initialTab = tabParam === 'signup' ? 'signup' : 'signin';

  // Check for session expired or idle logout reason
  useEffect(() => {
    const reason = searchParams.get('reason');
    if (reason === 'sessionExpired') {
      setError('Your session has expired. Please log in again.');
    } else if (reason === 'idle') {
      setError('You were logged out after 2 hours of inactivity for security.');
    }
  }, [searchParams]);

  // Redirect if already authenticated
  useEffect(() => {
    if (user) {
      navigate('/dashboard');
    }
  }, [user, navigate]);
  const clearMessages = () => {
    setError('');
    setSuccessMessage('');
    setPassword('');
  };
  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loading) return; // Prevent double submission

    clearMessages();
    const normalizedEmail = email.trim().toLowerCase();
    if (!normalizedEmail) {
      setError('Email is required.');
      return;
    }
    setLoading(true);
    try {
      const {
        error
      } = await signIn(normalizedEmail, password);
      if (error) {
        // User-friendly error messages
        if (error.message.includes('Invalid login credentials')) {
          setError('Incorrect email or password.');
        } else if (error.message.includes('Email not confirmed')) {
          setError('Please verify your email before signing in.');
        } else {
          setError(error.message);
        }
      } else {
        navigate('/dashboard');
      }
    } catch (err) {
      setError('An unexpected error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };
  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loading) return; // Prevent double submission

    clearMessages();

    // Validate first and last name
    if (!firstName.trim()) {
      setError('First name is required.');
      return;
    }
    if (!lastName.trim()) {
      setError('Last name is required.');
      return;
    }

    // Validate password
    if (password.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }
    const normalizedEmail = email.trim().toLowerCase();
    if (!normalizedEmail) {
      setError('Email is required.');
      return;
    }
    setLoading(true);
    try {
      const { error } = await signUp({ email: normalizedEmail, password, firstName: firstName.trim(), lastName: lastName.trim() });
      if (error) {
        if (error.message.includes('already registered')) {
          setError('An account with this email already exists.');
        } else {
          setError(error.message);
        }
      } else {
        setSuccessMessage('Account created successfully! Please check your email to verify your account.');
        setFirstName('');
        setLastName('');
        setPassword('');
      }
    } catch (err) {
      setError('An unexpected error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };
  const handleApple = async () => {
    if (loading) return;
    clearMessages();
    setLoading(true);
    try {
      const result = await lovable.auth.signInWithOAuth('apple', {
        redirect_uri: window.location.origin + '/dashboard',
      });
      if (result.error) {
        setError(result.error.message || 'Could not sign in with Apple.');
        setLoading(false);
        return;
      }
      if (result.redirected) return;
      navigate('/dashboard');
    } catch {
      setError('An unexpected error occurred. Please try again.');
      setLoading(false);
    }
  };
  return <div className="min-h-screen bg-gradient-dawn flex flex-col items-center justify-center p-4">
      {/* Decorative Elements */}
      <div className="absolute bottom-10 right-10 text-primary/20 animate-float" style={{
      animationDelay: '2s'
    }}>
        <MapPin className="w-12 h-12" />
      </div>
      <div className="absolute top-1/4 right-20 text-accent-foreground/20 animate-float" style={{
      animationDelay: '1s'
    }}>
        <Calendar className="w-10 h-10" />
      </div>


      {/* Auth Card */}
      <Card className="w-full max-w-md animate-fade-in shadow-lg border-0">
        <CardHeader className="text-center pb-4">
          <CardTitle className="text-2xl">Welcome</CardTitle>
          <CardDescription>Sign in to manage your trips</CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue={initialTab} className="w-full" onValueChange={clearMessages}>
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
                    <Input id="signin-email" type="email" placeholder="you@example.com" value={email} onChange={e => setEmail(e.target.value)} className="pl-10" required disabled={loading} autoComplete="email" />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="signin-password">Password</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input id="signin-password" type={showPassword ? 'text' : 'password'} placeholder="••••••••" value={password} onChange={e => setPassword(e.target.value)} className="pl-10 pr-10" required disabled={loading} autoComplete="current-password" />
                    <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors" tabIndex={-1}>
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {error && <div className="flex items-center gap-2 text-sm text-destructive bg-destructive/10 p-3 rounded-md">
                    <AlertCircle className="w-4 h-4 flex-shrink-0" />
                    <span>{error}</span>
                  </div>}

                {successMessage && <div className="text-sm text-success bg-success/10 p-3 rounded-md">
                    {successMessage}
                  </div>}

                <Button type="submit" className="w-full bg-gradient-ocean hover:opacity-90 transition-opacity" disabled={loading}>
                  {loading ? <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Signing in...
                    </> : 'Sign In'}
                </Button>

                <div className="relative my-2">
                  <div className="absolute inset-0 flex items-center"><span className="w-full border-t border-border/60" /></div>
                  <div className="relative flex justify-center text-xs uppercase"><span className="bg-card px-2 text-muted-foreground">or</span></div>
                </div>

                <Button type="button" variant="outline" onClick={handleApple} disabled={loading} className="w-full h-11 rounded-xl bg-black text-white hover:bg-black/90 border-black focus-ring-canonical">
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
                      <Input id="signup-firstname" type="text" value={firstName} onChange={e => setFirstName(e.target.value)} className="pl-10" required disabled={loading} autoComplete="given-name" />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="signup-lastname">Last Name</Label>
                    <div className="relative">
                      <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <Input id="signup-lastname" type="text" value={lastName} onChange={e => setLastName(e.target.value)} className="pl-10" required disabled={loading} autoComplete="family-name" />
                    </div>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="signup-email">Email</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input id="signup-email" type="email" placeholder="you@example.com" value={email} onChange={e => setEmail(e.target.value)} className="pl-10" required disabled={loading} autoComplete="email" />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="signup-password">Password</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input id="signup-password" type={showPassword ? 'text' : 'password'} placeholder="••••••••" value={password} onChange={e => setPassword(e.target.value)} className="pl-10 pr-10" required minLength={6} disabled={loading} autoComplete="new-password" />
                    <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors" tabIndex={-1}>
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Minimum 6 characters
                  </p>
                </div>

                {error && <div className="flex items-center gap-2 text-sm text-destructive bg-destructive/10 p-3 rounded-md">
                    <AlertCircle className="w-4 h-4 flex-shrink-0" />
                    <span>{error}</span>
                  </div>}

                {successMessage && <div className="text-sm text-success bg-success/10 p-3 rounded-md">
                    {successMessage}
                  </div>}

                <Button type="submit" className="w-full bg-gradient-ocean hover:opacity-90 transition-opacity" disabled={loading}>
                  {loading ? <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Creating account...
                    </> : 'Create Account'}
                </Button>

                <div className="relative my-2">
                  <div className="absolute inset-0 flex items-center"><span className="w-full border-t border-border/60" /></div>
                  <div className="relative flex justify-center text-xs uppercase"><span className="bg-card px-2 text-muted-foreground">or</span></div>
                </div>

                <Button type="button" variant="outline" onClick={handleApple} disabled={loading} className="w-full h-11 rounded-xl bg-black text-white hover:bg-black/90 border-black focus-ring-canonical">
                  <AppleIcon className="w-4 h-4 mr-2" />
                  Continue with Apple
                </Button>
              </form>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* Footer */}
      <p className="text-xs text-muted-foreground mt-8 text-center">
        By continuing, you agree to our terms of service.
      </p>
    </div>;
}