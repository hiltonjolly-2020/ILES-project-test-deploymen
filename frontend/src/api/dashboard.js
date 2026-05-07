const API_URL = "http://localhost:8000/api"; // adjust if deployed

export const fetchDashboard = async function (token) {
  try {
    const response = await fetch(`${API_URL}/dashboard/`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      throw new Error("Failed to fetch dashboard data");
    }

    return response.json();
  } catch (error) {
    console.error("Error fetching dashboard data:", error);
    throw error;
  }
};