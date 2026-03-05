import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router';
import { CakeLogo } from './CakeLogo';
import { useAuth } from '../context/AuthContext';
import { Button } from './ui/button';
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar';
import { getAssetUrl } from '../lib/api';

export function Navigation({ onPostClick }: { onPostClick: () => void }) {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [isVisible, setIsVisible] = useState(true);
  const [lastScrollY, setLastScrollY] = useState(0);

  useEffect(() => {
    const handleScroll = () => {
      const currentScrollY = window.scrollY;
      
      if (currentScrollY < lastScrollY || currentScrollY < 50) {
        // Scrolling up or at top
        setIsVisible(true);
      } else if (currentScrollY > lastScrollY && currentScrollY > 50) {
        // Scrolling down
        setIsVisible(false);
      }
      
      setLastScrollY(currentScrollY);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    
    return () => window.removeEventListener('scroll', handleScroll);
  }, [lastScrollY]);

  if (!user) return null;

  return (
    <nav
      className={`fixed top-0 left-0 right-0 z-50 bg-card border-b-2 border-border transition-transform duration-300 ${
        isVisible ? 'translate-y-0' : '-translate-y-full'
      }`}
    >
      <div className="max-w-4xl mx-auto px-4 py-3 flex items-center justify-between">
        {/* Logo - Left */}
        <button
          onClick={() => navigate('/feed')}
          className="flex items-center gap-2 hover:opacity-80 transition-opacity"
        >
          <CakeLogo size={40} />
          <span className="font-bold text-xl text-foreground logo-text">
            piece of cake
          </span>
        </button>

        {/* Profile Avatar - Center */}
        <button
          onClick={() => navigate(`/profile/${user.username}`)}
          className="hover:opacity-80 transition-opacity"
        >
          <Avatar className="w-10 h-10 border-2 border-border">
            <AvatarImage src={getAssetUrl(user.profile_picture_url) ?? undefined} />
            <AvatarFallback className="bg-primary text-primary-foreground">
              {user.username.charAt(0).toUpperCase()}
            </AvatarFallback>
          </Avatar>
        </button>

        {/* Post Button - Right */}
        <Button
          onClick={onPostClick}
          className="bg-primary hover:bg-primary/90 text-primary-foreground border-2 border-border"
        >
          Post Slice
        </Button>
      </div>
    </nav>
  );
}
