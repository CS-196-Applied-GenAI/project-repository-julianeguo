export interface User {
  id: number;
  username: string;
  email?: string;
  bio: string | null;
  profile_picture_url: string | null;
}

export interface ProfileUser {
  id: number;
  username: string;
  bio: string | null;
  profile_picture_url: string | null;
  follower_count: number;
  following_count: number;
  is_following: boolean;
}

export interface Post {
  id: number;
  user_id: number;
  content: string;
  created_at: string;
  username?: string;
  profile_picture_url?: string | null;
  like_count: number;
  liked_by_me: boolean;
  retweet_count: number;
  retweeted_by_me: boolean;
  reply_count?: number;
}

export interface Reply {
  id: number;
  user_id: number;
  parent_post_id: number;
  content: string;
  created_at: string;
  username: string;
  profile_picture_url: string | null;
}

export interface FollowingFeedItemPost {
  type: "post";
  post: Post;
  author: {
    id: number;
    username: string;
    profile_picture_url: string | null;
  };
}

export interface FollowingFeedItemRetweet {
  type: "retweet";
  retweeter: {
    id: number;
    username: string;
    profile_picture_url: string | null;
  };
  post: Post;
  author: {
    id: number;
    username: string;
    profile_picture_url: string | null;
  };
}

export type FollowingFeedItem = FollowingFeedItemPost | FollowingFeedItemRetweet;

const apiBaseFromGlobal =
  typeof globalThis !== "undefined" &&
  "__VITE_API_BASE__" in globalThis &&
  typeof (globalThis as Record<string, unknown>).__VITE_API_BASE__ === "string"
    ? ((globalThis as Record<string, unknown>).__VITE_API_BASE__ as string)
    : undefined;

const processMaybe = (globalThis as Record<string, unknown>).process as
  | { env?: Record<string, string | undefined> }
  | undefined;

const apiBaseFromProcess =
  processMaybe && processMaybe.env && typeof processMaybe.env.VITE_API_BASE === "string"
    ? processMaybe.env.VITE_API_BASE
    : undefined;

const apiBaseFromImportMeta =
  typeof import.meta !== "undefined" &&
  (import.meta as ImportMeta & { env?: Record<string, string | undefined> }).env &&
  typeof (import.meta as ImportMeta & { env?: Record<string, string | undefined> }).env
    ?.VITE_API_BASE === "string"
    ? (import.meta as ImportMeta & { env?: Record<string, string | undefined> }).env
        ?.VITE_API_BASE
    : undefined;

const API_BASE = apiBaseFromGlobal ?? apiBaseFromImportMeta ?? apiBaseFromProcess;

const withBase = (path: string) => `${API_BASE ?? ""}${path}`;

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(withBase(path), {
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers ?? {})
    },
    ...init
  });

  const contentType = response.headers.get("content-type") ?? "";
  const body = contentType.includes("application/json") ? await response.json() : null;

  if (!response.ok) {
    const message =
      (body && typeof body.message === "string" && body.message) || "Request failed.";
    throw new Error(message);
  }

  return body as T;
}

export function getAssetUrl(path: string | null | undefined): string | null {
  if (!path) return null;
  if (path.startsWith("http://") || path.startsWith("https://")) {
    return path;
  }
  return withBase(path);
}

export async function login(username: string, password: string): Promise<void> {
  await request("/api/auth/login", {
    method: "POST",
    body: JSON.stringify({ username, password })
  });
}

export async function signup(username: string, email: string, password: string): Promise<void> {
  await request("/api/auth/signup", {
    method: "POST",
    body: JSON.stringify({ username, email, password })
  });
}

export async function me(): Promise<User> {
  return request<User>("/api/auth/me");
}

export async function logout(): Promise<void> {
  await request("/api/auth/logout", { method: "POST" });
}

export async function forgotPassword(email: string): Promise<{ message: string }> {
  return request<{ message: string }>("/api/auth/forgot-password", {
    method: "POST",
    body: JSON.stringify({ email })
  });
}

export async function resetPassword(token: string, newPassword: string): Promise<void> {
  await request("/api/auth/reset-password", {
    method: "POST",
    body: JSON.stringify({ token, newPassword })
  });
}

export async function getForYouFeed(): Promise<Post[]> {
  return request<Post[]>("/api/feed/for-you");
}

export async function getFollowingFeed(): Promise<FollowingFeedItem[]> {
  return request<FollowingFeedItem[]>("/api/feed/following");
}

export async function createPost(content: string): Promise<Post> {
  return request<Post>("/api/posts", {
    method: "POST",
    body: JSON.stringify({ content })
  });
}

export async function getPost(postId: number): Promise<Post & { username: string; profile_picture_url: string | null }> {
  return request(`/api/posts/${postId}`);
}

export async function likePost(postId: number): Promise<void> {
  await request(`/api/posts/${postId}/like`, { method: "POST" });
}

export async function unlikePost(postId: number): Promise<void> {
  await request(`/api/posts/${postId}/like`, { method: "DELETE" });
}

export async function retweetPost(postId: number): Promise<void> {
  await request(`/api/posts/${postId}/retweet`, { method: "POST" });
}

export async function unretweetPost(postId: number): Promise<void> {
  await request(`/api/posts/${postId}/retweet`, { method: "DELETE" });
}

export async function getReplies(postId: number): Promise<Reply[]> {
  return request<Reply[]>(`/api/posts/${postId}/replies`);
}

export async function createReply(postId: number, content: string): Promise<Reply> {
  return request<Reply>(`/api/posts/${postId}/replies`, {
    method: "POST",
    body: JSON.stringify({ content })
  });
}

export async function deleteReply(replyId: number): Promise<void> {
  await request(`/api/replies/${replyId}`, { method: "DELETE" });
}

export async function getUserByUsername(username: string): Promise<ProfileUser> {
  return request<ProfileUser>(`/api/users/by-username/${encodeURIComponent(username)}`);
}

export async function getUserById(id: number): Promise<ProfileUser> {
  return request<ProfileUser>(`/api/users/${id}`);
}

export async function getUserPosts(id: number): Promise<Post[]> {
  return request<Post[]>(`/api/users/${id}/posts`);
}

export async function followUser(id: number): Promise<void> {
  await request(`/api/users/${id}/follow`, { method: "POST" });
}

export async function unfollowUser(id: number): Promise<void> {
  await request(`/api/users/${id}/follow`, { method: "DELETE" });
}

export async function blockUser(id: number): Promise<void> {
  await request(`/api/users/${id}/block`, { method: "POST" });
}

export async function unblockUser(id: number): Promise<void> {
  await request(`/api/users/${id}/block`, { method: "DELETE" });
}
