import { useNavigate } from 'react-router';
import { CakeLogo } from '../components/CakeLogo';
import { Button } from '../components/ui/button';

export function NotFoundPage() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="text-center">
        <div className="flex justify-center mb-6">
          <CakeLogo size={100} />
        </div>
        
        <h1 className="text-6xl font-bold text-foreground mb-4">404</h1>
        
        <h2 className="text-2xl font-semibold text-foreground mb-2">
          Oops! Page Not Found
        </h2>
        
        <p className="text-muted-foreground mb-8 max-w-md">
          The page you're looking for doesn't exist. It might have been removed, 
          or you may have mistyped the address.
        </p>
        
        <div className="flex gap-4 justify-center">
          <Button
            onClick={() => navigate(-1)}
            variant="outline"
            className="border-2 border-border"
          >
            Go Back
          </Button>
          
          <Button
            onClick={() => navigate('/feed')}
            className="bg-primary hover:bg-primary/90 text-primary-foreground border-2 border-border"
          >
            Go to Feed
          </Button>
        </div>
      </div>
    </div>
  );
}
