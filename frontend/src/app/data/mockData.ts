export interface User {
  id: number;
  username: string;
  email: string;
  bio: string;
  profile_picture_url: string | null;
  created_at: string;
}

export interface Slice {
  id: number;
  user_id: number;
  content: string;
  created_at: string;
  like_count: number;
  repost_count: number;
  reply_count: number;
  liked_by_me: boolean;
  reposted_by_me: boolean;
}

export interface Reply {
  id: number;
  slice_id: number;
  user_id: number;
  content: string;
  created_at: string;
  like_count: number;
  liked_by_me: boolean;
}

export const mockUsers: User[] = [
  {
    id: 1,
    username: "baker_bella",
    email: "bella@example.com",
    bio: "Professional pastry chef 🍰 | Sharing my daily baking adventures",
    profile_picture_url: null,
    created_at: "2024-01-15T10:00:00Z",
  },
  {
    id: 2,
    username: "chef_charlie",
    email: "charlie@example.com",
    bio: "Home cook | Experimenting with recipes | Coffee enthusiast ☕",
    profile_picture_url: null,
    created_at: "2024-02-01T14:30:00Z",
  },
  {
    id: 3,
    username: "foodie_finn",
    email: "finn@example.com",
    bio: "Food blogger | Restaurant reviews | Living my best life one bite at a time 🍕",
    profile_picture_url: null,
    created_at: "2024-01-20T09:15:00Z",
  },
  {
    id: 4,
    username: "sweet_sophia",
    email: "sophia@example.com",
    bio: "Dessert lover | Cake decorator | Making the world sweeter 🧁",
    profile_picture_url: null,
    created_at: "2024-02-10T16:45:00Z",
  },
  {
    id: 5,
    username: "kitchen_kai",
    email: "kai@example.com",
    bio: "Culinary student | Learning new techniques every day | Aspiring chef 👨‍🍳",
    profile_picture_url: null,
    created_at: "2024-01-25T11:20:00Z",
  },
];

