import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router";
import { LoginPage } from "../pages/LoginPage";

const mockNavigate = jest.fn();
const mockLogin = jest.fn();
const mockSignup = jest.fn();

jest.mock("react-router", () => {
  const actual = jest.requireActual("react-router");
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

jest.mock("../context/AuthContext", () => ({
  useAuth: () => ({
    login: mockLogin,
    signup: mockSignup,
  }),
}));

describe("LoginPage", () => {
  beforeEach(() => {
    mockNavigate.mockReset();
    mockLogin.mockReset();
    mockSignup.mockReset();
  });

  test("submits login and navigates to feed on success", async () => {
    mockLogin.mockResolvedValue({ success: true });
    render(
      <MemoryRouter>
        <LoginPage />
      </MemoryRouter>
    );

    await userEvent.type(screen.getByLabelText(/username/i), "baker_bella");
    await userEvent.type(screen.getByLabelText(/password/i), "Password123!");
    await userEvent.click(screen.getByRole("button", { name: /log in/i }));

    expect(mockLogin).toHaveBeenCalledWith("baker_bella", "Password123!");
    expect(mockNavigate).toHaveBeenCalledWith("/feed");
  });
});
