import { useEffect, useState, useCallback } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import "./AcademicDashboard.css";
import notifications from "../utils/notifications";
import PendingApproval from "./PendingApproval";
import Notifications from "./Notifications";
import API_URL from '../utils/api';
export default function AcademicDashboard() {
  const [data, setData] = useState(null);
  const [view, setView] = useState("dashboard");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selectedLog, setSelectedLog] = useState(null);
  const [studentSearch, setStudentSearch] = useState("");
  const [user, setUser] = useState(null);
  const [isApproved, setIsApproved] = useState(true);
  const navigate = useNavigate();

  const getToken = () => localStorage.getItem("access");

  const loadUserInfo = useCallback(async () => {
    try {
      const token = getToken();
      if (!token) {
        window.location.href = "/login";
        return;
      }

      const userRes = await axios.get(`${API_URL}/users/me/`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      const userData = userRes.data.user;
      setUser(userData);
      
      const approved = userData.is_approved !== false;
      setIsApproved(approved);
      
      return approved;
    } catch (err) {
      console.error("Error fetching user:", err);
      if (err.response?.status === 401) {
        localStorage.removeItem("access");
        localStorage.removeItem("refresh");
        window.location.href = "/login";
      }
      return false;
    }
  }, []);

  const loadDashboard = useCallback(async () => {
    setLoading(true);
    try {
      const res = await axios.get(
        `${API_URL}/api/supervisor/academic/dashboard/`,
        { headers: { Authorization: `Bearer ${getToken()}` } }
      );
      setData(res.data);
    } catch (err) {
      if (err.response?.status === 401) {
        localStorage.removeItem("access");
        localStorage.removeItem("refresh");
        window.location.href = "/login";
      } else {
        setError("Failed to load dashboard");
        notifications.notifyError("Failed to load dashboard");
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const initialize = async () => {
      const approved = await loadUserInfo();
      if (approved) {
        await loadDashboard();
      } else {
        setLoading(false);
      }
    };
    initialize();
  }, [loadUserInfo, loadDashboard]);

  const logout = () => {
    localStorage.removeItem("access");
    localStorage.removeItem("refresh");
    notifications.notifyInfo("Logged out successfully");
    window.location.href = "/login";
  };

  const initials = data
    ? `${data.first_name?.[0] || ""}${data.last_name?.[0] || ""}`.toUpperCase()
    : "AS";

  if (loading) return <div className="ac-loading">Loading...</div>;
  if (error) return <div className="ac-loading">{error}</div>;
  if (!isApproved && user) {
    const userName = `${user.first_name || ""} ${user.last_name || ""}`;
    return <PendingApproval role="academic" userName={userName} />;
  }

  return (
    <div className="ac-shell">
      {/* SIDEBAR */}
      <div className="ac-sidebar">
        <div className="ac-brand">
          <h2>Academic Supervisor</h2>
          <p>ILES Platform</p>
        </div>
        <nav className="ac-nav">
          <button 
            className={view === "dashboard" ? "ac-nav-item active" : "ac-nav-item"} 
            onClick={() => setView("dashboard")}
          >
            Dashboard
          </button>
          <button 
            className={view === "students" ? "ac-nav-item active" : "ac-nav-item"} 
            onClick={() => setView("students")}
          >
            Assigned Students
          </button>
          <button 
            className={view === "logs" ? "ac-nav-item active" : "ac-nav-item"} 
            onClick={() => setView("logs")}
          >
            Student Logs
          </button>
          <button 
            className={view === "reviewed" ? "ac-nav-item active" : "ac-nav-item"} 
            onClick={() => setView("reviewed")}
          >
            Reviewed Logs
          </button>
          <button 
            className="ac-nav-item" 
            onClick={() => navigate("/academic/evaluate")}
          >
            Final Evaluation (30%)
          </button>
        </nav>
        <div className="ac-sidebar-footer">
          <button className="ac-logout" onClick={logout}>Logout</button>
        </div>
      </div>

      {/* MAIN CONTENT */}
      <div className="ac-main">
        {/* TOPBAR */}
        <div className="ac-topbar">
          <span className="ac-topbar-title">
            Academic Dashboard <span>/ {view.charAt(0).toUpperCase() + view.slice(1)}</span>
          </span>
          <div className="ac-user">
            <div className="ac-avatar">{initials}</div>
            <span>{data?.first_name} {data?.last_name}</span>
          </div>
        </div>

        {/* NOTIFICATIONS */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', padding: '0 20px', marginTop: '10px' }}>
          <Notifications 
            role="academic"
            getToken={getToken}
            
            onNotificationClick={(notification) => {
              if (notification.type === 'log') setView('logs');
            }}
          />
        </div>

        <div className="ac-content">

          {/* ==================== DASHBOARD VIEW ==================== */}
          {view === "dashboard" && (
            <>
              <div className="ac-stats">
                <div className="ac-stat blue">
                  <div className="ac-stat-label">Assigned Students</div>
                  <div className="ac-stat-value">{data?.assigned_students?.length || 0}</div>
                  <div className="ac-stat-sub">Active placements</div>
                </div>
                <div className="ac-stat amber">
                  <div className="ac-stat-label">Logs Submitted</div>
                  <div className="ac-stat-value">{data?.pending_logs?.length || 0}</div>
                  <div className="ac-stat-sub">Awaiting workplace review</div>
                </div>
                <div className="ac-stat green">
                  <div className="ac-stat-label">Evaluations Pending</div>
                  <div className="ac-stat-value">{data?.assigned_students?.filter(s => !s.evaluation_submitted).length || 0}</div>
                  <div className="ac-stat-sub">Need final evaluation</div>
                </div>
              </div>

              {/* Pending Logs Summary */}
              <div className="ac-section-header">
                <span className="ac-section-title">Recent Student Logs</span>
                <button 
                  className="ac-view-all-btn"
                  onClick={() => setView("logs")}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: '#1d4ed8',
                    cursor: 'pointer',
                    fontSize: '12px'
                  }}
                >
                  View all logs →
                </button>
              </div>
              <div className="ac-table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>Student</th>
                      <th>Week</th>
                      <th>Activities</th>
                      <th>Hours</th>
                      <th>Submitted</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data?.pending_logs?.length === 0 ? (
                      <tr>
                        <td colSpan="6"><div className="ac-empty">No logs submitted yet</div></td>
                      </tr>
                    ) : (
                      data?.pending_logs.slice(0, 5).map((log) => (
                        <tr key={log.id} onClick={() => setSelectedLog(log)} style={{cursor: "pointer"}}>
                          <td>{log.student_name}</td>
                          <td>Week {log.week_number}</td>
                          <td>{log.activities?.substring(0, 50)}...</td>
                          <td>{log.working_hours}h</td>
                          <td>{new Date(log.submission_date).toLocaleDateString()}</td>
                          <td><span className="ac-pill submitted">Pending Review</span></td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>

              {/* Assigned Students Summary */}
              <div className="ac-section-header">
                <span className="ac-section-title">Assigned Students</span>
                <button 
                  className="ac-view-all-btn"
                  onClick={() => setView("students")}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: '#1d4ed8',
                    cursor: 'pointer',
                    fontSize: '12px'
                  }}
                >
                  View all students →
                </button>
              </div>
              <div className="ac-table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>Student</th>
                      <th>Student ID</th>
                      <th>Company</th>
                      <th>Status</th>
                      <th>Evaluation</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data?.assigned_students?.length === 0 ? (
                      <tr>
                        <td colSpan="5"><div className="ac-empty">No students assigned yet</div></td>
                      </tr>
                    ) : (
                      data?.assigned_students.slice(0, 5).map((s) => (
                        <tr key={s.id}>
                          <td>{s.student_name}</td>
                          <td>{s.student_id}</td>
                          <td>{s.company_name}</td>
                          <td><span className={`ac-pill ${s.status}`}>{s.status}</span></td>
                          <td>
                            {s.evaluation_submitted ? (
                              <span className="ac-pill approved">Submitted</span>
                            ) : (
                              <button 
                                className="ac-evaluate-btn"
                                onClick={() => navigate("/academic/evaluate")}
                                style={{
                                  background: '#1d4ed8',
                                  color: 'white',
                                  border: 'none',
                                  padding: '4px 12px',
                                  borderRadius: '4px',
                                  cursor: 'pointer',
                                  fontSize: '11px'
                                }}
                              >
                                Submit Evaluation
                              </button>
                            )}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </>
          )}

          {/* ==================== ASSIGNED STUDENTS VIEW ==================== */}
          {view === "students" && (
            <>
              <div className="ac-section-header">
                <span className="ac-section-title">Assigned Students</span>
                <input
                  className="ac-search"
                  type="text"
                  placeholder="Search students..."
                  value={studentSearch}
                  onChange={(e) => setStudentSearch(e.target.value)}
                  style={{
                    padding: '6px 12px',
                    border: '1px solid #e2e8f0',
                    borderRadius: '6px',
                    width: '250px'
                  }}
                />
              </div>
              <div className="ac-table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>Student</th>
                      <th>Student ID</th>
                      <th>Company</th>
                      <th>Start Date</th>
                      <th>End Date</th>
                      <th>Status</th>
                      <th>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data?.assigned_students?.length === 0 ? (
                      <tr>
                        <td colSpan="7"><div className="ac-empty">No students assigned yet</div></td>
                      </tr>
                    ) : (
                      data?.assigned_students
                        .filter(s =>
                          s.student_name.toLowerCase().includes(studentSearch.toLowerCase()) ||
                          s.company_name.toLowerCase().includes(studentSearch.toLowerCase()) ||
                          s.student_id?.toLowerCase().includes(studentSearch.toLowerCase())
                        )
                        .map((s) => (
                          <tr key={s.id}>
                            <td>{s.student_name}</td>
                            <td>{s.student_id}</td>
                            <td>{s.company_name}</td>
                            <td>{s.start_date}</td>
                            <td>{s.end_date}</td>
                            <td><span className={`ac-pill ${s.status}`}>{s.status}</span></td>
                            <td>
                              {s.status === 'approved' && !s.evaluation_submitted ? (
                                <button 
                                  className="ac-evaluate-btn"
                                  onClick={() => navigate("/academic/evaluate")}
                                  style={{
                                    background: '#1d4ed8',
                                    color: 'white',
                                    border: 'none',
                                    padding: '4px 12px',
                                    borderRadius: '4px',
                                    cursor: 'pointer',
                                    fontSize: '11px'
                                  }}
                                >
                                  Final Evaluation (30%)
                                </button>
                              ) : s.evaluation_submitted ? (
                                <span className="ac-pill approved">Evaluated</span>
                              ) : (
                                <span className="ac-pill pending">Pending</span>
                              )}
                            </td>
                          </tr>
                        ))
                    )}
                  </tbody>
                </table>
              </div>
            </>
          )}

          {/* ==================== STUDENT LOGS VIEW (READ-ONLY) ==================== */}
          {view === "logs" && (
            <>
              <div className="ac-section-header">
                <span className="ac-section-title">Student Logs (Read-Only)</span>
                <span className="ac-badge">{data?.pending_logs?.length || 0} pending review by workplace</span>
              </div>
              <div className="ac-info-banner" style={{
                background: '#eff6ff',
                border: '1px solid #3b82f6',
                borderRadius: '8px',
                padding: '10px 16px',
                marginBottom: '20px',
                fontSize: '13px',
                color: '#1e40af'
              }}>
                📋 <strong>Note:</strong> As an Academic Supervisor, you can view all student logs to monitor progress. 
                Log approval is handled by the Workplace Supervisor.
              </div>
              <div className="ac-table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>Student</th>
                      <th>Week</th>
                      <th>Activities</th>
                      <th>Challenges</th>
                      <th>Hours</th>
                      <th>Submitted</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data?.pending_logs?.length === 0 && data?.reviewed_logs?.length === 0 ? (
                      <tr>
                        <td colSpan="7"><div className="ac-empty">No logs submitted yet</div></td>
                      </tr>
                    ) : (
                      [...(data?.pending_logs || []), ...(data?.reviewed_logs || [])]
                        .sort((a, b) => new Date(b.submission_date) - new Date(a.submission_date))
                        .map((log) => (
                          <tr key={log.id} onClick={() => setSelectedLog(log)} style={{cursor: "pointer"}}>
                            <td>{log.student_name}</td>
                            <td>Week {log.week_number}</td>
                            <td>{log.activities?.substring(0, 60)}...</td>
                            <td>{log.challenges?.substring(0, 40) || "None"}</td>
                            <td>{log.working_hours}h</td>
                            <td>{new Date(log.submission_date).toLocaleDateString()}</td>
                            <td>
                              <span className={`ac-pill ${log.status === 'approved' ? 'approved' : log.status === 'rejected' ? 'rejected' : 'submitted'}`}>
                                {log.status === 'approved' ? 'Approved' : log.status === 'rejected' ? 'Rejected' : 'Pending Review'}
                              </span>
                            </td>
                          </tr>
                        ))
                    )}
                  </tbody>
                </table>
              </div>
            </>
          )}

          {/* ==================== REVIEWED LOGS VIEW ==================== */}
          {view === "reviewed" && (
            <>
              <div className="ac-section-header">
                <span className="ac-section-title">Reviewed Logs</span>
              </div>
              <div className="ac-table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>Student</th>
                      <th>Week</th>
                      <th>Status</th>
                      <th>Score</th>
                      <th>Workplace Feedback</th>
                      <th>Reviewed At</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data?.reviewed_logs?.length === 0 ? (
                      <tr>
                        <td colSpan="6"><div className="ac-empty">No reviewed logs yet</div></td>
                      </tr>
                    ) : (
                      data?.reviewed_logs.map((log) => (
                        <tr key={log.id}>
                          <td>{log.student_name}</td>
                          <td>Week {log.week_number}</td>
                          <td><span className={`ac-pill ${log.status}`}>{log.status}</span></td>
                          <td>{log.score ?? "—"}/100</td>
                          <td>{log.feedback || "—"}</td>
                          <td>{log.reviewed_at ? new Date(log.reviewed_at).toLocaleDateString() : "—"}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>
      </div>

      {/* LOG DETAIL MODAL (READ-ONLY - NO APPROVE/REJECT BUTTONS) */}
      {selectedLog && (
        <div className="ac-modal-overlay" onClick={() => setSelectedLog(null)}>
          <div className="ac-modal" onClick={(e) => e.stopPropagation()}>
            <div className="ac-modal-header">
              <h2>Log Details — Week {selectedLog.week_number}</h2>
              <button className="ac-modal-close" onClick={() => setSelectedLog(null)}>✕</button>
            </div>
            <div className="ac-modal-body">
              <div className="ac-detail-row">
                <span className="ac-detail-label">Student</span>
                <span className="ac-detail-value">{selectedLog.student_name}</span>
              </div>
              <div className="ac-detail-row">
                <span className="ac-detail-label">Week</span>
                <span className="ac-detail-value">{selectedLog.week_number}</span>
              </div>
              <div className="ac-detail-row">
                <span className="ac-detail-label">Working Hours</span>
                <span className="ac-detail-value">{selectedLog.working_hours}h</span>
              </div>
              <div className="ac-detail-row">
                <span className="ac-detail-label">Submitted</span>
                <span className="ac-detail-value">{new Date(selectedLog.submission_date).toLocaleDateString()}</span>
              </div>
              <div className="ac-detail-row">
                <span className="ac-detail-label">Status</span>
                <span className="ac-detail-value">
                  <span className={`ac-pill ${selectedLog.status === 'approved' ? 'approved' : selectedLog.status === 'rejected' ? 'rejected' : 'submitted'}`}>
                    {selectedLog.status === 'approved' ? 'Approved by Workplace' : 
                     selectedLog.status === 'rejected' ? 'Rejected by Workplace' : 
                     'Pending Workplace Review'}
                  </span>
                </span>
              </div>
              {selectedLog.score && (
                <div className="ac-detail-row">
                  <span className="ac-detail-label">Score</span>
                  <span className="ac-detail-value">{selectedLog.score}/100</span>
                </div>
              )}
              {selectedLog.feedback && (
                <div className="ac-detail-section">
                  <span className="ac-detail-label">Workplace Feedback</span>
                  <p className="ac-detail-text">{selectedLog.feedback}</p>
                </div>
              )}
              <div className="ac-detail-section">
                <span className="ac-detail-label">Activities</span>
                <p className="ac-detail-text">{selectedLog.activities}</p>
              </div>
              <div className="ac-detail-section">
                <span className="ac-detail-label">Challenges</span>
                <p className="ac-detail-text">{selectedLog.challenges || "None reported"}</p>
              </div>
              {selectedLog.attachment && (
                <div className="ac-detail-row">
                  <span className="ac-detail-label">Attachment</span>
                  <a href={selectedLog.attachment} target="_blank" rel="noreferrer" className="ac-detail-link">View File</a>
                </div>
              )}
            </div>
            <div className="ac-modal-footer">
              <button className="ac-btn-cancel" onClick={() => setSelectedLog(null)}>Close</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}