import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router';
import { Heart, MessageCircle, Repeat2, Trash2 } from 'lucide-react';
import { Navigation } from '../components/Navigation';
import { PostSliceModal } from '../components/PostSliceModal';
import { Avatar, AvatarFallback, AvatarImage } from '../components/ui/avatar';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '../components/ui/alert-dialog';
import {
  createReply,
  deleteReply,
  getAssetUrl,
  getPost,
  getReplies,
  likePost,
  Reply,
  retweetPost,
  unlikePost,
  unretweetPost,
} from '../lib/api';
import { useAuth } from '../context/AuthContext';

type DetailPost = Awaited<ReturnType<typeof getPost>>;

export function SliceDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user: currentUser } = useAuth();
  const [postModalOpen, setPostModalOpen] = useState(false);
  const [replyModalOpen, setReplyModalOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleteReplyId, setDeleteReplyId] = useState<number | null>(null);
  const [slice, setSlice] = useState<DetailPost | null>(null);
  const [replies, setReplies] = useState<Reply[]>([]);

  useEffect(() => {
    const postId = Number(id);
    if (!Number.isInteger(postId) || postId <= 0) {
      navigate('/404');
      return;
    }

    const load = async () => {
      try {
        const [postData, repliesData] = await Promise.all([getPost(postId), getReplies(postId)]);
        setSlice(postData);
        setReplies(repliesData);
      } catch {
        navigate('/404');
      }
    };
    void load();
  }, [id, navigate]);

  if (!slice) {
    return null;
  }

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

  const handleLike = async () => {
    const nextLiked = !slice.liked_by_me;
    setSlice((prev) =>
      prev
        ? {
            ...prev,
            liked_by_me: nextLiked,
            like_count: Math.max(0, prev.like_count + (nextLiked ? 1 : -1)),
          }
        : prev
    );
    try {
      if (nextLiked) {
        await likePost(slice.id);
      } else {
        await unlikePost(slice.id);
      }
    } catch {
      setSlice((prev) =>
        prev
          ? {
              ...prev,
              liked_by_me: !nextLiked,
              like_count: Math.max(0, prev.like_count + (nextLiked ? -1 : 1)),
            }
          : prev
      );
    }
  };

  const handleRetweet = async () => {
    const nextRetweeted = !slice.retweeted_by_me;
    setSlice((prev) =>
      prev
        ? {
            ...prev,
            retweeted_by_me: nextRetweeted,
            retweet_count: Math.max(0, prev.retweet_count + (nextRetweeted ? 1 : -1)),
          }
        : prev
    );
    try {
      if (nextRetweeted) {
        await retweetPost(slice.id);
      } else {
        await unretweetPost(slice.id);
      }
    } catch {
      setSlice((prev) =>
        prev
          ? {
              ...prev,
              retweeted_by_me: !nextRetweeted,
              retweet_count: Math.max(0, prev.retweet_count + (nextRetweeted ? -1 : 1)),
            }
          : prev
      );
    }
  };

  const handleReply = async (content: string) => {
    const createdReply = await createReply(slice.id, content);
    setReplies((prev) => [...prev, createdReply]);
  };

  const handleDeleteReply = (replyId: number) => {
    setDeleteReplyId(replyId);
    setDeleteDialogOpen(true);
  };

  const confirmDeleteReply = async () => {
    if (deleteReplyId) {
      await deleteReply(deleteReplyId);
      setReplies((prev) => prev.filter((reply) => reply.id !== deleteReplyId));
      setDeleteReplyId(null);
    }
    setDeleteDialogOpen(false);
  };

  return (
    <div className="min-h-screen bg-background">
      <Navigation onPostClick={() => setPostModalOpen(true)} />

      <div className="max-w-2xl mx-auto pt-20">
        <div className="bg-card border-2 border-border p-6">
          <div className="flex items-start gap-3 mb-4">
            <button onClick={() => navigate(`/profile/${slice.username}`)}>
              <Avatar className="w-12 h-12 border-2 border-border">
                <AvatarImage src={getAssetUrl(slice.profile_picture_url) ?? undefined} />
                <AvatarFallback className="bg-primary text-primary-foreground">
                  {slice.username.charAt(0).toUpperCase()}
                </AvatarFallback>
              </Avatar>
            </button>
            <div>
              <button onClick={() => navigate(`/profile/${slice.username}`)} className="hover:underline">
                <p className="font-semibold text-foreground">@{slice.username}</p>
              </button>
              <p className="text-sm text-muted-foreground">{formatTimestamp(slice.created_at)}</p>
            </div>
          </div>

          <p className="text-foreground mb-6 text-lg whitespace-pre-wrap">{slice.content}</p>

          <div className="flex items-center gap-6 pt-4 border-t-2 border-border">
            <button
              onClick={() => void handleLike()}
              className="flex items-center gap-2 group transition-colors"
              style={{ color: slice.liked_by_me ? '#f91880' : '#6b5744' }}
            >
              <Heart
                size={24}
                fill={slice.liked_by_me ? '#f91880' : 'none'}
                className="group-hover:scale-110 transition-transform"
              />
              <span>{slice.like_count}</span>
            </button>

            <button
              onClick={() => setReplyModalOpen(true)}
              className="flex items-center gap-2 group transition-colors"
              style={{ color: '#1da1f2' }}
            >
              <MessageCircle size={24} className="group-hover:scale-110 transition-transform" />
              <span style={{ color: '#6b5744' }}>{replies.length}</span>
            </button>

            <button
              onClick={() => void handleRetweet()}
              className="flex items-center gap-2 group transition-colors"
              style={{ color: slice.retweeted_by_me ? '#17bf63' : '#6b5744' }}
            >
              <Repeat2 size={24} className="group-hover:scale-110 transition-transform" />
              <span>{slice.retweet_count}</span>
            </button>
          </div>
        </div>

        <div className="mt-0">
          <div className="bg-card border-2 border-t-0 border-border p-4">
            <h2 className="font-semibold text-foreground mb-4">Replies ({replies.length})</h2>

            {replies.length > 0 ? (
              <div className="space-y-4">
                {replies.map((reply) => {
                  const isOwnReply = currentUser?.id === reply.user_id;
                  return (
                    <div key={reply.id} className="border-2 border-border bg-background p-4 rounded">
                      <div className="flex items-start gap-3 mb-2">
                        <button onClick={() => navigate(`/profile/${reply.username}`)}>
                          <Avatar className="w-10 h-10 border-2 border-border">
                            <AvatarImage src={getAssetUrl(reply.profile_picture_url) ?? undefined} />
                            <AvatarFallback className="bg-primary text-primary-foreground">
                              {reply.username.charAt(0).toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                        </button>
                        <div className="flex-1">
                          <div className="flex items-center justify-between">
                            <button onClick={() => navigate(`/profile/${reply.username}`)} className="hover:underline">
                              <p className="font-semibold text-foreground">@{reply.username}</p>
                            </button>
                            {isOwnReply && (
                              <button
                                onClick={() => handleDeleteReply(reply.id)}
                                className="text-destructive hover:text-destructive/80"
                              >
                                <Trash2 size={16} />
                              </button>
                            )}
                          </div>
                          <p className="text-sm text-muted-foreground">{formatTimestamp(reply.created_at)}</p>
                        </div>
                      </div>

                      <p className="text-foreground whitespace-pre-wrap">{reply.content}</p>
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="text-muted-foreground text-center py-8">No replies yet. Be the first to reply!</p>
            )}
          </div>
        </div>
      </div>

      <PostSliceModal open={postModalOpen} onClose={() => setPostModalOpen(false)} />

      <PostSliceModal
        open={replyModalOpen}
        onClose={() => setReplyModalOpen(false)}
        onPost={handleReply}
        replyToSliceId={slice.id}
        replyToUsername={slice.username}
      />

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent className="bg-card border-2 border-border">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this reply?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. The reply will be permanently deleted.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="border-2 border-border">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => void confirmDeleteReply()}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90 border-2 border-border"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
