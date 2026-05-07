import { render, screen, fireEvent, waitFor, act } from "@testing-library/react";
import axios from "axios";
import StudentDashboard from "./StudentDashboard";
import API_URL from '../utils/api';
// Mock axios and sub-components
jest.mock("axios");
jest.mock("./StudentPlacement", () => () => <div data-testid="placement-comp">Placement Form</div>);
jest.mock("./StudentLogs", () => () => <div data-testid="logs-comp">Logs Form</div>);

const mockUser = {
  user: {
    first_name: "John",
    last_name: "Doe",
    student_id: "S12345",
    department_name: "Computer Science",
    email: "john@example.com"
  }
};

const mockDashboardData = {
  placement: {
    company_name: "Tech Solutions",
    status: "approved",
    start_date: "2024-01-01",
    end_date: "2024-06-01"
  },
  recent_logs: []
};

const mockCompanies = [
  { id: 1, name: "Google" },
  { id: 2, name: "Microsoft" }
];

describe("StudentDashboard Component", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    localStorage.setItem("access", "fake-token");

    // Mock initial data fetches
    axios.get.mockImplementation((url) => {
      if (url.includes("/users/me/")) return Promise.resolve({ data: mockUser });
      if (url.includes("/api/student/dashboard/")) return Promise.resolve({ data: mockDashboardData });
      if (url.includes("/api/companies/approved/")) return Promise.resolve({ data: mockCompanies });
      return Promise.reject(new Error("not found"));
    });
  });

  const renderDashboard = async () => {
    await act(async () => {
      render(<StudentDashboard />);
    });
  };

  test("renders loading state then displays student info", async () => {
    render(<StudentDashboard />);
    expect(screen.getByText(/Loading dashboard.../i)).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByText("John Doe")).toBeInTheDocument();
      expect(screen.getByText("S12345")).toBeInTheDocument();
      expect(screen.getByText("Computer Science")).toBeInTheDocument();
    });
  });

  test("displays placement information if it exists", async () => {
    await renderDashboard();

    await waitFor(() => {
      expect(screen.getByText(/Placement Information/i)).toBeInTheDocument();
      expect(screen.getByText("Tech Solutions")).toBeInTheDocument();
      expect(screen.getByText("approved")).toBeInTheDocument();
    });
  });

  test("switches between sidebar tabs", async () => {
    await renderDashboard();

    // Click Placement tab
    const placementBtn = screen.getByRole("button", { name: /Placement/i });
    fireEvent.click(placementBtn);
    expect(screen.getByTestId("placement-comp")).toBeInTheDocument();

    // Click Logs tab
    const logsBtn = screen.getByRole("button", { name: /Weekly Logs/i });
    fireEvent.click(logsBtn);
    expect(screen.getByTestId("logs-comp")).toBeInTheDocument();

    // Click Dashboard tab back
    const dashboardBtn = screen.getByRole("button", { name: /Dashboard/i });
    fireEvent.click(dashboardBtn);
    expect(screen.getByText("Student Dashboard")).toBeInTheDocument();
  });

  test("redirects to login if no token is found", async () => {
    localStorage.removeItem("access");
    // Mock window.location
    delete window.location;
    window.location = { href: "" };

    await renderDashboard();

    expect(window.location.href).toBe("/login");
  });

  test("logout clears localStorage and redirects", async () => {
    delete window.location;
    window.location = { href: "" };

    await renderDashboard();
    
    const logoutBtn = screen.getByRole("button", { name: /Logout/i });
    fireEvent.click(logoutBtn);

    expect(localStorage.getItem("access")).toBeNull();
    expect(window.location.href).toBe("/login");
  });

  test("handles application failure with alert", async () => {
    window.alert = jest.fn(); // Mock alert
    axios.post.mockRejectedValueOnce(new Error("Failed"));

    await renderDashboard();
    
   
  });
});