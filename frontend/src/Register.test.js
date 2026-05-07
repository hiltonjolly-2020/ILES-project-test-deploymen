import { render, screen, fireEvent, waitFor, act } from "@testing-library/react";
import axios from "axios";
import Register from "./Register";

// Mock axios
jest.mock("axios");

const mockDepartments = [
  { id: 1, name: "Computer Science", code: "CS" },
  { id: 2, name: "Engineering", code: "ENG" },
];

const mockCompanies = [
  { id: 101, name: "Tech Corp", is_approved: true },
];

const renderComponent = async () => {
  await act(async () => {
    render(<Register />);
  });
};

describe("Register Component", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Default mocks for initialization fetches
    axios.get.mockImplementation((url) => {
      if (url.includes("/api/departments/")) return Promise.resolve({ data: mockDepartments });
      if (url.includes("/api/companies/")) return Promise.resolve({ data: mockCompanies });
      return Promise.reject(new Error("Unknown API"));
    });
  });

  test("renders basic registration fields without act warnings", async () => {
    await renderComponent();
    expect(screen.getByPlaceholderText(/Username/i)).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/Email/i)).toBeInTheDocument();
  });

  test("switches fields based on role selection", async () => {
    await renderComponent();

    // Use displayValue to target the specific 'Role' dropdown
    const roleSelect = screen.getByDisplayValue(/Student/i);
    
    await act(async () => {
      fireEvent.change(roleSelect, { target: { value: "academic" } });
    });

    await waitFor(() => {
      expect(screen.queryByPlaceholderText(/Student ID/i)).not.toBeInTheDocument();
      expect(screen.getByPlaceholderText(/Staff ID/i)).toBeInTheDocument();
    });
  });

  test("fetches and displays departments in the dropdown", async () => {
    await renderComponent();
    
    // Department dropdown is the second combobox; checking text is safer
    await waitFor(() => {
      expect(screen.getByText("Computer Science (CS)")).toBeInTheDocument();
    });
  });

  test("submits form successfully", async () => {
    axios.post.mockResolvedValueOnce({ data: { message: "Success" } });
    
    // Mock window.location for redirect
    const { location } = window;
    delete window.location;
    window.location = { ...location, href: "" };

    await renderComponent();

    fireEvent.change(screen.getByPlaceholderText(/Username/i), { target: { value: "testuser" } });
    fireEvent.change(screen.getByPlaceholderText(/Email/i), { target: { value: "test@test.com" } });
    fireEvent.change(screen.getByPlaceholderText(/Student ID/i), { target: { value: "12345" } });
    fireEvent.change(screen.getByPlaceholderText(/Password/i), { target: { value: "password123456" } });

    const submitBtn = screen.getByRole("button", { name: /Register/i });
    
    await act(async () => {
      fireEvent.click(submitBtn);
    });

    await waitFor(() => {
      expect(axios.post).toHaveBeenCalled();
      expect(screen.getByText(/Registration successful/i)).toBeInTheDocument();
    });

    window.location = location;
  });

  test("displays backend error messages on failure without multiple element error", async () => {
    const errorResponse = {
      response: {
        data: {
          username: ["This username is already taken."]
        }
      }
    };
    axios.post.mockRejectedValueOnce(errorResponse);

    await renderComponent();
    
    const submitBtn = screen.getByRole("button", { name: /Register/i });
    
    await act(async () => {
      fireEvent.click(submitBtn);
    });

    // findAllByText handles the case where the error appears twice in the UI
    const errorMessages = await screen.findAllByText("This username is already taken.");
    expect(errorMessages.length).toBeGreaterThan(0);
    expect(errorMessages[0]).toBeInTheDocument();
  });
});