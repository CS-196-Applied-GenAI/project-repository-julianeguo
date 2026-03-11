import { useState } from 'react';
import { useNavigate } from 'react-router';
import { ArrowLeft } from 'lucide-react';
import { CakeLogo } from '../components/CakeLogo';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { forgotPassword } from '../lib/api';

export function ForgotPasswordPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!email.includes('@')) {
      setError('Please enter a valid email');
      return;
    }

    try {
      await forgotPassword(email);
      setSubmitted(true);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Request failed.');
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
          <button
            onClick={() => navigate('/login')}
            className="flex items-center gap-2 text-primary hover:underline mb-4"
          >
            <ArrowLeft size={20} />
            Back to login
          </button>

          {!submitted ? (
            <>
              <h2 className="text-xl font-semibold mb-4 text-foreground">
                Forgot Password?
              </h2>
              <p className="text-muted-foreground mb-6">
                Enter your email and we'll send you a link to reset your password.
              </p>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="border-2 border-border bg-input-background"
                    required
                  />
                </div>

                {error && <p className="text-sm text-destructive">{error}</p>}

                <Button
                  type="submit"
                  className="w-full bg-primary hover:bg-primary/90 text-primary-foreground border-2 border-border"
                >
                  Send Reset Link
                </Button>
              </form>
            </>
          ) : (
            <div className="text-center">
              <div className="mb-4 text-4xl">✉️</div>
              <h2 className="text-xl font-semibold mb-2 text-foreground">
                Check your email
              </h2>
              <p className="text-muted-foreground mb-6">
                If an account exists for {email}, we've sent a password reset link.
              </p>
              <Button
                onClick={() => navigate('/login')}
                className="w-full bg-primary hover:bg-primary/90 text-primary-foreground border-2 border-border"
              >
                Return to Login
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
