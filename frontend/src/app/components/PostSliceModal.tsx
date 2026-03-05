import { useState } from 'react';
import { X } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from './ui/dialog';
import { Textarea } from './ui/textarea';
import { Button } from './ui/button';
import { useAuth } from '../context/AuthContext';
import { Avatar, AvatarFallback } from './ui/avatar';

interface PostSliceModalProps {
  open: boolean;
  onClose: () => void;
  onPost?: (content: string) => void | Promise<void>;
  replyToSliceId?: number;
  replyToUsername?: string;
}

export function PostSliceModal({ 
  open, 
  onClose, 
  onPost,
  replyToSliceId,
  replyToUsername 
}: PostSliceModalProps) {
  const { user } = useAuth();
  const [content, setContent] = useState('');
  const [error, setError] = useState('');

  const maxChars = 280;
  const remainingChars = maxChars - content.length;
  const isInvalid = content.length === 0 || content.length > maxChars;

  const handlePost = async () => {
    if (content.length === 0) {
      setError('Please write 1-280 characters!');
      return;
    }
    
    if (content.length > maxChars) {
      setError('Please write 1-280 characters!');
      return;
    }

    if (onPost) {
      try {
        await onPost(content);
      } catch (postError) {
        setError(postError instanceof Error ? postError.message : 'Failed to post.');
        return;
      }
    }
    
    setContent('');
    setError('');
    onClose();
  };

  const handleClose = () => {
    setContent('');
    setError('');
    onClose();
  };

  if (!user) return null;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[600px] bg-card border-2 border-border">
        <DialogHeader>
          <DialogTitle className="text-foreground">
            {replyToSliceId ? `Reply to @${replyToUsername}` : 'Post a Slice'}
          </DialogTitle>
        </DialogHeader>
        
        <div className="flex gap-3">
          <Avatar className="w-12 h-12 border-2 border-border">
            <AvatarFallback className="bg-primary text-primary-foreground">
              {user.username.charAt(0).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          
          <div className="flex-1">
            <Textarea
              placeholder={replyToSliceId ? "Write your reply..." : "What's on your mind?"}
              value={content}
              onChange={(e) => {
                setContent(e.target.value);
                setError('');
              }}
              className="min-h-[120px] resize-none border-2 border-border bg-input-background text-foreground focus:ring-2 focus:ring-ring"
              autoFocus
            />
            
            <div className="mt-2 flex items-center justify-between">
              <span
                className={`text-sm ${
                  remainingChars < 0 
                    ? 'text-destructive font-semibold' 
                    : remainingChars < 20 
                    ? 'text-orange-600 font-semibold'
                    : 'text-muted-foreground'
                }`}
              >
                {content.length}/{maxChars}
              </span>
              
              <Button
                onClick={() => void handlePost()}
                disabled={isInvalid}
                className="bg-primary hover:bg-primary/90 text-primary-foreground border-2 border-border disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {replyToSliceId ? 'Reply' : 'Post Slice'}
              </Button>
            </div>
            
            {error && (
              <p className="text-sm text-destructive mt-2">{error}</p>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
