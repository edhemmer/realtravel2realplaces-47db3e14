import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useProfileCompletion, useCompleteProfile } from '@/hooks/useProfileCompletion';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { User, Loader2, AlertCircle, Plane } from 'lucide-react';

export default function CompleteProfile() {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const { isComplete, isLoading: profileLoading, firstName: existingFirst, lastName: existingLast } = useProfileCompletion();
  const completeProfileMutation = useCompleteProfile();

  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [error, setError] = useState('');

  // Pre-fill with existing values if any
  useEffect(() => {
    if (existingFirst) setFirstName(existingFirst);
    if (existingLast) setLastName(existingLast);
  }, [existingFirst, existingLast]);

  // Redirect if not authenticated
  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/auth', { replace: true });
    }
  }, [user, authLoading, navigate]);

  // Redirect if profile is already complete
  useEffect(() => {
    if (!profileLoading && isComplete) {
      navigate('/dashboard', { replace: true });
    }
  }, [isComplete, profileLoading, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!firstName.trim()) {
      setError('First name is required.');
      return;
    }
    if (!lastName.trim()) {
      setError('Last name is required.');
      return;
    }

    try {
      await completeProfileMutation.mutateAsync({
        firstName: firstName.trim(),
        lastName: lastName.trim(),
      });
      navigate('/dashboard', { replace: true });
    } catch (err) {
      console.error('Error completing profile:', err);
      setError('Failed to save your profile. Please try again.');
    }
  };

  // Show loading while checking auth/profile status
  if (authLoading || profileLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-dawn">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  // Don't render if already complete (redirect will happen)
  if (isComplete) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-dawn flex flex-col items-center justify-center p-4">
      {/* Logo */}
      <div className="text-center mb-8 animate-fade-in">
        <div className="inline-flex items-center gap-3 mb-4">
          <div className="w-12 h-12 rounded-xl bg-gradient-ocean flex items-center justify-center shadow-glow">
            <Plane className="w-6 h-6 text-primary-foreground" />
          </div>
          <h1 className="font-bold text-gradient-ocean text-3xl sm:text-4xl">
            Real Travel 2 <span className="italic">Real Places</span>
          </h1>
        </div>
      </div>

      {/* Complete Profile Card */}
      <Card className="w-full max-w-md animate-fade-in shadow-lg border-0">
        <CardHeader className="text-center pb-4">
          <CardTitle className="text-2xl">Complete your profile</CardTitle>
          <CardDescription>
            We need your name on file to keep your account secure and compliant.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="firstName">First Name</Label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  id="firstName"
                  type="text"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  className="pl-10"
                  required
                  disabled={completeProfileMutation.isPending}
                  autoComplete="given-name"
                  autoFocus
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="lastName">Last Name</Label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  id="lastName"
                  type="text"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  className="pl-10"
                  required
                  disabled={completeProfileMutation.isPending}
                  autoComplete="family-name"
                />
              </div>
            </div>

            {error && (
              <div className="flex items-center gap-2 text-sm text-destructive bg-destructive/10 p-3 rounded-md">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <Button
              type="submit"
              className="w-full bg-gradient-ocean hover:opacity-90 transition-opacity"
              disabled={completeProfileMutation.isPending}
            >
              {completeProfileMutation.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                'Save and continue'
              )}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
