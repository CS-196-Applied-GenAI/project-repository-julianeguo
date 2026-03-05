import { useState } from 'react';
import { useNavigate } from 'react-router';
import { CakeLogo } from '../components/CakeLogo';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { useAuth } from '../context/AuthContext';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';

export function LoginPage() {
  const navigate = useNavigate();
  const { login, signup } = useAuth();
  
  // Login state
  const [loginUsername, setLoginUsername] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [loginError, setLoginError] = useState('');
  
  // Signup state
  const [signupUsername, setSignupUsername] = useState('');
  const [signupEmail, setSignupEmail] = useState('');
  const [signupPassword, setSignupPassword] = useState('');
  const [signupError, setSignupError] = useState('');

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError('');
    
    const result = await login(loginUsername, loginPassword);
    
    if (result.success) {
      navigate('/feed');
    } else {
      setLoginError(result.message || 'Invalid username or password');
    }
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setSignupError('');
    
    // Validate username
    if (signupUsername.length < 3 || signupUsername.length > 20) {
      setSignupError('Username must be 3-20 characters');
      return;
    }
    
    if (!/^[a-zA-Z0-9_]+$/.test(signupUsername)) {
      setSignupError('Username can only contain letters, numbers, and underscores');
      return;
    }
    
    // Validate password
    const hasUpperCase = /[A-Z]/.test(signupPassword);
    const hasLowerCase = /[a-z]/.test(signupPassword);
    const hasNumber = /[0-9]/.test(signupPassword);
    const hasSymbol = /[!@#$%^&*(),.?":{}|<>]/.test(signupPassword);
    
    if (signupPassword.length < 8) {
      setSignupError('Password must be at least 8 characters');
      return;
    }
    
    if (!hasUpperCase || !hasLowerCase || !hasNumber || !hasSymbol) {
      setSignupError('Password must contain uppercase, lowercase, number, and symbol');
      return;
    }
    
    // Validate email
    if (!signupEmail.includes('@')) {
      setSignupError('Please enter a valid email');
      return;
    }
    
    const result = await signup(signupUsername, signupEmail, signupPassword);
    
    if (result.success) {
      navigate('/feed');
    } else {
      setSignupError(result.message || 'Username or email already exists');
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo and tagline */}
        <div className="text-center mb-8">
          <div className="flex justify-center mb-4">
            <CakeLogo size={120} />
          </div>
          <h1 className="text-4xl mb-2 logo-text">
            piece of cake
          </h1>
          <p className="text-muted-foreground">socializing is a piece of cake!</p>
        </div>

        {/* Auth tabs */}
        <div className="bg-card border-2 border-border p-6 rounded-lg">
          <Tabs defaultValue="login" className="w-full">
            <TabsList className="grid w-full grid-cols-2 mb-6 bg-secondary border-2 border-border">
              <TabsTrigger value="login" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
                Log In
              </TabsTrigger>
              <TabsTrigger value="signup" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
                Sign Up
              </TabsTrigger>
            </TabsList>

            {/* Login Form */}
            <TabsContent value="login">
              <form onSubmit={handleLogin} className="space-y-4">
                <div>
                  <Label htmlFor="login-username">Username</Label>
                  <Input
                    id="login-username"
                    type="text"
                    value={loginUsername}
                    onChange={(e) => setLoginUsername(e.target.value)}
                    className="border-2 border-border bg-input-background"
                    required
                  />
                </div>
                
                <div>
                  <Label htmlFor="login-password">Password</Label>
                  <Input
                    id="login-password"
                    type="password"
                    value={loginPassword}
                    onChange={(e) => setLoginPassword(e.target.value)}
                    className="border-2 border-border bg-input-background"
                    required
                  />
                </div>
                
                {loginError && (
                  <p className="text-sm text-destructive">{loginError}</p>
                )}
                
                <Button 
                  type="submit" 
                  className="w-full bg-primary hover:bg-primary/90 text-primary-foreground border-2 border-border"
                >
                  Log In
                </Button>
                
                <button
                  type="button"
                  onClick={() => navigate('/forgot-password')}
                  className="text-sm text-primary hover:underline w-full text-center"
                >
                  Forgot password?
                </button>
              </form>
            </TabsContent>

            {/* Signup Form */}
            <TabsContent value="signup">
              <form onSubmit={handleSignup} className="space-y-4">
                <div>
                  <Label htmlFor="signup-username">Username</Label>
                  <Input
                    id="signup-username"
                    type="text"
                    value={signupUsername}
                    onChange={(e) => setSignupUsername(e.target.value)}
                    placeholder="3-20 characters, letters, numbers, _"
                    className="border-2 border-border bg-input-background"
                    required
                  />
                </div>
                
                <div>
                  <Label htmlFor="signup-email">Email</Label>
                  <Input
                    id="signup-email"
                    type="email"
                    value={signupEmail}
                    onChange={(e) => setSignupEmail(e.target.value)}
                    className="border-2 border-border bg-input-background"
                    required
                  />
                </div>
                
                <div>
                  <Label htmlFor="signup-password">Password</Label>
                  <Input
                    id="signup-password"
                    type="password"
                    value={signupPassword}
                    onChange={(e) => setSignupPassword(e.target.value)}
                    placeholder="Min 8 chars, 1 upper, 1 lower, 1 number, 1 symbol"
                    className="border-2 border-border bg-input-background"
                    required
                  />
                </div>
                
                {signupError && (
                  <p className="text-sm text-destructive">{signupError}</p>
                )}
                
                <Button 
                  type="submit" 
                  className="w-full bg-primary hover:bg-primary/90 text-primary-foreground border-2 border-border"
                >
                  Sign Up
                </Button>
              </form>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
}
