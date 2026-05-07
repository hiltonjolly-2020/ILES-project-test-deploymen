// ReviewLogModal.jsx
import { useState } from "react";
import axios from "axios";
import "./ReviewLogModal.css";
import notifications from "../utils/notifications"; 
import API_URL from '../utils/api';
export default function ReviewLogModal({ log, onClose, onReviewComplete }) {
  const [score, setScore] = useState("");
  const [feedback, setFeedback] = useState("");
  const [status, setStatus] = useState("approved");
  const [loading, setLoading] = useState(false);


  const getToken = () => localStorage.getItem("access");

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const token = getToken();
      
      await axios.put(
        `${API_URL}/logs/${log.id}/review/`,
        { status, score: parseInt(score), feedback },
        { 
          headers: { 
            Authorization: `Bearer ${token}`, 
            'Content-Type': 'application/json' 
          } 
        }
      );

      notifications.notifySuccess("Log reviewed successfully!");
      if (onReviewComplete) onReviewComplete();
      onClose();

    } catch (error) {
      console.error("Error reviewing log:", error);
      notifications.notifyError(
        error.response?.data?.error || "Failed to review log"
      ); 
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content">
        <h2>Review Weekly Log</h2>
        
        <div className="log-info">
          <p><strong>Student:</strong> {log.student_name}</p>
          <p><strong>Week:</strong> {log.week_number}</p>
          <p><strong>Activities:</strong></p>
          <div className="activities-box">
            {log.activities}
          </div>

          {log.challenges && (
            <>
              <p><strong>Challenges:</strong></p>
              <div className="challenges-box">
                {log.challenges}
              </div>
            </>
          )}

          {log.attachment && (
            <p>
              <strong>Attachment:</strong>{" "}
              <a href={log.attachment} target="_blank" rel="noopener noreferrer">
                Download
              </a>
            </p>
          )}
        </div>

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Score (0-100):</label>
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
            <label>Feedback:</label>
            <textarea
              value={feedback}
              onChange={(e) => setFeedback(e.target.value)}
              rows="4"
              required
            />
          </div>

          <div className="form-group">
            <label>Decision:</label>
            <select 
              value={status} 
              onChange={(e) => setStatus(e.target.value)}
            >
              <option value="approved">Approve</option>
              <option value="rejected">Reject</option>
            </select>
          </div>

          <div className="modal-buttons">
            <button type="submit" disabled={loading}>
              {loading ? "Submitting..." : "Submit Review"}
            </button>
            <button type="button" onClick={onClose}>
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}