export const mockSlices: Slice[] = [
  // baker_bella's slices
  {
    id: 1,
    user_id: 1,
    content: "Just finished baking a chocolate lava cake! The center came out perfectly gooey. Best dessert ever! 🍫",
    created_at: "2026-03-05T08:30:00Z",
    like_count: 24,
    repost_count: 5,
    reply_count: 3,
    liked_by_me: false,
    reposted_by_me: false,
  },
  {
    id: 2,
    user_id: 1,
    content: "Pro tip: Always room temperature butter for the fluffiest cakes. Game changer! 🧈",
    created_at: "2026-03-04T14:20:00Z",
    like_count: 42,
    repost_count: 12,
    reply_count: 7,
    liked_by_me: false,
    reposted_by_me: false,
  },
  {
    id: 3,
    user_id: 1,
    content: "Experimenting with matcha and white chocolate today. Fingers crossed! 🍵",
    created_at: "2026-03-03T10:15:00Z",
    like_count: 31,
    repost_count: 4,
    reply_count: 2,
    liked_by_me: false,
    reposted_by_me: false,
  },
  
  // chef_charlie's slices
  {
    id: 4,
    user_id: 2,
    content: "Made my first sourdough from scratch! It took 3 days but so worth it. The crust is perfect! 🥖",
    created_at: "2026-03-05T07:45:00Z",
    like_count: 56,
    repost_count: 8,
    reply_count: 12,
    liked_by_me: false,
    reposted_by_me: false,
  },
  {
    id: 5,
    user_id: 2,
    content: "Coffee pairing of the day: Ethiopian pour-over with blueberry scones. Heaven! ☕",
    created_at: "2026-03-04T09:30:00Z",
    like_count: 38,
    repost_count: 6,
    reply_count: 5,
    liked_by_me: false,
    reposted_by_me: false,
  },
  {
    id: 6,
    user_id: 2,
    content: "Anyone else think homemade pasta is easier than people make it out to be? Just needs practice! 🍝",
    created_at: "2026-03-02T16:00:00Z",
    like_count: 29,
    repost_count: 3,
    reply_count: 8,
    liked_by_me: false,
    reposted_by_me: false,
  },
  
  // foodie_finn's slices
  {
    id: 7,
    user_id: 3,
    content: "Tried that new Italian place downtown. The carbonara was AMAZING! Definitely going back 🍝✨",
    created_at: "2026-03-05T12:00:00Z",
    like_count: 67,
    repost_count: 15,
    reply_count: 9,
    liked_by_me: false,
    reposted_by_me: false,
  },
  {
    id: 8,
    user_id: 3,
    content: "Unpopular opinion: Pineapple DOES belong on pizza. Fight me. 🍍🍕",
    created_at: "2026-03-04T18:30:00Z",
    like_count: 103,
    repost_count: 24,
    reply_count: 45,
    liked_by_me: false,
    reposted_by_me: false,
  },
  {
    id: 9,
    user_id: 3,
    content: "Best tacos in the city are at that food truck on 5th Street. Trust me on this! 🌮",
    created_at: "2026-03-03T13:15:00Z",
    like_count: 44,
    repost_count: 11,
    reply_count: 6,
    liked_by_me: false,
    reposted_by_me: false,
  },
  
  // sweet_sophia's slices
  {
    id: 10,
    user_id: 4,
    content: "Spent 4 hours decorating this wedding cake. The floral design came out beautifully! 💐🎂",
    created_at: "2026-03-05T15:45:00Z",
    like_count: 89,
    repost_count: 18,
    reply_count: 14,
    liked_by_me: false,
    reposted_by_me: false,
  },
  {
    id: 11,
    user_id: 4,
    content: "Cupcake flavor of the week: Salted caramel with cream cheese frosting. Come try them! 🧁",
    created_at: "2026-03-04T11:00:00Z",
    like_count: 52,
    repost_count: 9,
    reply_count: 7,
    liked_by_me: false,
    reposted_by_me: false,
  },
  {
    id: 12,
    user_id: 4,
    content: "Pro decorator tip: Freeze your cake before frosting for cleaner edges! ❄️",
    created_at: "2026-03-03T14:30:00Z",
    like_count: 71,
    repost_count: 22,
    reply_count: 4,
    liked_by_me: false,
    reposted_by_me: false,
  },
  
  // kitchen_kai's slices
  {
    id: 13,
    user_id: 5,
    content: "Knife skills class today! Finally getting the hang of julienne cuts. Practice makes perfect! 🔪",
    created_at: "2026-03-05T10:20:00Z",
    like_count: 34,
    repost_count: 4,
    reply_count: 3,
    liked_by_me: false,
    reposted_by_me: false,
  },
  {
    id: 14,
    user_id: 5,
    content: "Made my first hollandaise sauce without it breaking! This is huge for me! 🎉",
    created_at: "2026-03-04T16:15:00Z",
    like_count: 41,
    repost_count: 5,
    reply_count: 8,
    liked_by_me: false,
    reposted_by_me: false,
  },
  {
    id: 15,
    user_id: 5,
    content: "Studying French cooking techniques. The precision required is incredible! So much to learn 📚👨‍🍳",
    created_at: "2026-03-02T12:00:00Z",
    like_count: 28,
    repost_count: 2,
    reply_count: 5,
    liked_by_me: false,
    reposted_by_me: false,
  },
];

// Mock replies for some slices
export const mockReplies: Record<number, Reply[]> = {
  1: [
    {
      id: 101,
      slice_id: 1,
      user_id: 3,
      content: "Looks delicious! Do you have the recipe?",
      created_at: "2026-03-05T09:00:00Z",
      like_count: 5,
      liked_by_me: false,
    },
    {
      id: 102,
      slice_id: 1,
      user_id: 4,
      content: "The secret is quality chocolate! 🍫",
      created_at: "2026-03-05T09:30:00Z",
      like_count: 3,
      liked_by_me: false,
    },
  ],
  8: [
    {
      id: 103,
      slice_id: 8,
      user_id: 2,
      content: "Absolutely not! This is culinary blasphemy! 😱",
      created_at: "2026-03-04T19:00:00Z",
      like_count: 12,
      liked_by_me: false,
    },
    {
      id: 104,
      slice_id: 8,
      user_id: 5,
      content: "Team pineapple all the way! 🍍",
      created_at: "2026-03-04T19:15:00Z",
      like_count: 8,
      liked_by_me: false,
    },
    {
      id: 105,
      slice_id: 8,
      user_id: 1,
      content: "Sweet and savory can work together, but this is too far lol",
      created_at: "2026-03-04T20:00:00Z",
      like_count: 6,
      liked_by_me: false,
    },
  ],
};

// Helper function to get user by id
export function getUserById(id: number): User | undefined {
  return mockUsers.find(user => user.id === id);
}

// Helper function to get slices by user id
export function getSlicesByUserId(userId: number): Slice[] {
  return mockSlices.filter(slice => slice.user_id === userId);
}

// Helper function to get replies for a slice
export function getRepliesForSlice(sliceId: number): Reply[] {
  return mockReplies[sliceId] || [];
}
