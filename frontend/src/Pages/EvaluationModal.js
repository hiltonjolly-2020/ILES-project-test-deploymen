// EvaluationModal.jsx
import { useState } from "react";
import axios from "axios";
import "./EvaluationModal.css";
import API_URL from '../utils/api';
export default function EvaluationModal({ student, role, onClose, onComplete }) {
  const [score, setScore] = useState("");
  const [comments, setComments] = useState("");
  const [loading, setLoading] = useState(false);

  const getToken = () => localStorage.getItem("access");

  const isWorkplace = role === "workplace";
  
  
  const endpoint = isWorkplace ? "/evaluations/workplace/" : "/evaluations/academic/";

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const token = getToken();
      await axios.post(
        `${API_URL}${endpoint}`,
        {
          placement_id: student.id,
          workplace_score: isWorkplace ? parseInt(score) : undefined,
          academic_score: !isWorkplace ? parseInt(score) : undefined,
          workplace_comments: isWorkplace ? comments : undefined,
          academic_comments: !isWorkplace ? comments : undefined
        },
        { headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' } }
      );

      alert(`${isWorkplace ? "Workplace" : "Academic"} evaluation submitted successfully!`);
      onComplete();
      onClose();
    } catch (error) {
      console.error("Error submitting evaluation:", error);
      if (error.response?.data?.error) {
        alert(error.response.data.error);
      } else {
        alert("Failed to submit evaluation");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content">
        <h2>{isWorkplace ? "Workplace" : "Academic"} Evaluation</h2>
        <p><strong>Student:</strong> {student.name}</p>

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Score (0-100) *</label>
            <input
              type="number"
              min="0"
              max="100"
              value={score}
              onChange={(e) => setScore(e.target.value)}
              required
            />
          </div>

          <div className="form-group">
            <label>Comments</label>
            <textarea
              value={comments}
              onChange={(e) => setComments(e.target.value)}
              rows="4"
              placeholder="Enter your evaluation comments here..."
            />
          </div>

          <div className="modal-buttons">
            <button type="submit" disabled={loading}>
              {loading ? "Submitting..." : "Submit Evaluation"}
            </button>
            <button type="button" onClick={onClose}>Cancel</button>
          </div>
        </form>
      </div>
    </div>
  );
}