import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router';
import { LogOut, UserPlus, UserMinus, Ban, Shield } from 'lucide-react';
import { Navigation } from '../components/Navigation';
import { SliceCard, SliceView } from '../components/SliceCard';
import { PostSliceModal } from '../components/PostSliceModal';
import { Button } from '../components/ui/button';
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
  blockUser,
  followUser,
  getAssetUrl,
  getUserByUsername,
  getUserPosts,
  ProfileUser,
  unblockUser,
  unfollowUser,
} from '../lib/api';
import { useAuth } from '../context/AuthContext';

export function ProfilePage() {
  const { username } = useParams<{ username: string }>();
  const navigate = useNavigate();
  const { user: currentUser, logout } = useAuth();
  const [postModalOpen, setPostModalOpen] = useState(false);
  const [logoutDialogOpen, setLogoutDialogOpen] = useState(false);
  const [profileUser, setProfileUser] = useState<ProfileUser | null>(null);
  const [isBlocked, setIsBlocked] = useState(false);
  const [userSlices, setUserSlices] = useState<SliceView[]>([]);

  useEffect(() => {
    if (!username) return;
    const load = async () => {
      try {
        const profile = await getUserByUsername(username);
        setProfileUser(profile);
        const posts = await getUserPosts(profile.id);
        setUserSlices(
          posts.map((post) => ({
            ...post,
            reply_count: post.reply_count ?? 0,
            username: profile.username,
            profile_picture_url: profile.profile_picture_url,
          }))
        );
      } catch {
        navigate('/404');
      }
    };
    void load();
  }, [navigate, username]);

  if (!profileUser) {
    return null;
  }

  const isOwnProfile = currentUser?.id === profileUser.id;

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const handleFollow = async () => {
    if (profileUser.is_following) {
      await unfollowUser(profileUser.id);
      setProfileUser((prev) =>
        prev
          ? { ...prev, is_following: false, follower_count: Math.max(0, prev.follower_count - 1) }
          : prev
      );
      return;
    }

    await followUser(profileUser.id);
    setProfileUser((prev) =>
      prev ? { ...prev, is_following: true, follower_count: prev.follower_count + 1 } : prev
    );
  };

  const handleBlock = async () => {
    if (isBlocked) {
      await unblockUser(profileUser.id);
      setIsBlocked(false);
      return;
    }

    await blockUser(profileUser.id);
    setIsBlocked(true);
    setProfileUser((prev) =>
      prev
        ? { ...prev, is_following: false, follower_count: Math.max(0, prev.follower_count - 1) }
        : prev
    );
  };

  return (
    <div className="min-h-screen bg-background">
      <Navigation onPostClick={() => setPostModalOpen(true)} />

      <div className="max-w-2xl mx-auto pt-20">
        <div className="bg-card border-2 border-border p-6">
          <div className="flex items-start justify-between mb-4">
            <div className="flex items-start gap-4">
              <Avatar className="w-20 h-20 border-2 border-border">
                <AvatarImage src={getAssetUrl(profileUser.profile_picture_url) ?? undefined} />
                <AvatarFallback className="bg-primary text-primary-foreground text-2xl">
                  {profileUser.username.charAt(0).toUpperCase()}
                </AvatarFallback>
              </Avatar>

              <div>
                <h1 className="text-2xl font-bold text-foreground">@{profileUser.username}</h1>
                <p className="text-muted-foreground mt-1">
                  {profileUser.follower_count} Followers · {profileUser.following_count} Following
                </p>
              </div>
            </div>

            <div className="flex gap-2">
              {isOwnProfile ? (
                <Button
                  onClick={() => setLogoutDialogOpen(true)}
                  variant="outline"
                  className="border-2 border-border hover:bg-destructive hover:text-destructive-foreground"
                >
                  <LogOut size={18} className="mr-2" />
                  Logout
                </Button>
              ) : (
                <>
                  <Button
                    onClick={() => void handleFollow()}
                    className={
                      profileUser.is_following
                        ? 'bg-secondary text-secondary-foreground border-2 border-border hover:bg-destructive hover:text-destructive-foreground'
                        : 'bg-primary text-primary-foreground border-2 border-border hover:bg-primary/90'
                    }
                  >
                    {profileUser.is_following ? (
                      <>
                        <UserMinus size={18} className="mr-2" />
                        Unfollow
                      </>
                    ) : (
                      <>
                        <UserPlus size={18} className="mr-2" />
                        Follow
                      </>
                    )}
                  </Button>

                  <Button
                    onClick={() => void handleBlock()}
                    variant="outline"
                    className={
                      isBlocked
                        ? 'border-2 border-border bg-destructive text-destructive-foreground hover:bg-destructive/90'
                        : 'border-2 border-border hover:bg-destructive hover:text-destructive-foreground'
                    }
                  >
                    {isBlocked ? (
                      <>
                        <Shield size={18} className="mr-2" />
                        Unblock
                      </>
                    ) : (
                      <>
                        <Ban size={18} className="mr-2" />
                        Block
                      </>
                    )}
                  </Button>
                </>
              )}
            </div>
          </div>

          {profileUser.bio && <p className="text-foreground mt-4">{profileUser.bio}</p>}
        </div>

        <div className="mt-0">
          {userSlices.length > 0 ? (
            userSlices.map((slice) => <SliceCard key={slice.id} slice={slice} />)
          ) : (
            <div className="p-8 text-center border-2 border-border bg-card">
              <p className="text-muted-foreground">No slices yet</p>
            </div>
          )}
        </div>
      </div>

      <PostSliceModal open={postModalOpen} onClose={() => setPostModalOpen(false)} />

      <AlertDialog open={logoutDialogOpen} onOpenChange={setLogoutDialogOpen}>
        <AlertDialogContent className="bg-card border-2 border-border">
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure you want to logout?</AlertDialogTitle>
            <AlertDialogDescription>
              You will be redirected to the login page.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="border-2 border-border">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => void handleLogout()}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90 border-2 border-border"
            >
              Logout
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
