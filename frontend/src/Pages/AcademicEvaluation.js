import { useEffect, useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import "./AcademicDashboard.css";
import API_URL from '../utils/api';
export default function AcademicEvaluation() {
  const [students, setStudents] = useState([]);
  const [selectedPlacement, setSelectedPlacement] = useState("");
  const [score, setScore] = useState("");
  const [comments, setComments] = useState("");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const navigate = useNavigate();

  const getToken = () => localStorage.getItem("access");

  useEffect(() => {
    fetchStudents();
  }, []);

  const fetchStudents = async () => {
    try {
      const res = await axios.get(
        `${API_URL}/api/supervisor/academic/dashboard/`,
        { headers: { Authorization: `Bearer ${getToken()}` } }
      );
      setStudents(res.data.assigned_students || []);
    } catch (err) {
      if (err.response?.status === 401) {
        localStorage.removeItem("access");
        localStorage.removeItem("refresh");
        window.location.href = "/login";
      } else {
        setError("Failed to load students");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!selectedPlacement) return setError("Please select a student");
    if (!score || score < 0 || score > 100) return setError("Score must be between 0 and 100");

    setSubmitting(true);
    setError("");
    setMessage("");

    try {
      await axios.post(
        `${API_URL}/evaluations/academic/`,
        {
          placement_id: selectedPlacement,
          academic_score: parseInt(score),
          academic_comments: comments,
        },
        { headers: { Authorization: `Bearer ${getToken()}` } }
      );
      setMessage("Evaluation submitted successfully!");
      setScore("");
      setComments("");
      setSelectedPlacement("");
    } catch (err) {
      setError(err.response?.data?.error || "Failed to submit evaluation");
    } finally {
      setSubmitting(false);
    }
  };

  const logout = () => {
    localStorage.removeItem("access");
    localStorage.removeItem("refresh");
    window.location.href = "/login";
  };

  if (loading) return <div className="ac-loading">Loading...</div>;

  return (
    <div className="ac-shell">

      {/* SIDEBAR */}
      <div className="ac-sidebar">
        <div className="ac-brand">
          <h2>Academic Supervisor</h2>
          <p>ILES Platform</p>
        </div>
        <nav className="ac-nav">
          <button className="ac-nav-item" onClick={() => navigate("/academic")}>Dashboard</button>
          <button className="ac-nav-item" onClick={() => navigate("/academic")}>Students</button>
          <button className="ac-nav-item" onClick={() => navigate("/academic")}>Pending Logs</button>
          <button className="ac-nav-item" onClick={() => navigate("/academic")}>Reviewed Logs</button>
          <button className="ac-nav-item active">Evaluate Student</button>
        </nav>
        <div className="ac-sidebar-footer">
          <button className="ac-logout" onClick={logout}>Logout</button>
        </div>
      </div>

      {/* MAIN */}
      <div className="ac-main">
        <div className="ac-topbar">
          <span className="ac-topbar-title">Dashboard <span>/ Evaluate Student</span></span>
        </div>

  <div className="ac-content">
  <div className="ac-section-header">
    <span className="ac-section-title">Submit Academic Evaluation</span>
  </div>

  {message && <div className="ac-success-msg">{message}</div>}
  {error && <div className="ac-error-msg">{error}</div>}

  <div className="ac-form-card ac-eval-card">
    
    {/* FORM SIDE */}
    <div className="ac-eval-left">
      <form onSubmit={handleSubmit}>
        <div className="ac-form-group">
          <label>Select Student</label>
          <select
            value={selectedPlacement}
            onChange={(e) => setSelectedPlacement(e.target.value)}
            required
          >
            <option value="">-- Choose a student --</option>
            {students.map((s) => (
              <option key={s.id} value={s.id}>
                {s.student_name} — {s.company_name}
              </option>
            ))}
          </select>
          {students.length === 0 && (
            <p className="ac-form-hint">No students assigned to you yet.</p>
          )}
        </div>

        <div className="ac-form-group">
          <label>Academic Score (0 – 100)</label>
          <input
            type="number"
            min="0"
            max="100"
            value={score}
            onChange={(e) => setScore(e.target.value)}
            placeholder="Enter score out of 100"
            required
          />
          <p className="ac-form-hint">This counts as 30% of the student's final grade.</p>
        </div>

        <div className="ac-form-group">
          <label>Academic Comments</label>
          <textarea
            value={comments}
            onChange={(e) => setComments(e.target.value)}
            placeholder="Write your evaluation comments..."
            rows={6}
          />
        </div>

        <button type="submit" className="ac-submit-btn" disabled={submitting}>
          {submitting ? "Submitting..." : "Submit Evaluation"}
        </button>
      </form>
    </div>

    {/* VERTICAL DIVIDER */}
    <div className="ac-eval-divider"></div>

    {/* INFO SIDE */}
    <div className="ac-eval-right">
      <div className="ac-eval-section">
        <h3>Grading Breakdown</h3>
        <div className="ac-grade-item">
          <span>Workplace Score</span>
          <span className="ac-grade-pct">40%</span>
        </div>
        <div className="ac-grade-item">
          <span>Academic Score</span>
          <span className="ac-grade-pct highlight">30%</span>
        </div>
        <div className="ac-grade-item">
          <span>Log Average</span>
          <span className="ac-grade-pct">30%</span>
        </div>
        <div className="ac-grade-divider"></div>
        <div className="ac-grade-item total">
          <span>Final Score</span>
          <span className="ac-grade-pct">100%</span>
        </div>
      </div>

      <div className="ac-eval-section" style={{marginTop: "24px"}}>
        <h3>Grade Scale</h3>
        <div className="ac-grade-item"><span>A</span><span>80 – 100</span></div>
        <div className="ac-grade-item"><span>B</span><span>70 – 79</span></div>
        <div className="ac-grade-item"><span>C</span><span>60 – 69</span></div>
        <div className="ac-grade-item"><span>D</span><span>50 – 59</span></div>
        <div className="ac-grade-item"><span>F</span><span>Below 50</span></div>
      </div>

      <div className="ac-eval-section" style={{marginTop: "24px"}}>
        <h3>Assigned Students</h3>
        {students.length === 0 ? (
          <p className="ac-form-hint">No students assigned yet.</p>
        ) : (
          students.map((s) => (
            <div key={s.id} className="ac-grade-item">
              <span>{s.student_name}</span>
              <span className={`ac-pill ${s.status}`}>{s.status}</span>
            </div>
          ))
        )}
      </div>
    </div>

           </div>
        </div>
      </div>
    </div>
  );
}