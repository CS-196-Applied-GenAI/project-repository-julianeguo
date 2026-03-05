import { Heart, MessageCircle, Repeat2 } from 'lucide-react';
import { useNavigate } from 'react-router';
import { useEffect, useState } from 'react';
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar';
import { getAssetUrl, likePost, Post, retweetPost, unlikePost, unretweetPost } from '../lib/api';

export interface SliceView extends Post {
  username: string;
  profile_picture_url: string | null;
}

interface SliceCardProps {
  slice: SliceView;
  showRepostedBy?: { username: string } | null;
}

export function SliceCard({ slice, showRepostedBy }: SliceCardProps) {
  const navigate = useNavigate();
  const [liked, setLiked] = useState(slice.liked_by_me);
  const [likeCount, setLikeCount] = useState(slice.like_count);
  const [retweeted, setRetweeted] = useState(slice.retweeted_by_me);
  const [retweetCount, setRetweetCount] = useState(slice.retweet_count);

  useEffect(() => {
    setLiked(slice.liked_by_me);
    setLikeCount(slice.like_count);
    setRetweeted(slice.retweeted_by_me);
    setRetweetCount(slice.retweet_count);
  }, [slice]);

  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp);
    return date.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });
  };

  const handleLike = async (e: React.MouseEvent) => {
    e.stopPropagation();
    const nextLiked = !liked;
    setLiked(nextLiked);
    setLikeCount((prev) => Math.max(0, prev + (nextLiked ? 1 : -1)));
    try {
      if (nextLiked) {
        await likePost(slice.id);
      } else {
        await unlikePost(slice.id);
      }
    } catch {
      setLiked(!nextLiked);
      setLikeCount((prev) => Math.max(0, prev + (nextLiked ? -1 : 1)));
    }
  };

  const handleRetweet = async (e: React.MouseEvent) => {
    e.stopPropagation();
    const nextRetweeted = !retweeted;
    setRetweeted(nextRetweeted);
    setRetweetCount((prev) => Math.max(0, prev + (nextRetweeted ? 1 : -1)));
    try {
      if (nextRetweeted) {
        await retweetPost(slice.id);
      } else {
        await unretweetPost(slice.id);
      }
    } catch {
      setRetweeted(!nextRetweeted);
      setRetweetCount((prev) => Math.max(0, prev + (nextRetweeted ? -1 : 1)));
    }
  };

  const handleReply = (e: React.MouseEvent) => {
    e.stopPropagation();
    navigate(`/slice/${slice.id}`);
  };

  const handleCardClick = () => {
    navigate(`/slice/${slice.id}`);
  };

  const handleProfileClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    navigate(`/profile/${slice.username}`);
  };

  return (
    <div className="border-2 border-border bg-card">
      {showRepostedBy && (
        <div className="px-4 pt-2 flex items-center gap-2 text-sm" style={{ color: '#17bf63' }}>
          <Repeat2 size={16} />
          <span>{showRepostedBy.username} reposted</span>
        </div>
      )}

      <div
        onClick={handleCardClick}
        className="p-4 cursor-pointer hover:bg-accent/30 transition-colors"
      >
        <div className="flex items-start gap-3 mb-3">
          <button onClick={handleProfileClick}>
            <Avatar className="w-12 h-12 border-2 border-border">
              <AvatarImage src={getAssetUrl(slice.profile_picture_url) ?? undefined} />
              <AvatarFallback className="bg-primary text-primary-foreground">
                {slice.username.charAt(0).toUpperCase()}
              </AvatarFallback>
            </Avatar>
          </button>
          <div className="flex-1">
            <button onClick={handleProfileClick} className="hover:underline">
              <p className="font-semibold text-foreground">@{slice.username}</p>
            </button>
            <p className="text-sm text-muted-foreground">{formatTimestamp(slice.created_at)}</p>
          </div>
        </div>

        <p className="text-foreground mb-4 whitespace-pre-wrap">{slice.content}</p>

        <div className="flex items-center gap-6">
          <button
            onClick={handleLike}
            className="flex items-center gap-2 group transition-colors"
            style={{ color: liked ? '#f91880' : '#6b5744' }}
          >
            <Heart
              size={20}
              fill={liked ? '#f91880' : 'none'}
              className="group-hover:scale-110 transition-transform"
            />
            <span className="text-sm">{likeCount}</span>
          </button>

          <button
            onClick={handleReply}
            className="flex items-center gap-2 group transition-colors"
            style={{ color: '#1da1f2' }}
          >
            <MessageCircle size={20} className="group-hover:scale-110 transition-transform" />
            <span className="text-sm" style={{ color: '#6b5744' }}>
              {slice.reply_count ?? 0}
            </span>
          </button>

          <button
            onClick={handleRetweet}
            className="flex items-center gap-2 group transition-colors"
            style={{ color: retweeted ? '#17bf63' : '#6b5744' }}
          >
            <Repeat2 size={20} className="group-hover:scale-110 transition-transform" />
            <span className="text-sm">{retweetCount}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
