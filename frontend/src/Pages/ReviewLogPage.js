// ReviewLogPage.jsx - FIXED
import API_URL from '../utils/api';
import axios from "axios";
import { useParams } from "react-router-dom";
import "./SupervisorDashboard.css";

export default function ReviewLogPage() {
  const { id } = useParams();

  const reviewLog = async (status) => {
    try {
      await axios.put(`${API_URL}/logs/${id}/review/`, { status });
      alert(`Log ${status}`);
    } catch (err) {
      console.log(err);
      alert("Failed to review log");
    }
  };

  return (
    <div>
      <h2>Review Log</h2>
      <button onClick={() => reviewLog("approved")}>Approve</button>
      <button onClick={() => reviewLog("rejected")}>Reject</button>
    </div>
  );
}