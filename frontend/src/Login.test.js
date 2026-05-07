import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import axios from "axios";
import Login from "./Login";

// In Jest, we use jest.mock instead of vi.mock
jest.mock("axios");

describe("Login Component", () => {
  beforeEach(() => {
    // Clear mocks and storage before each test
    jest.clearAllMocks();
    
    // Mock window.location.href
    delete window.location;
    window.location = { href: "" };
    
    localStorage.clear();
  });

  it("updates input values on change", () => {
    render(<Login />);
    const usernameInput = screen.getByPlaceholderText(/username/i);
    const passwordInput = screen.getByPlaceholderText(/password/i);

    fireEvent.change(usernameInput, { target: { value: "testuser", name: "username" } });
    fireEvent.change(passwordInput, { target: { value: "password123", name: "password" } });

    expect(usernameInput.value).toBe("testuser");
    expect(passwordInput.value).toBe("password123");
  });

  it("successfully logs in and redirects student", async () => {
    axios.post.mockResolvedValueOnce({
      data: { access: "mock_access", refresh: "mock_refresh" },
    });

    axios.get.mockResolvedValueOnce({
      data: { user: { role: "student" } },
    });

    render(<Login />);

    fireEvent.change(screen.getByPlaceholderText(/username/i), { target: { value: "user1", name: "username" } });
    fireEvent.change(screen.getByPlaceholderText(/password/i), { target: { value: "pass", name: "password" } });
    fireEvent.click(screen.getByRole("button", { name: /login/i }));

    await waitFor(() => {
      expect(localStorage.getItem("access")).toBe("mock_access");
      expect(window.location.href).toBe("/student");
    });
  });

  it("displays an error message on failed login", async () => {
    axios.post.mockRejectedValueOnce(new Error("Unauthorized"));

    render(<Login />);
    fireEvent.click(screen.getByRole("button", { name: /login/i }));

    const errorMessage = await screen.findByText(/invalid username or password/i);
    expect(errorMessage).toBeInTheDocument();
  });
});