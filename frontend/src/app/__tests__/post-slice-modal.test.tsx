import { render, screen } from "@testing-library/react";
import { PostSliceModal } from "../components/PostSliceModal";

jest.mock("../context/AuthContext", () => ({
  useAuth: () => ({
    user: {
      id: 1,
      username: "alice",
      email: "alice@example.com",
      bio: "hello",
      profile_picture_url: "/uploads/profiles/alice.png",
    },
  }),
}));

jest.mock("../components/ui/avatar", () => ({
  Avatar: ({ children, className }: { children: React.ReactNode; className?: string }) => (
    <div className={className}>{children}</div>
  ),
  AvatarImage: ({ src, alt }: { src?: string; alt?: string }) =>
    src ? <img src={src} alt={alt} /> : null,
  AvatarFallback: ({ children }: { children: React.ReactNode }) => <span>{children}</span>,
}));

describe("PostSliceModal", () => {
  test("shows the current user's profile picture in the compose modal", () => {
    render(<PostSliceModal open onClose={() => {}} />);

    expect(screen.getByAltText("alice avatar")).toHaveAttribute(
      "src",
      "/uploads/profiles/alice.png"
    );
  });
});
