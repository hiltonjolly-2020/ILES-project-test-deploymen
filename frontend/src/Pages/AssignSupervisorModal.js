import { useState, useEffect } from "react";
import axios from "axios";
import "./AssignSupervisorModal.css";
import API_URL from '../utils/api';
export default function AssignSupervisorModal({ placement, onClose, onAssign }) {
  const [workplaceId, setWorkplaceId] = useState("");
  const [academicId, setAcademicId] = useState("");
  const [availableWorkplace, setAvailableWorkplace] = useState([]);
  const [availableAcademic, setAvailableAcademic] = useState([]);
  const [currentWorkplace, setCurrentWorkplace] = useState(null);
  const [currentAcademic, setCurrentAcademic] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const getToken = () => localStorage.getItem("access");

  useEffect(() => {
    const fetchAvailable = async () => {
      try {
        const token = getToken();
        const response = await axios.get(
          `${API_URL}/placements/${placement.id}/assign_supervisors/`,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        setAvailableWorkplace(response.data.available_workplace || []);
        setAvailableAcademic(response.data.available_academic || []);
        setCurrentWorkplace(response.data.current?.workplace || null);
        setCurrentAcademic(response.data.current?.academic || null);
        
        // Pre-select already assigned supervisors
        if (response.data.current?.workplace) {
          setWorkplaceId(response.data.current.workplace.toString());
        }
        if (response.data.current?.academic) {
          setAcademicId(response.data.current.academic.toString());
        }
      } catch (error) {
        console.error("Error fetching supervisors:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchAvailable();
  }, [placement.id]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      const token = getToken();
      const assignData = {};
      if (workplaceId) assignData.workplace_id = parseInt(workplaceId);
      if (academicId) assignData.academic_id = parseInt(academicId);

      const response = await axios.post(
        `${API_URL}/placements/${placement.id}/assign_supervisors/`,
        assignData,
        { headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' } }
      );

      // Show appropriate message based on response
      if (response.data.message.includes("Both supervisors assigned")) {
        alert("Both supervisors assigned! Placement approved. Student can now submit logs.");
        onAssign();
        onClose();
      } else if (response.data.message.includes("Workplace supervisor assigned")) {
        alert("Workplace supervisor assigned. Please also assign an academic supervisor to approve the placement.");
        // Refresh the modal data to show updated current assignments
        const refreshResponse = await axios.get(
          `${API_URL}/placements/${placement.id}/assign_supervisors/`,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        setCurrentWorkplace(refreshResponse.data.current?.workplace || null);
        setCurrentAcademic(refreshResponse.data.current?.academic || null);
        setSubmitting(false);
      } else if (response.data.message.includes("Academic supervisor assigned")) {
        alert("Academic supervisor assigned. Please also assign a workplace supervisor to approve the placement.");
        // Refresh the modal data
        const refreshResponse = await axios.get(
          `${API_URL}/placements/${placement.id}/assign_supervisors/`,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        setCurrentWorkplace(refreshResponse.data.current?.workplace || null);
        setCurrentAcademic(refreshResponse.data.current?.academic || null);
        setSubmitting(false);
      } else {
        alert(response.data.message);
        onAssign();
        onClose();
      }
    } catch (error) {
      console.error("Error assigning:", error);
      alert(error.response?.data?.message || "Failed to assign supervisors");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="modal-overlay">
        <div className="modal-content">
          <p>Loading available supervisors...</p>
        </div>
      </div>
    );
  }

  const hasWorkplace = currentWorkplace !== null;
  const hasAcademic = currentAcademic !== null;
  const bothAssigned = hasWorkplace && hasAcademic;

  return (
    <div className="modal-overlay">
      <div className="modal-content">
        <h2>Assign Supervisors</h2>
        <p><strong>Student:</strong> {placement.student_name}</p>
        <p><strong>Company:</strong> {placement.company_name}</p>
        <p><strong>Status:</strong> {placement.status || 'pending'}</p>

        {/* Show current assignments */}
        <div className="current-assignments">
          <h3>Currently Assigned:</h3>
          <div className="assignment-status">
            <div className={`status-item ${hasWorkplace ? 'assigned' : 'missing'}`}>
              <strong>Workplace Supervisor:</strong>
              {hasWorkplace ? (
                <span className="assigned">✓ Assigned (ID: {currentWorkplace})</span>
              ) : (
                <span className="missing">❌ Not assigned yet</span>
              )}
            </div>
            <div className={`status-item ${hasAcademic ? 'assigned' : 'missing'}`}>
              <strong>Academic Supervisor:</strong>
              {hasAcademic ? (
                <span className="assigned">✓ Assigned (ID: {currentAcademic})</span>
              ) : (
                <span className="missing">❌ Not assigned yet</span>
              )}
            </div>
          </div>
          {!bothAssigned && (
            <div className="warning-message">
              ⚠️ Both supervisors must be assigned for the placement to be approved.
              The student cannot submit logs until both are assigned.
            </div>
          )}
          {bothAssigned && (
            <div className="success-message">
              ✅ Both supervisors assigned! Placement is approved.
            </div>
          )}
        </div>

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Workplace Supervisor:</label>
            <select value={workplaceId} onChange={(e) => setWorkplaceId(e.target.value)}>
              <option value="">-- Select Workplace Supervisor --</option>
              {availableWorkplace.map(sup => (
                <option key={sup.id} value={sup.id}>
                  {sup.name} (ID: {sup.id})
                </option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label>Academic Supervisor:</label>
            <select value={academicId} onChange={(e) => setAcademicId(e.target.value)}>
              <option value="">-- Select Academic Supervisor --</option>
              {availableAcademic.map(sup => (
                <option key={sup.id} value={sup.id}>
                  {sup.name} (ID: {sup.id})
                </option>
              ))}
            </select>
          </div>

          <div className="modal-buttons">
            <button type="submit" disabled={submitting}>
              {submitting ? "Assigning..." : "Assign Supervisors"}
            </button>
            <button type="button" onClick={onClose}>Cancel</button>
          </div>
        </form>
      </div>
    </div>
  );
}