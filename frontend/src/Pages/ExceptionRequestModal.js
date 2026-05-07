// ExceptionRequestModal.jsx
import { useState } from "react";
import axios from "axios";
import "./ExceptionRequestModal.css";
import API_URL from '../utils/api';
export default function ExceptionRequestModal({ onClose, onComplete }) {
  const [reason, setReason] = useState("");
  const [requestType, setRequestType] = useState("count_existing");
  const [loading, setLoading] = useState(false);
  const [charCount, setCharCount] = useState(0);

 
  const getToken = () => localStorage.getItem("access");

  const handleReasonChange = (e) => {
    const value = e.target.value;
    if (value.length <= 500) {
      setReason(value);
      setCharCount(value.length);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    const trimmedReason = reason.trim();
    
    if (trimmedReason.length === 0) {
      alert("Please enter an explanation for missing weekly logs.");
      return;
    }
    
    if (trimmedReason.length < 10) {
      alert(`Explanation too short (${trimmedReason.length} chars). Minimum 10 characters required.`);
      return;
    }
    
    setLoading(true);
    
    try {
      const token = getToken();
      const response = await axios.post(
        `${API_URL}/api/student/request-exception/`,
        { 
          reason: trimmedReason,
          request_type: requestType 
        },
        { headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' } }
      );
      
      if (response.status === 200) {
        if (requestType === 'count_existing') {
          alert("Exception request submitted! Admin will review your case.");
        } else {
          alert("Late submission request submitted! Admin will review and notify your workplace supervisor.");
        }
        onComplete();
        onClose();
      }
    } catch (error) {
      console.error("Error submitting exception request:", error);
      if (error.response?.data?.error) {
        alert(error.response.data.error);
      } else {
        alert("Failed to submit request. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content">
        <h2> Request Exception for Missing Logs</h2>
        <p className="modal-description">
          Please explain why you missed some weekly logs and choose what you want.
        </p>

        <form onSubmit={handleSubmit}>
          {/* Request Type Selection */}
          <div className="form-group">
            <label>What would you like? <span className="required">*</span></label>
            <div style={{ marginTop: '10px' }}>
              <label style={{ 
                display: 'block', 
                marginBottom: '15px', 
                padding: '12px', 
                border: requestType === 'count_existing' ? '2px solid #3b82f6' : '1px solid #e2e8f0', 
                borderRadius: '8px', 
                cursor: 'pointer',
                background: requestType === 'count_existing' ? '#eff6ff' : 'white'
              }}>
                <input
                  type="radio"
                  name="requestType"
                  value="count_existing"
                  checked={requestType === 'count_existing'}
                  onChange={(e) => setRequestType(e.target.value)}
                  style={{ marginRight: '10px' }}
                />
                <strong>Count only my submitted logs</strong>
                <div style={{ fontSize: '12px', color: '#666', marginTop: '5px' }}>
                  Ignore the missing weeks and calculate my grade based only on what I submitted.
                  Admin will review and approve directly.
                </div>
              </label>
              
              <label style={{ 
                display: 'block', 
                padding: '12px', 
                border: requestType === 'late_submission' ? '2px solid #3b82f6' : '1px solid #e2e8f0', 
                borderRadius: '8px', 
                cursor: 'pointer',
                background: requestType === 'late_submission' ? '#eff6ff' : 'white'
              }}>
                <input
                  type="radio"
                  name="requestType"
                  value="late_submission"
                  checked={requestType === 'late_submission'}
                  onChange={(e) => setRequestType(e.target.value)}
                  style={{ marginRight: '10px' }}
                />
                <strong> Allow me to submit missing logs late</strong>
                <div style={{ fontSize: '12px', color: '#666', marginTop: '5px' }}>
                  My workplace supervisor will be asked to approve late submission of missing weeks.
                </div>
              </label>
            </div>
          </div>

          {/* Explanation Field */}
          <div className="form-group">
            <label>Explanation <span className="required">*</span></label>
            <textarea
              rows="5"
              placeholder="e.g., technical issues with the logging system, personal emergency, or overlapping deadlines..."
              value={reason}
              onChange={handleReasonChange}
              required
            />
            <div className="char-counter">
              <span className={charCount >= 10 ? "valid" : charCount > 0 ? "invalid" : ""}>
                {charCount}
              </span> / 500 characters
              {charCount > 0 && charCount < 10 && (
                <span className="warning-text"> (minimum 10 required)</span>
              )}
              {charCount >= 10 && (
                <span className="valid-text"> ✓ valid</span>
              )}
            </div>
          </div>

          {/* Info Note - changes based on selection */}
          <div className="info-note" style={{
            background: requestType === 'count_existing' ? '#fef3c7' : '#e0f2fe',
            border: requestType === 'count_existing' ? '1px solid #f59e0b' : '1px solid #38bdf8',
            color: requestType === 'count_existing' ? '#92400e' : '#0369a1'
          }}>
            <span>
              {requestType === 'count_existing' 
                ? ' If approved, missing weeks will be ignored and your grade will be calculated only from submitted logs.'
                : ' If approved, your workplace supervisor will be contacted. They have the final say on allowing late submissions.'}
            </span>
          </div>

          <div className="modal-buttons">
            <button type="submit" disabled={loading}>
              {loading ? "Submitting..." : "Submit Request"}
            </button>
            <button type="button" onClick={onClose}>Cancel</button>
          </div>
        </form>
      </div>
    </div>
  );
}