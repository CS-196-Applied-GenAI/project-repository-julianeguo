import {
  blockUser,
  createPost,
  createReply,
  deleteReply,
  followUser,
  forgotPassword,
  getAssetUrl,
  getFollowingFeed,
  getForYouFeed,
  getPost,
  getReplies,
  getUserById,
  getUserByUsername,
  getUserPosts,
  likePost,
  login,
  logout,
  me,
  resetPassword,
  retweetPost,
  signup,
  unblockUser,
  unfollowUser,
  unlikePost,
  unretweetPost,
} from "../lib/api";

function mockJsonResponse(body: unknown, ok = true, status = 200) {
  return {
    ok,
    status,
    headers: {
      get: (name: string) => (name.toLowerCase() === "content-type" ? "application/json" : null),
    },
    json: async () => body,
  } as Response;
}

describe("api.ts functions", () => {
  const fetchMock = jest.fn();

  beforeEach(() => {
    fetchMock.mockReset();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (global as any).fetch = fetchMock;
  });

  test("getAssetUrl handles null, absolute, and relative paths", () => {
    expect(getAssetUrl(null)).toBeNull();
    expect(getAssetUrl("https://example.com/a.png")).toBe("https://example.com/a.png");
    expect(getAssetUrl("/uploads/a.png")).toBe("/uploads/a.png");
  });

  test("auth API functions call expected endpoints", async () => {
    fetchMock.mockResolvedValue(mockJsonResponse({}));
    await login("u", "p");
    await signup("u", "u@example.com", "Password1!");
    fetchMock.mockResolvedValueOnce(mockJsonResponse({ id: 1, username: "u", bio: null, profile_picture_url: null }));
    await me();
    fetchMock.mockResolvedValueOnce(mockJsonResponse({}));
    await logout();
    fetchMock.mockResolvedValueOnce(mockJsonResponse({ message: "ok" }));
    await forgotPassword("u@example.com");
    fetchMock.mockResolvedValueOnce(mockJsonResponse({}));
    await resetPassword("token", "Password1!");

    expect(fetchMock).toHaveBeenNthCalledWith(
      1,
      "/api/auth/login",
      expect.objectContaining({ method: "POST", credentials: "include" })
    );
    expect(fetchMock).toHaveBeenNthCalledWith(
      2,
      "/api/auth/signup",
      expect.objectContaining({ method: "POST", credentials: "include" })
    );
    expect(fetchMock).toHaveBeenNthCalledWith(
      3,
      "/api/auth/me",
      expect.objectContaining({ credentials: "include" })
    );
    expect(fetchMock).toHaveBeenNthCalledWith(
      4,
      "/api/auth/logout",
      expect.objectContaining({ method: "POST", credentials: "include" })
    );
    expect(fetchMock).toHaveBeenNthCalledWith(
      5,
      "/api/auth/forgot-password",
      expect.objectContaining({ method: "POST", credentials: "include" })
    );
    expect(fetchMock).toHaveBeenNthCalledWith(
      6,
      "/api/auth/reset-password",
      expect.objectContaining({ method: "POST", credentials: "include" })
    );
  });

  test("feed/post/reply API functions call expected endpoints", async () => {
    fetchMock
      .mockResolvedValueOnce(mockJsonResponse([]))
      .mockResolvedValueOnce(mockJsonResponse([]))
      .mockResolvedValueOnce(mockJsonResponse({ id: 1 }))
      .mockResolvedValueOnce(mockJsonResponse({ id: 1 }))
      .mockResolvedValueOnce(mockJsonResponse({}))
      .mockResolvedValueOnce(mockJsonResponse({}))
      .mockResolvedValueOnce(mockJsonResponse({}))
      .mockResolvedValueOnce(mockJsonResponse({}))
      .mockResolvedValueOnce(mockJsonResponse([]))
      .mockResolvedValueOnce(mockJsonResponse({ id: 100 }));

    await getForYouFeed();
    await getFollowingFeed();
    await createPost("hello");
    await getPost(1);
    await likePost(1);
    await unlikePost(1);
    await retweetPost(1);
    await unretweetPost(1);
    await getReplies(1);
    await createReply(1, "reply");
    fetchMock.mockResolvedValueOnce(mockJsonResponse({}));
    await deleteReply(100);

    expect(fetchMock).toHaveBeenCalledWith("/api/feed/for-you", expect.any(Object));
    expect(fetchMock).toHaveBeenCalledWith("/api/feed/following", expect.any(Object));
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/posts",
      expect.objectContaining({ method: "POST" })
    );
    expect(fetchMock).toHaveBeenCalledWith("/api/posts/1", expect.any(Object));
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/posts/1/like",
      expect.objectContaining({ method: "POST" })
    );
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/posts/1/like",
      expect.objectContaining({ method: "DELETE" })
    );
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/posts/1/retweet",
      expect.objectContaining({ method: "POST" })
    );
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/posts/1/retweet",
      expect.objectContaining({ method: "DELETE" })
    );
    expect(fetchMock).toHaveBeenCalledWith("/api/posts/1/replies", expect.any(Object));
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/posts/1/replies",
      expect.objectContaining({ method: "POST" })
    );
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/replies/100",
      expect.objectContaining({ method: "DELETE" })
    );
  });

  test("user API functions call expected endpoints", async () => {
    fetchMock
      .mockResolvedValueOnce(mockJsonResponse({ id: 1 }))
      .mockResolvedValueOnce(mockJsonResponse({ id: 1 }))
      .mockResolvedValueOnce(mockJsonResponse([]))
      .mockResolvedValueOnce(mockJsonResponse({}))
      .mockResolvedValueOnce(mockJsonResponse({}))
      .mockResolvedValueOnce(mockJsonResponse({}))
      .mockResolvedValueOnce(mockJsonResponse({}));

    await getUserByUsername("alice");
    await getUserById(1);
    await getUserPosts(1);
    await followUser(2);
    await unfollowUser(2);
    await blockUser(2);
    await unblockUser(2);

    expect(fetchMock).toHaveBeenCalledWith("/api/users/by-username/alice", expect.any(Object));
    expect(fetchMock).toHaveBeenCalledWith("/api/users/1", expect.any(Object));
    expect(fetchMock).toHaveBeenCalledWith("/api/users/1/posts", expect.any(Object));
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/users/2/follow",
      expect.objectContaining({ method: "POST" })
    );
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/users/2/follow",
      expect.objectContaining({ method: "DELETE" })
    );
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/users/2/block",
      expect.objectContaining({ method: "POST" })
    );
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/users/2/block",
      expect.objectContaining({ method: "DELETE" })
    );
  });

  test("request throws API error message on non-OK response", async () => {
    fetchMock.mockResolvedValue(
      mockJsonResponse({ message: "Unauthorized" }, false, 401)
    );

    await expect(me()).rejects.toThrow("Unauthorized");
  });
});
