import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router";
import { toast } from "sonner";
import App from "../App";
import { FeedPage } from "../pages/FeedPage";
import { ProfilePage } from "../pages/ProfilePage";
import { SliceDetailPage } from "../pages/SliceDetailPage";
import { ProtectedRoute } from "../components/ProtectedRoute";
import * as api from "../lib/api";

jest.mock("../lib/api");
jest.mock("sonner", () => ({
  toast: {
    success: jest.fn(),
  },
  Toaster: () => null,
}));

const mockedApi = api as jest.Mocked<typeof api>;
const mockedToast = jest.mocked(toast);

const mockAuth = {
  user: {
    id: 1,
    username: "alice",
    email: "alice@example.com",
    bio: "hello",
    profile_picture_url: null,
  },
  login: jest.fn(),
  signup: jest.fn(),
  logout: jest.fn(),
  refreshUser: jest.fn(),
  updateProfile: jest.fn(),
  isLoading: false,
  updateLastActivity: jest.fn(),
};

jest.mock("../context/AuthContext", () => ({
  AuthProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  useAuth: () => mockAuth,
}));

describe("frontend integration flows", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockAuth.user = {
      id: 1,
      username: "alice",
      email: "alice@example.com",
      bio: "hello",
      profile_picture_url: null,
    };
    mockAuth.isLoading = false;
  });

  test("protected routes redirect unauthenticated users to login", async () => {
    mockAuth.user = null;

    render(
      <MemoryRouter initialEntries={["/feed"]}>
        <Routes>
          <Route
            path="/feed"
            element={
              <ProtectedRoute>
                <div>private feed</div>
              </ProtectedRoute>
            }
          />
          <Route path="/login" element={<div>login page</div>} />
        </Routes>
      </MemoryRouter>
    );

    expect(await screen.findByText("login page")).toBeInTheDocument();
  });

  test("app redirects unauthenticated unknown routes to login", async () => {
    mockAuth.user = null;
    window.history.pushState({}, "", "/does-not-exist");

    render(<App />);

    expect(await screen.findByRole("button", { name: /log in/i })).toBeInTheDocument();
  });

  test("app redirects authenticated users away from login to feed", async () => {
    mockedApi.getForYouFeed.mockResolvedValue([]);
    mockedApi.getFollowingFeed.mockResolvedValue([]);
    window.history.pushState({}, "", "/login");

    render(<App />);

    expect(await screen.findByText("Refresh Feed")).toBeInTheDocument();
  });

  test("app shows 404 only after authentication", async () => {
    mockedApi.getForYouFeed.mockResolvedValue([]);
    mockedApi.getFollowingFeed.mockResolvedValue([]);
    window.history.pushState({}, "", "/missing-after-login");

    render(<App />);

    expect(await screen.findByText("Oops! Page Not Found")).toBeInTheDocument();
  });

  test("posting from the feed refreshes it and shows the new post first", async () => {
    let forYouFeed = [
      {
        id: 1,
        user_id: 1,
        content: "Older post",
        created_at: "2026-03-10T10:00:00.000Z",
        username: "alice",
        profile_picture_url: null,
        like_count: 0,
        liked_by_me: false,
        retweet_count: 0,
        retweeted_by_me: false,
        reply_count: 0,
      },
    ];

    mockedApi.getForYouFeed.mockImplementation(async () => forYouFeed);
    mockedApi.getFollowingFeed.mockResolvedValue([]);
    mockedApi.createPost.mockImplementation(async (content: string) => {
      const createdPost = {
        id: 2,
        user_id: 1,
        content,
        created_at: "2026-03-10T11:00:00.000Z",
        username: "alice",
        profile_picture_url: null,
        like_count: 0,
        liked_by_me: false,
        retweet_count: 0,
        retweeted_by_me: false,
        reply_count: 0,
      };
      forYouFeed = [createdPost, ...forYouFeed];
      return createdPost;
    });

    const user = userEvent.setup();

    render(
      <MemoryRouter initialEntries={["/feed"]}>
        <Routes>
          <Route path="/feed" element={<FeedPage />} />
          <Route path="/profile/:username" element={<div>profile page</div>} />
          <Route path="/slice/:id" element={<div>slice page</div>} />
        </Routes>
      </MemoryRouter>
    );

    expect(await screen.findByText("Older post")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Post Slice" }));
    const dialog = await screen.findByRole("dialog");
    await user.type(within(dialog).getByPlaceholderText("What's on your mind?"), "Newest post");
    await user.click(within(dialog).getByRole("button", { name: "Post Slice" }));

    const newestPost = await screen.findByText("Newest post");
    const olderPost = await screen.findByText("Older post");

    expect(mockedApi.createPost).toHaveBeenCalledWith("Newest post");
    expect(
      newestPost.compareDocumentPosition(olderPost) & Node.DOCUMENT_POSITION_FOLLOWING
    ).toBeTruthy();
  });

  test("own post can be deleted from the feed", async () => {
    let forYouFeed = [
      {
        id: 10,
        user_id: 1,
        content: "My deletable post",
        created_at: "2026-03-10T10:00:00.000Z",
        username: "alice",
        profile_picture_url: null,
        like_count: 0,
        liked_by_me: false,
        retweet_count: 0,
        retweeted_by_me: false,
        reply_count: 0,
      },
    ];

    mockedApi.getForYouFeed.mockImplementation(async () => forYouFeed);
    mockedApi.getFollowingFeed.mockResolvedValue([]);
    mockedApi.deletePost.mockImplementation(async (postId: number) => {
      forYouFeed = forYouFeed.filter((post) => post.id !== postId);
    });

    const user = userEvent.setup();

    render(
      <MemoryRouter initialEntries={["/feed"]}>
        <Routes>
          <Route path="/feed" element={<FeedPage />} />
          <Route path="/profile/:username" element={<div>profile page</div>} />
          <Route path="/slice/:id" element={<div>slice page</div>} />
        </Routes>
      </MemoryRouter>
    );

    expect(await screen.findByText("My deletable post")).toBeInTheDocument();

    await user.click(screen.getByLabelText("Delete post"));
    await user.click(await screen.findByRole("button", { name: /^delete$/i }));

    await waitFor(() => {
      expect(mockedApi.deletePost).toHaveBeenCalledWith(10);
      expect(screen.queryByText("My deletable post")).not.toBeInTheDocument();
    });
  });

  test("clicking a tweet author navigates to that user's profile", async () => {
    mockedApi.getForYouFeed.mockResolvedValue([
      {
        id: 21,
        user_id: 2,
        content: "Bob's post",
        created_at: "2026-03-10T09:00:00.000Z",
        username: "bob",
        profile_picture_url: null,
        like_count: 0,
        liked_by_me: false,
        retweet_count: 0,
        retweeted_by_me: false,
        reply_count: 0,
      },
    ]);
    mockedApi.getFollowingFeed.mockResolvedValue([]);

    const user = userEvent.setup();

    render(
      <MemoryRouter initialEntries={["/feed"]}>
        <Routes>
          <Route path="/feed" element={<FeedPage />} />
          <Route path="/profile/:username" element={<div>bob profile page</div>} />
          <Route path="/slice/:id" element={<div>slice page</div>} />
        </Routes>
      </MemoryRouter>
    );

    await user.click(await screen.findByRole("button", { name: "@bob" }));

    expect(await screen.findByText("bob profile page")).toBeInTheDocument();
  });

  test("feed reload removes blocked users after a refresh event", async () => {
    let blocked = false;
    mockedApi.getForYouFeed.mockImplementation(async () =>
      blocked
        ? []
        : [
            {
              id: 40,
              user_id: 2,
              content: "Blocked user's post",
              created_at: "2026-03-10T09:30:00.000Z",
              username: "blocked_user",
              profile_picture_url: null,
              like_count: 0,
              liked_by_me: false,
              retweet_count: 0,
              retweeted_by_me: false,
              reply_count: 0,
            },
          ]
    );
    mockedApi.getFollowingFeed.mockResolvedValue([]);

    render(
      <MemoryRouter initialEntries={["/feed"]}>
        <Routes>
          <Route path="/feed" element={<FeedPage />} />
          <Route path="/profile/:username" element={<div>profile page</div>} />
          <Route path="/slice/:id" element={<div>slice page</div>} />
        </Routes>
      </MemoryRouter>
    );

    expect(await screen.findByText("Blocked user's post")).toBeInTheDocument();

    blocked = true;
    window.dispatchEvent(new Event("feed:refresh"));

    await waitFor(() => {
      expect(screen.queryByText("Blocked user's post")).not.toBeInTheDocument();
    });
  });

  test("own profile can be updated from the frontend and reflects new values", async () => {
    mockedApi.getUserByUsername.mockImplementation(async (username: string) => ({
      id: 1,
      username,
      bio: username === "alice_new" ? "updated bio" : "hello",
      profile_picture_url: null,
      follower_count: 2,
      following_count: 3,
      is_following: false,
      is_blocked: false,
    }));
    mockedApi.getUserPosts.mockResolvedValue([]);
    mockAuth.updateProfile.mockResolvedValue({
      success: true,
      user: {
        id: 1,
        username: "alice_new",
        email: "alice@example.com",
        bio: "updated bio",
        profile_picture_url: null,
      },
    });

    const user = userEvent.setup();

    render(
      <MemoryRouter initialEntries={["/profile/alice"]}>
        <Routes>
          <Route path="/profile/:username" element={<ProfilePage />} />
          <Route path="/404" element={<div>not found</div>} />
        </Routes>
      </MemoryRouter>
    );

    expect(await screen.findByText("@alice")).toBeInTheDocument();

    await user.clear(screen.getByLabelText("Username"));
    await user.type(screen.getByLabelText("Username"), "alice_new");
    await user.clear(screen.getByLabelText("Bio"));
    await user.type(screen.getByLabelText("Bio"), "updated bio");
    await user.click(screen.getByRole("button", { name: "Save Profile" }));

    await waitFor(() => {
      expect(mockAuth.updateProfile).toHaveBeenCalledWith({
        username: "alice_new",
        bio: "updated bio",
      });
      expect(screen.getByText("@alice_new")).toBeInTheDocument();
      expect(mockedToast.success).toHaveBeenCalledWith("Profile saved!");
    });
  });

  test("profile page supports follow, unfollow, block, unblock, and logout", async () => {
    mockedApi.getUserByUsername.mockResolvedValue({
      id: 2,
      username: "bob",
      bio: "bob bio",
      profile_picture_url: null,
      follower_count: 4,
      following_count: 1,
      is_following: false,
      is_blocked: false,
    });
    mockedApi.getUserPosts.mockResolvedValue([]);

    const user = userEvent.setup();

    const { unmount } = render(
      <MemoryRouter initialEntries={["/profile/bob", "/profile/alice", "/login"]} initialIndex={0}>
        <Routes>
          <Route path="/profile/:username" element={<ProfilePage />} />
          <Route path="/login" element={<div>login page</div>} />
          <Route path="/404" element={<div>not found</div>} />
        </Routes>
      </MemoryRouter>
    );

    await user.click(await screen.findByRole("button", { name: /follow/i }));
    expect(mockedApi.followUser).toHaveBeenCalledWith(2);
    expect(await screen.findByRole("button", { name: /unfollow/i })).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /unfollow/i }));
    expect(mockedApi.unfollowUser).toHaveBeenCalledWith(2);
    expect(await screen.findByRole("button", { name: /^follow$/i })).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /block/i }));
    expect(mockedApi.blockUser).toHaveBeenCalledWith(2);
    expect(await screen.findByRole("button", { name: /unblock/i })).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /unblock/i }));
    expect(mockedApi.unblockUser).toHaveBeenCalledWith(2);
    unmount();

    mockedApi.getUserByUsername.mockResolvedValueOnce({
      id: 1,
      username: "alice",
      bio: "hello",
      profile_picture_url: null,
      follower_count: 1,
      following_count: 2,
      is_following: false,
      is_blocked: false,
    });

    render(
      <MemoryRouter initialEntries={["/profile/alice", "/login"]} initialIndex={0}>
        <Routes>
          <Route path="/profile/:username" element={<ProfilePage />} />
          <Route path="/login" element={<div>login page</div>} />
          <Route path="/404" element={<div>not found</div>} />
        </Routes>
      </MemoryRouter>
    );

    await user.click(await screen.findByRole("button", { name: /logout/i }));
    await user.click(await screen.findByRole("button", { name: /^logout$/i }));

    await waitFor(() => {
      expect(mockAuth.logout).toHaveBeenCalled();
      expect(screen.getByText("login page")).toBeInTheDocument();
    });
  });

  test("replying to a tweet creates and shows the comment", async () => {
    mockedApi.getPost.mockResolvedValue({
      id: 77,
      user_id: 2,
      content: "Original post",
      created_at: "2026-03-10T08:00:00.000Z",
      username: "bob",
      profile_picture_url: null,
      like_count: 2,
      liked_by_me: false,
      retweet_count: 1,
      retweeted_by_me: false,
    });
    mockedApi.getReplies.mockResolvedValue([]);
    mockedApi.createReply.mockResolvedValue({
      id: 501,
      user_id: 1,
      parent_post_id: 77,
      content: "My new reply",
      created_at: "2026-03-10T08:05:00.000Z",
      username: "alice",
      profile_picture_url: null,
    });

    const user = userEvent.setup();

    render(
      <MemoryRouter initialEntries={["/slice/77"]}>
        <Routes>
          <Route path="/slice/:id" element={<SliceDetailPage />} />
          <Route path="/profile/:username" element={<div>profile page</div>} />
          <Route path="/feed" element={<div>feed page</div>} />
          <Route path="/404" element={<div>not found</div>} />
        </Routes>
      </MemoryRouter>
    );

    expect(await screen.findByText("Original post")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /0/i }));
    const dialog = await screen.findByRole("dialog");
    await user.type(within(dialog).getByPlaceholderText("Write your reply..."), "My new reply");
    await user.click(within(dialog).getByRole("button", { name: "Reply" }));

    expect(mockedApi.createReply).toHaveBeenCalledWith(77, "My new reply");
    expect(await screen.findByText("My new reply")).toBeInTheDocument();
  });

  test("own post can be deleted from the detail page", async () => {
    mockedApi.getPost.mockResolvedValue({
      id: 88,
      user_id: 1,
      content: "Delete me from detail",
      created_at: "2026-03-10T08:00:00.000Z",
      username: "alice",
      profile_picture_url: null,
      like_count: 0,
      liked_by_me: false,
      retweet_count: 0,
      retweeted_by_me: false,
    });
    mockedApi.getReplies.mockResolvedValue([]);
    mockedApi.deletePost.mockResolvedValue();

    const user = userEvent.setup();

    render(
      <MemoryRouter initialEntries={["/slice/88"]}>
        <Routes>
          <Route path="/slice/:id" element={<SliceDetailPage />} />
          <Route path="/profile/:username" element={<div>profile page</div>} />
          <Route path="/feed" element={<div>feed page</div>} />
          <Route path="/404" element={<div>not found</div>} />
        </Routes>
      </MemoryRouter>
    );

    expect(await screen.findByText("Delete me from detail")).toBeInTheDocument();

    await user.click(screen.getByLabelText("Delete post"));
    await user.click(await screen.findByRole("button", { name: /^delete$/i }));

    await waitFor(() => {
      expect(mockedApi.deletePost).toHaveBeenCalledWith(88);
      expect(screen.getByText("feed page")).toBeInTheDocument();
    });
  });
});
