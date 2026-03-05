import {
  getRepliesForSlice,
  getSlicesByUserId,
  getUserById,
  mockReplies,
  mockSlices,
  mockUsers,
} from "../data/mockData";

describe("mockData helpers", () => {
  test("getUserById returns the matching user", () => {
    const first = mockUsers[0];
    expect(getUserById(first.id)).toEqual(first);
  });

  test("getUserById returns undefined for unknown id", () => {
    expect(getUserById(999999)).toBeUndefined();
  });

  test("getSlicesByUserId returns slices for only that user", () => {
    const userId = mockUsers[0].id;
    const slices = getSlicesByUserId(userId);
    expect(slices.length).toBeGreaterThan(0);
    expect(slices.every((slice) => slice.user_id === userId)).toBe(true);
  });

  test("getSlicesByUserId returns empty list for unknown user", () => {
    expect(getSlicesByUserId(999999)).toEqual([]);
  });

  test("getRepliesForSlice returns replies for existing slice", () => {
    const existingSliceId = Number(Object.keys(mockReplies)[0]);
    const replies = getRepliesForSlice(existingSliceId);
    expect(replies).toEqual(mockReplies[existingSliceId]);
  });

  test("getRepliesForSlice returns empty array for missing slice", () => {
    expect(getRepliesForSlice(999999)).toEqual([]);
  });

  test("mock arrays are populated", () => {
    expect(mockUsers.length).toBeGreaterThan(0);
    expect(mockSlices.length).toBeGreaterThan(0);
  });
});
