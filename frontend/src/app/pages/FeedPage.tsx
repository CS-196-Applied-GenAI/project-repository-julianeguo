import { useState, useEffect, useRef, useCallback } from 'react';
import { RefreshCw } from 'lucide-react';
import { Navigation } from '../components/Navigation';
import { SliceCard, SliceView } from '../components/SliceCard';
import { PostSliceModal } from '../components/PostSliceModal';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { Button } from '../components/ui/button';
import { createPost, getFollowingFeed, getForYouFeed } from '../lib/api';

interface FeedCardItem {
  slice: SliceView;
  showRepostedBy?: { username: string } | null;
}

export function FeedPage() {
  const [postModalOpen, setPostModalOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('for-you');
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [forYouItems, setForYouItems] = useState<FeedCardItem[]>([]);
  const [followingItems, setFollowingItems] = useState<FeedCardItem[]>([]);
  const [pullStartY, setPullStartY] = useState(0);
  const [pullDistance, setPullDistance] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);

  const loadFeed = useCallback(async () => {
    const [forYou, following] = await Promise.all([getForYouFeed(), getFollowingFeed()]);
    setForYouItems(
      forYou.map((post) => ({
        slice: {
          ...post,
          reply_count: post.reply_count ?? 0,
          username: post.username ?? 'unknown',
          profile_picture_url: post.profile_picture_url ?? null,
        },
      }))
    );
    setFollowingItems(
      following.map((item) => {
        if (item.type === 'retweet') {
          return {
            slice: {
              ...item.post,
              reply_count: item.post.reply_count ?? 0,
              username: item.author.username,
              profile_picture_url: item.author.profile_picture_url,
            },
            showRepostedBy: { username: item.retweeter.username },
          };
        }
        return {
          slice: {
            ...item.post,
            reply_count: item.post.reply_count ?? 0,
            username: item.author.username,
            profile_picture_url: item.author.profile_picture_url,
          },
        };
      })
    );
  }, []);

  useEffect(() => {
    void loadFeed();
  }, [loadFeed]);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      await loadFeed();
    } finally {
      setIsRefreshing(false);
      setPullDistance(0);
    }
  };

  useEffect(() => {
    const handleTouchStart = (e: TouchEvent) => {
      if (window.scrollY === 0) {
        setPullStartY(e.touches[0].clientY);
      }
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (pullStartY === 0 || window.scrollY > 0) return;
      const currentY = e.touches[0].clientY;
      const distance = currentY - pullStartY;
      if (distance > 0 && distance < 100) {
        setPullDistance(distance);
      }
    };

    const handleTouchEnd = () => {
      if (pullDistance > 60) {
        void handleRefresh();
      } else {
        setPullDistance(0);
      }
      setPullStartY(0);
    };

    window.addEventListener('touchstart', handleTouchStart);
    window.addEventListener('touchmove', handleTouchMove);
    window.addEventListener('touchend', handleTouchEnd);

    return () => {
      window.removeEventListener('touchstart', handleTouchStart);
      window.removeEventListener('touchmove', handleTouchMove);
      window.removeEventListener('touchend', handleTouchEnd);
    };
  }, [pullStartY, pullDistance]);

  const handlePost = async (content: string) => {
    await createPost(content);
    await loadFeed();
  };

  return (
    <div className="min-h-screen bg-background" ref={containerRef}>
      <Navigation onPostClick={() => setPostModalOpen(true)} />

      {pullDistance > 0 && (
        <div
          className="fixed top-16 left-1/2 transform -translate-x-1/2 z-40 transition-opacity"
          style={{ opacity: pullDistance / 60 }}
        >
          <RefreshCw
            size={32}
            className={`text-primary ${pullDistance > 60 ? 'animate-spin' : ''}`}
          />
        </div>
      )}

      <div className="max-w-2xl mx-auto pt-20">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="w-full grid grid-cols-2 bg-card border-b-2 border-border rounded-none h-auto">
            <TabsTrigger
              value="for-you"
              className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground py-4 rounded-none border-b-4 border-transparent data-[state=active]:border-primary"
            >
              For You
            </TabsTrigger>
            <TabsTrigger
              value="following"
              className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground py-4 rounded-none border-b-4 border-transparent data-[state=active]:border-primary"
            >
              Following
            </TabsTrigger>
          </TabsList>

          <TabsContent value="for-you" className="mt-0">
            <div className="space-y-0">
              {forYouItems.map((item) => (
                <SliceCard key={item.slice.id} slice={item.slice} />
              ))}
            </div>
          </TabsContent>

          <TabsContent value="following" className="mt-0">
            <div className="space-y-0">
              {followingItems.length > 0 ? (
                followingItems.map((item, index) => (
                  <SliceCard
                    key={`${item.slice.id}-${index}`}
                    slice={item.slice}
                    showRepostedBy={item.showRepostedBy}
                  />
                ))
              ) : (
                <div className="p-8 text-center border-2 border-border bg-card">
                  <p className="text-muted-foreground">
                    Follow some users to see their slices here!
                  </p>
                </div>
              )}
            </div>
          </TabsContent>
        </Tabs>

        <div className="py-8 flex justify-center">
          <Button
            onClick={() => void handleRefresh()}
            disabled={isRefreshing}
            className="bg-primary hover:bg-primary/90 text-primary-foreground border-2 border-border"
          >
            <RefreshCw size={20} className={`mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
            Refresh Feed
          </Button>
        </div>
      </div>

      <PostSliceModal open={postModalOpen} onClose={() => setPostModalOpen(false)} onPost={handlePost} />
    </div>
  );
}
