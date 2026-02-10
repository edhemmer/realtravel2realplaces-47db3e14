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
import logoImg from '@/assets/logo.png';

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
  };
  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loading) return; // Prevent double submission

    clearMessages();
    setLoading(true);
    try {
      const {
        error
      } = await signIn(email, password);
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
    setLoading(true);
    try {
      const { error } = await signUp({ email, password, firstName: firstName.trim(), lastName: lastName.trim() });
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

      {/* Logo */}
      <div className="text-center mb-6 animate-fade-in">
        <img
          src={logoImg}
          alt="Real Travel 2 Real Places"
          className="rt2rp-header-logo--auth mx-auto"
        />
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