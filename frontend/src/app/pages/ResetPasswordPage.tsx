import { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router';
import { CakeLogo } from '../components/CakeLogo';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { resetPassword } from '../lib/api';

export function ResetPasswordPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');
  
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!token) {
      setError('Invalid or missing reset token');
      return;
    }

    // Validate password
    const hasUpperCase = /[A-Z]/.test(password);
    const hasLowerCase = /[a-z]/.test(password);
    const hasNumber = /[0-9]/.test(password);
    const hasSymbol = /[!@#$%^&*(),.?":{}|<>]/.test(password);

    if (password.length < 8) {
      setError('Password must be at least 8 characters');
      return;
    }

    if (!hasUpperCase || !hasLowerCase || !hasNumber || !hasSymbol) {
      setError('Password must contain uppercase, lowercase, number, and symbol');
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    try {
      await resetPassword(token, password);
      setSuccess(true);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Failed to reset password.');
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="flex justify-center mb-4">
            <CakeLogo size={80} />
          </div>
          <h1 className="text-3xl mb-2 logo-text">
            piece of cake
          </h1>
        </div>

        {/* Form */}
        <div className="bg-card border-2 border-border p-6 rounded-lg">
          {!success ? (
            <>
              <h2 className="text-xl font-semibold mb-4 text-foreground">
                Reset Your Password
              </h2>
              <p className="text-muted-foreground mb-6">
                Enter your new password below.
              </p>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <Label htmlFor="password">New Password</Label>
                  <Input
                    id="password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Min 8 chars, 1 upper, 1 lower, 1 number, 1 symbol"
                    className="border-2 border-border bg-input-background"
                    required
                  />
                </div>

                <div>
                  <Label htmlFor="confirm-password">Confirm Password</Label>
                  <Input
                    id="confirm-password"
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="border-2 border-border bg-input-background"
                    required
                  />
                </div>

                {error && <p className="text-sm text-destructive">{error}</p>}

                <Button
                  type="submit"
                  className="w-full bg-primary hover:bg-primary/90 text-primary-foreground border-2 border-border"
                >
                  Reset Password
                </Button>
              </form>
            </>
          ) : (
            <div className="text-center">
              <div className="mb-4 text-4xl">✅</div>
              <h2 className="text-xl font-semibold mb-2 text-foreground">
                Password Reset Successful
              </h2>
              <p className="text-muted-foreground mb-6">
                Your password has been successfully reset. You can now log in with your new password.
              </p>
              <Button
                onClick={() => navigate('/login')}
                className="w-full bg-primary hover:bg-primary/90 text-primary-foreground border-2 border-border"
              >
                Go to Login
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
