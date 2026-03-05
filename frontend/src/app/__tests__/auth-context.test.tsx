import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import React from "react";
import { AuthProvider, useAuth } from "../context/AuthContext";
import * as api from "../lib/api";

jest.mock("../lib/api");

const mockedApi = api as jest.Mocked<typeof api>;

function Harness() {
  const auth = useAuth();
  return (
    <div>
      <div data-testid="username">{auth.user?.username ?? "none"}</div>
      <button
        onClick={async () => {
          await auth.login("bella", "Password123!");
        }}
      >
        login
      </button>
      <button
        onClick={async () => {
          await auth.signup("new_user", "new@example.com", "Password123!");
        }}
      >
        signup
      </button>
      <button
        onClick={async () => {
          await auth.logout();
        }}
      >
        logout
      </button>
    </div>
  );
}

describe("AuthContext", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    localStorage.clear();
  });

  test("loads existing session via /api/auth/me", async () => {
    mockedApi.me.mockResolvedValue({
      id: 1,
      username: "baker_bella",
      bio: null,
      profile_picture_url: null,
    });

    render(
      <AuthProvider>
        <Harness />
      </AuthProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId("username")).toHaveTextContent("baker_bella");
    });
  });

  test("login updates context user", async () => {
    mockedApi.me.mockResolvedValue({
      id: 1,
      username: "bella",
      bio: null,
      profile_picture_url: null,
    });
    mockedApi.login.mockResolvedValue();

    render(
      <AuthProvider>
        <Harness />
      </AuthProvider>
    );

    await userEvent.click(screen.getByRole("button", { name: "login" }));

    await waitFor(() => {
      expect(mockedApi.login).toHaveBeenCalledWith("bella", "Password123!");
      expect(screen.getByTestId("username")).toHaveTextContent("bella");
    });
  });

  test("signup performs signup+login and updates user", async () => {
    mockedApi.me
      .mockResolvedValueOnce({
        id: 1,
        username: "existing",
        bio: null,
        profile_picture_url: null,
      })
      .mockResolvedValueOnce({
        id: 2,
        username: "new_user",
        bio: null,
        profile_picture_url: null,
      });
    mockedApi.signup.mockResolvedValue();
    mockedApi.login.mockResolvedValue();

    render(
      <AuthProvider>
        <Harness />
      </AuthProvider>
    );

    await userEvent.click(screen.getByRole("button", { name: "signup" }));

    await waitFor(() => {
      expect(mockedApi.signup).toHaveBeenCalledWith(
        "new_user",
        "new@example.com",
        "Password123!"
      );
      expect(mockedApi.login).toHaveBeenCalled();
      expect(screen.getByTestId("username")).toHaveTextContent("new_user");
    });
  });

  test("logout clears user and calls API", async () => {
    mockedApi.me.mockResolvedValue({
      id: 1,
      username: "bella",
      bio: null,
      profile_picture_url: null,
    });
    mockedApi.logout.mockResolvedValue();

    render(
      <AuthProvider>
        <Harness />
      </AuthProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId("username")).toHaveTextContent("bella");
    });

    await userEvent.click(screen.getByRole("button", { name: "logout" }));

    await waitFor(() => {
      expect(mockedApi.logout).toHaveBeenCalled();
      expect(screen.getByTestId("username")).toHaveTextContent("none");
    });
  });
});
