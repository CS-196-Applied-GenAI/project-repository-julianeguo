import { ChangeEvent, useEffect, useRef, useState } from 'react';
import { useParams, useNavigate } from 'react-router';
import { LogOut, UserPlus, UserMinus, Ban, Shield, Upload } from 'lucide-react';
import { Navigation } from '../components/Navigation';
import { SliceCard, SliceView } from '../components/SliceCard';
import { PostSliceModal } from '../components/PostSliceModal';
import { Button } from '../components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '../components/ui/avatar';
import { Input } from '../components/ui/input';
import { Textarea } from '../components/ui/textarea';
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
  createPost,
  followUser,
  getAssetUrl,
  getUserByUsername,
  getUserPosts,
  ProfileUser,
  unblockUser,
  unfollowUser,
} from '../lib/api';
import { useAuth } from '../context/AuthContext';
import { toast } from 'sonner';

const MAX_AVATAR_FILE_SIZE_BYTES = 2 * 1024 * 1024;
const ALLOWED_AVATAR_MIME_TYPES = new Set(['image/jpeg', 'image/png']);

export function ProfilePage() {
  const { username } = useParams<{ username: string }>();
  const navigate = useNavigate();
  const { user: currentUser, logout, updateProfile, uploadAvatar } = useAuth();
  const [postModalOpen, setPostModalOpen] = useState(false);
  const [logoutDialogOpen, setLogoutDialogOpen] = useState(false);
  const [profileUser, setProfileUser] = useState<ProfileUser | null>(null);
  const [isBlocked, setIsBlocked] = useState(false);
  const [userSlices, setUserSlices] = useState<SliceView[]>([]);
  const [editUsername, setEditUsername] = useState('');
  const [editBio, setEditBio] = useState('');
  const [editError, setEditError] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [selectedAvatarFile, setSelectedAvatarFile] = useState<File | null>(null);
  const [selectedAvatarName, setSelectedAvatarName] = useState('');
  const [selectedAvatarPreviewUrl, setSelectedAvatarPreviewUrl] = useState<string | null>(null);
  const [avatarError, setAvatarError] = useState('');
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  const avatarInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (!username) return;
    const load = async () => {
      try {
        const profile = await getUserByUsername(username);
        setProfileUser(profile);
        setIsBlocked(Boolean(profile.is_blocked));
        setEditUsername(profile.username);
        setEditBio(profile.bio ?? '');
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

  useEffect(() => {
    return () => {
      if (selectedAvatarPreviewUrl) {
        URL.revokeObjectURL(selectedAvatarPreviewUrl);
      }
    };
  }, [selectedAvatarPreviewUrl]);

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
      window.dispatchEvent(new Event('feed:refresh'));
      setProfileUser((prev) =>
        prev
          ? { ...prev, is_following: false, follower_count: Math.max(0, prev.follower_count - 1) }
          : prev
      );
      return;
    }

    await followUser(profileUser.id);
    window.dispatchEvent(new Event('feed:refresh'));
    setProfileUser((prev) =>
      prev ? { ...prev, is_following: true, follower_count: prev.follower_count + 1 } : prev
    );
  };

  const handleBlock = async () => {
    if (isBlocked) {
      await unblockUser(profileUser.id);
      window.dispatchEvent(new Event('feed:refresh'));
      setIsBlocked(false);
      return;
    }

    await blockUser(profileUser.id);
    window.dispatchEvent(new Event('feed:refresh'));
    setIsBlocked(true);
    setProfileUser((prev) =>
      prev
        ? { ...prev, is_following: false, follower_count: Math.max(0, prev.follower_count - 1) }
        : prev
    );
  };

  const handleProfileSave = async () => {
    setEditError('');
    setIsSaving(true);

    try {
      const result = await updateProfile({
        username: editUsername,
        bio: editBio
      });

      if (!result.success || !result.user) {
        setEditError(result.message || 'Profile update failed.');
        return;
      }

      setProfileUser((prev) =>
        prev
          ? {
              ...prev,
              username: result.user.username,
              bio: result.user.bio ?? null,
              profile_picture_url: result.user.profile_picture_url ?? null
            }
          : prev
      );

      if (username !== result.user.username) {
        navigate(`/profile/${result.user.username}`, { replace: true });
      }
      window.dispatchEvent(new Event('feed:refresh'));
      toast.success('Profile saved!');
    } finally {
      setIsSaving(false);
    }
  };

  const handleAvatarSelection = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0] ?? null;
    setAvatarError('');

    if (selectedAvatarPreviewUrl) {
      URL.revokeObjectURL(selectedAvatarPreviewUrl);
      setSelectedAvatarPreviewUrl(null);
    }

    if (!file) {
      setSelectedAvatarFile(null);
      setSelectedAvatarName('');
      return;
    }

    if (!ALLOWED_AVATAR_MIME_TYPES.has(file.type)) {
      setSelectedAvatarFile(null);
      setSelectedAvatarName('');
      setAvatarError('Profile pictures must be JPEG or PNG files.');
      event.target.value = '';
      return;
    }

    if (file.size > MAX_AVATAR_FILE_SIZE_BYTES) {
      setSelectedAvatarFile(null);
      setSelectedAvatarName('');
      setAvatarError('Profile pictures must be 2MB or smaller.');
      event.target.value = '';
      return;
    }

    setSelectedAvatarFile(file);
    setSelectedAvatarName(file.name);
    setSelectedAvatarPreviewUrl(URL.createObjectURL(file));
  };

  const handleAvatarUpload = async () => {
    if (!selectedAvatarFile) {
      setAvatarError('Select a JPEG or PNG image to upload.');
      return;
    }

    setAvatarError('');
    setIsUploadingAvatar(true);

    try {
      const result = await uploadAvatar(selectedAvatarFile);

      if (!result.success || !result.user) {
        const message = result.message || 'Avatar upload failed.';
        setAvatarError(message);
        toast.error(message);
        return;
      }

      setProfileUser((prev) =>
        prev
          ? {
              ...prev,
              profile_picture_url: result.user.profile_picture_url ?? null
            }
          : prev
      );
      setUserSlices((prev) =>
        prev.map((slice) => ({
          ...slice,
          profile_picture_url: result.user?.profile_picture_url ?? null
        }))
      );
      setSelectedAvatarFile(null);
      setSelectedAvatarName('');
      if (selectedAvatarPreviewUrl) {
        URL.revokeObjectURL(selectedAvatarPreviewUrl);
        setSelectedAvatarPreviewUrl(null);
      }
      if (avatarInputRef.current) {
        avatarInputRef.current.value = '';
      }
      window.dispatchEvent(new Event('feed:refresh'));
      toast.success('Profile picture updated!');
    } finally {
      setIsUploadingAvatar(false);
    }
  };

  const handleCreatePost = async (content: string) => {
    await createPost(content);
    window.dispatchEvent(new Event('feed:refresh'));
    navigate('/feed');
  };

  const handleDeletePost = (postId: number) => {
    setUserSlices((prev) => prev.filter((slice) => slice.id !== postId));
    window.dispatchEvent(new Event('feed:refresh'));
  };

  return (
    <div className="min-h-screen bg-background">
      <Navigation onPostClick={() => setPostModalOpen(true)} />

      <div className="max-w-2xl mx-auto pt-20">
        <div className="bg-card border-2 border-border p-6">
          <div className="flex items-start justify-between mb-4">
            <div className="flex items-start gap-4">
              <Avatar className="w-20 h-20 border-2 border-border">
                <AvatarImage
                  src={selectedAvatarPreviewUrl ?? getAssetUrl(profileUser.profile_picture_url) ?? undefined}
                />
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

          {isOwnProfile ? (
            <div className="mt-6 space-y-4">
              <div>
                <label htmlFor="profile-avatar" className="text-sm font-medium text-foreground">
                  Profile picture
                </label>
                <div className="mt-2 flex flex-col gap-3 sm:flex-row sm:items-center">
                  <Input
                    ref={avatarInputRef}
                    id="profile-avatar"
                    type="file"
                    accept="image/png,image/jpeg"
                    onChange={handleAvatarSelection}
                    className="border-2 border-border bg-input-background file:mr-4 file:border-0 file:bg-transparent file:text-sm file:font-medium"
                  />
                  <Button
                    type="button"
                    onClick={() => void handleAvatarUpload()}
                    disabled={isUploadingAvatar}
                    variant="outline"
                    className="border-2 border-border"
                  >
                    <Upload size={16} className="mr-2" />
                    Upload Picture
                  </Button>
                </div>
                <p className="mt-2 text-sm text-muted-foreground">
                  JPEG or PNG only, up to 2MB.
                </p>
                {selectedAvatarName ? (
                  <p className="mt-2 text-sm text-muted-foreground">{selectedAvatarName}</p>
                ) : null}
                {avatarError ? <p className="mt-2 text-sm text-destructive">{avatarError}</p> : null}
              </div>

              <div>
                <label htmlFor="profile-username" className="text-sm font-medium text-foreground">
                  Username
                </label>
                <Input
                  id="profile-username"
                  value={editUsername}
                  onChange={(event) => setEditUsername(event.target.value)}
                  className="mt-2 border-2 border-border bg-input-background"
                />
              </div>

              <div>
                <label htmlFor="profile-bio" className="text-sm font-medium text-foreground">
                  Bio
                </label>
                <Textarea
                  id="profile-bio"
                  value={editBio}
                  onChange={(event) => setEditBio(event.target.value)}
                  className="mt-2 border-2 border-border bg-input-background"
                />
              </div>

              {editError ? <p className="text-sm text-destructive">{editError}</p> : null}

              <Button
                onClick={() => void handleProfileSave()}
                disabled={isSaving}
                className="bg-primary text-primary-foreground border-2 border-border hover:bg-primary/90"
              >
                Save Profile
              </Button>
            </div>
          ) : (
            profileUser.bio && <p className="text-foreground mt-4">{profileUser.bio}</p>
          )}
        </div>

        <div className="mt-0">
          {userSlices.length > 0 ? (
            userSlices.map((slice) => (
              <SliceCard key={slice.id} slice={slice} onDelete={handleDeletePost} />
            ))
          ) : (
            <div className="p-8 text-center border-2 border-border bg-card">
              <p className="text-muted-foreground">No slices yet</p>
            </div>
          )}
        </div>
      </div>

      <PostSliceModal
        open={postModalOpen}
        onClose={() => setPostModalOpen(false)}
        onPost={handleCreatePost}
      />

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
