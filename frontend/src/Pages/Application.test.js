import { render, screen, fireEvent } from "@testing-library/react";
import Applications from "./Applications";

const mockApplications = [
  {
    id: 1,
    student_name: "Alice Johnson",
    company_name: "Tech Solutions",
    start_date: "2024-06-01",
    end_date: "2024-12-01",
  },
  {
    id: 2,
    student_name: "Bob Smith",
    company_name: "Creative Labs",
    start_date: "2024-07-15",
    end_date: "2025-01-15",
  },
];

describe("Applications Component", () => {
  const mockOnAssign = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  test("renders 'No pending applications' message when list is empty", () => {
    render(<Applications pendingApplications={[]} onAssign={mockOnAssign} />);
    
    expect(screen.getByText(/No pending placement applications/i)).toBeInTheDocument();
    expect(screen.queryByRole("table")).not.toBeInTheDocument();
  });

  test("renders a table with application data when provided", () => {
    render(<Applications pendingApplications={mockApplications} onAssign={mockOnAssign} />);

    expect(screen.getByText("Pending Applications")).toBeInTheDocument();
    
    // Check if student names are in the document
    expect(screen.getByText("Alice Johnson")).toBeInTheDocument();
    expect(screen.getByText("Bob Smith")).toBeInTheDocument();
    
    // Check if companies are in the document
    expect(screen.getByText("Tech Solutions")).toBeInTheDocument();
    expect(screen.getByText("Creative Labs")).toBeInTheDocument();
  });

  test("calls onAssign with the correct application data when button is clicked", () => {
    render(<Applications pendingApplications={mockApplications} onAssign={mockOnAssign} />);

    // Get all 'Assign Supervisor' buttons
    const assignButtons = screen.getAllByRole("button", { name: /Assign Supervisor/i });

    // Click the first button (for Alice)
    fireEvent.click(assignButtons[0]);

    // Verify the function was called once
    expect(mockOnAssign).toHaveBeenCalledTimes(1);
    
    // Verify it was called with Alice's specific object
    expect(mockOnAssign).toHaveBeenCalledWith(mockApplications[0]);
  });

  test("renders the correct number of rows", () => {
    render(<Applications pendingApplications={mockApplications} onAssign={mockOnAssign} />);
    
    // 1 header row + 2 data rows = 3 rows total
    const rows = screen.getAllByRole("row");
    expect(rows).toHaveLength(mockApplications.length + 1);
  });
});