import { useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Plane, ArrowLeft, Mail, Loader2, CheckCircle2 } from 'lucide-react';

export default function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });

      if (error) {
        console.error('Password reset error:', error);
      }
      
      // Always show success message to prevent email enumeration
      setSubmitted(true);
    } catch (err) {
      console.error('Unexpected error:', err);
      setSubmitted(true); // Still show success to prevent enumeration
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-dawn flex flex-col items-center justify-center p-4">
      {/* Decorative Elements */}
      <div className="absolute top-10 left-10 text-primary/20 animate-float">
        <Plane className="w-16 h-16" />
      </div>

      {/* Logo & Title */}
      <div className="text-center mb-8 animate-fade-in">
        <div className="inline-flex items-center gap-3 mb-4">
          <div className="w-12 h-12 rounded-xl bg-gradient-ocean flex items-center justify-center shadow-glow">
            <Plane className="w-6 h-6 text-primary-foreground" />
          </div>
          <h1 className="text-3xl font-bold text-gradient-ocean">
            Real Travel 2 <span className="italic">Real Places</span>
          </h1>
        </div>
      </div>

      {/* Forgot Password Card */}
      <Card className="w-full max-w-md animate-fade-in shadow-lg border-0">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl">Reset Password</CardTitle>
          <CardDescription>
            {submitted
              ? "Check your email for reset instructions"
              : "Enter your email to receive a reset link"
            }
          </CardDescription>
        </CardHeader>
        <CardContent>
          {submitted ? (
            <div className="text-center space-y-4">
              <div className="mx-auto w-16 h-16 rounded-full bg-success/10 flex items-center justify-center">
                <CheckCircle2 className="w-8 h-8 text-success" />
              </div>
              <p className="text-muted-foreground">
                If an account exists with that email, we've sent a password reset link.
              </p>
              <p className="text-sm text-muted-foreground">
                Please check your inbox and spam folder.
              </p>
              <Link to="/auth">
                <Button variant="outline" className="w-full mt-4">
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Back to Login
                </Button>
              </Link>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email Address</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    id="email"
                    type="email"
                    placeholder="you@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="pl-10"
                    required
                    disabled={loading}
                  />
                </div>
              </div>

              {error && (
                <p className="text-sm text-destructive">{error}</p>
              )}

              <Button
                type="submit"
                className="w-full bg-gradient-ocean hover:opacity-90 transition-opacity"
                disabled={loading || !email}
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Sending...
                  </>
                ) : (
                  'Send Reset Link'
                )}
              </Button>

              <div className="text-center">
                <Link
                  to="/auth"
                  className="text-sm text-muted-foreground hover:text-primary transition-colors inline-flex items-center gap-1"
                >
                  <ArrowLeft className="w-3 h-3" />
                  Back to Login
                </Link>
              </div>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
