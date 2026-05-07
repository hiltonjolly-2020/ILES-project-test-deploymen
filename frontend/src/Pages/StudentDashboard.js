import { useEffect, useState } from "react";
import axios from "axios";
import "./StudentDashboard.css";
import StudentPlacement from "./StudentPlacement";
import StudentLogs from "./StudentLogs";
import ExceptionRequestModal from "./ExceptionRequestModal";
import notifications from "../utils/notifications";
import Notifications from "./Notifications";
import API_URL from '../utils/api';
export default function StudentDashboard() {
  const [user, setUser] = useState(null);
  const [dashboardData, setDashboardData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("dashboard");
  const [showExceptionModal, setShowExceptionModal] = useState(false);
  const [confirmingView, setConfirmingView] = useState(false);

  const [approvedCompanies, setApprovedCompanies] = useState([]);
  const [selectedCompanyId, setSelectedCompanyId] = useState("");
  const [newCompanyName, setNewCompanyName] = useState("");

 
  const getToken = () => localStorage.getItem("access");

  const logout = () => {
    localStorage.removeItem("access");
    localStorage.removeItem("refresh");
    notifications.notifyInfo("Logged out successfully");
    window.location.href = "/login";
  };

  const fetchStudentData = async () => {
    const token = getToken();
    if (!token) {
      window.location.href = "/login";
      return;
    }

    try {
      const userRes = await axios.get(`${API_URL}/users/me/`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      setUser(userRes.data.user);

      const studentRes = await axios.get(`${API_URL}/api/student/dashboard/`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      setDashboardData(studentRes.data);

      const companiesRes = await axios.get(`${API_URL}/api/companies/approved/`);
      setApprovedCompanies(companiesRes.data);

    } catch (error) {
      console.error("Error fetching student dashboard:", error.response?.data);
      notifications.notifyError("Failed to load dashboard data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStudentData();
  }, []);

  const confirmEvaluationView = async () => {
    setConfirmingView(true);
    try {
      const token = getToken();
      await axios.post(`${API_URL}/api/student/confirm-evaluation-view/`, {
        placement_id: dashboardData?.placement?.id
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      notifications.notifySuccess("Evaluation confirmed as viewed!");
      await fetchStudentData();
    } catch (error) {
      console.error("Error confirming evaluation view:", error);
      notifications.notifyError("Failed to confirm evaluation view");
    } finally {
      setConfirmingView(false);
    }
  };

  const applyForPlacement = async (e) => {
    e.preventDefault();

    const start_date = document.getElementById("start_date").value;
    const end_date = document.getElementById("end_date").value;
    const student_id = user?.student_id;

    let company_name = "";
    if (selectedCompanyId) {
      const selectedCompany = approvedCompanies.find(
        c => c.id === parseInt(selectedCompanyId)
      );
      company_name = selectedCompany?.name || "";
    } else {
      company_name = newCompanyName;
    }

    try {
      const token = getToken();

      await axios.post(`${API_URL}/api/placements/apply/`, {
        student_id,
        company_name,
        start_date,
        end_date
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });

      notifications.notifySuccess("Placement application submitted successfully!");

      const dashboardRes = await axios.get(`${API_URL}/api/student/dashboard/`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      setDashboardData(dashboardRes.data);
      setActiveTab("dashboard");

    } catch (error) {
      console.error("Placement error:", error.response?.data);
      notifications.notifyError(error.response?.data?.error || "Application failed");
    }
  };

  const submitWeeklyLog = async (e) => {
    e.preventDefault();

    if (!dashboardData?.placement?.id) {
      notifications.notifyError("You must have a placement before submitting logs.");
      return;
    }

    // ✅ FIX: Allow if status approved OR late_approved
    if (dashboardData?.placement?.status !== "approved" && dashboardData?.exception_status !== "late_approved") {
      notifications.notifyError("Your placement must be approved or you need late submission approval.");
      return;
    }

    const formData = new FormData();

    formData.append("placement", dashboardData.placement.id);
    formData.append("week_number", document.getElementById("week_number").value);
    formData.append("activities", document.getElementById("activities").value);
    formData.append("challenges", document.getElementById("challenges").value);
    formData.append("working_hours", document.getElementById("working_hours").value);

    const fileInput = document.getElementById("attachment");
    if (fileInput && fileInput.files.length > 0) {
      formData.append("attachment", fileInput.files[0]);
    }

    try {
      const token = getToken();

      await axios.post(`${API_URL}/api/student/logs/`, formData, {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "multipart/form-data"
        }
      });

      notifications.notifySuccess("Weekly log submitted successfully! Your workplace supervisor will review it soon.");

      const dashboardRes = await axios.get(`${API_URL}/api/student/dashboard/`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      setDashboardData(dashboardRes.data);
      
      // Clear form fields
      document.getElementById("week_number").value = "";
      document.getElementById("activities").value = "";
      document.getElementById("challenges").value = "";
      if (document.getElementById("working_hours")) {
        document.getElementById("working_hours").value = "";
      }
      if (document.getElementById("attachment")) {
        document.getElementById("attachment").value = "";
      }

    } catch (error) {
      console.error("LOG ERROR:", error.response?.data);
      notifications.notifyError(error.response?.data?.error || "Failed to submit log");
    }
  };

  const openExceptionModal = () => {
    setShowExceptionModal(true);
  };

  const handleExceptionComplete = async () => {
    await fetchStudentData();
    setShowExceptionModal(false);
  };

  // Helper function to calculate missing weeks
  const calculateMissingWeeks = () => {
    if (!dashboardData?.placement) return [];
    const placement = dashboardData.placement;
    const startDate = new Date(placement.start_date);
    const endDate = new Date(placement.end_date);
    const totalDays = (endDate - startDate) / (1000 * 60 * 60 * 24);
    const totalWeeks = Math.ceil(totalDays / 7) || 1;
    const submittedWeeks = dashboardData.recent_logs?.map(l => l.week_number) || [];
    const missing = [];
    for (let i = 1; i <= totalWeeks; i++) {
      if (!submittedWeeks.includes(i)) missing.push(i);
    }
    return missing;
  };

  if (loading) {
    return <div className="loading-container">Loading dashboard...</div>;
  }

  return (
    <div className="dashboard-container">
      <div className="sidebar">
        <h2>ILES System</h2>
        <div className="user-info">
          <p><strong>{user?.first_name} {user?.last_name}</strong></p>
          <p className="role-badge">student</p>
        </div>

        <nav className="sidebar-nav">
          <button onClick={() => setActiveTab("dashboard")}>Dashboard</button>
          <button onClick={() => setActiveTab("placement")}>Placement</button>
          <button onClick={() => setActiveTab("logs")}>Weekly Logs</button>
          <button onClick={logout} className="logout-btn">Logout</button>
        </nav>
      </div>

      <div className="main-content">
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '20px' }}>
          <Notifications 
            role="student"
            getToken={getToken}
            
            onNotificationClick={(notification) => {
              if (notification.type === 'placement') setActiveTab('placement');
              else if (notification.type === 'review') setActiveTab('logs');
            }}
          />
        </div>

        {activeTab === "dashboard" && (
          <div>
            <h1>Student Dashboard</h1>

            <div className="dashboard-cards">
              <div className="card">
                <h3>University Student ID</h3>
                <p>{user?.student_id || "Not set"}</p>
              </div>
              <div className="card">
                <h3>Department of Attachment</h3>
                <p>{user?.department_name || "Not set"}</p>
              </div>
              <div className="card">
                <h3>Email Address</h3>
                <p>{user?.email || "Not set"}</p>
              </div>
            </div>

            {dashboardData?.placement ? (
              <div className="placement-info">
                <h2>Placement Information</h2>
                <p><strong>Company:</strong> {dashboardData.placement.company_name}</p>
                <p><strong>Status:</strong> 
                  <span className={`status-badge ${dashboardData.placement.status}`}>
                    {dashboardData.placement.status}
                    {dashboardData.exception_status === 'late_approved' && ' (Late Submission Approved)'}
                  </span>
                </p>
                <p><strong>Start Date:</strong> {dashboardData.placement.start_date}</p>
                <p><strong>End Date:</strong> {dashboardData.placement.end_date}</p>
                {dashboardData.placement.workplace_supervisor_name && (
                  <p><strong>Workplace Supervisor:</strong> {dashboardData.placement.workplace_supervisor_name}</p>
                )}
                {dashboardData.placement.academic_supervisor_name && (
                  <p><strong>Academic Supervisor:</strong> {dashboardData.placement.academic_supervisor_name}</p>
                )}
              </div>
            ) : (
              <div className="empty-placement">
                <p>No placement yet. <button onClick={() => setActiveTab("placement")}>Apply now</button></p>
              </div>
            )}

            {/* EXCEPTION REQUEST SECTION */}
            {dashboardData?.can_request_exception && !dashboardData?.log_exception_requested && (
              <div className="exception-request" style={{
                background: '#fef3c7',
                border: '1px solid #f59e0b',
                borderRadius: '8px',
                padding: '16px',
                marginTop: '20px'
              }}>
                <p>You have missing weekly logs. The system cannot calculate your final grade.</p>
                <button 
                  className="exception-btn" 
                  onClick={openExceptionModal}
                  style={{
                    background: '#f59e0b',
                    color: 'white',
                    border: 'none',
                    padding: '8px 16px',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    marginTop: '10px'
                  }}
                >
                  Request Exception for Missing Logs
                </button>
              </div>
            )}

            {/* EXCEPTION STATUS DISPLAY */}
            {dashboardData?.log_exception_requested === true && dashboardData?.exception_status && (
              <>
                {dashboardData.exception_status === 'approved' && (
                  <div className="exception-status approved" style={{
                    background: '#dcfce7',
                    border: '1px solid #86efac',
                    borderRadius: '8px',
                    padding: '16px',
                    marginTop: '20px',
                    color: '#15803d'
                  }}>
                    <p> Your exception request has been approved! Your grade will be calculated based on submitted logs.</p>
                  </div>
                )}
                
                {dashboardData.exception_status === 'rejected' && (
                  <div className="exception-status rejected" style={{
                    background: '#fee2e2',
                    border: '1px solid #fca5a5',
                    borderRadius: '8px',
                    padding: '16px',
                    marginTop: '20px',
                    color: '#b91c1c'
                  }}>
                    <p> Your exception request was rejected. Please contact your Academic supervisor to resolve missing logs.</p>
                  </div>
                )}
                
                {dashboardData.exception_status === 'pending' && (
                  <div className="exception-status pending" style={{
                    background: '#eff6ff',
                    border: '1px solid #3b82f6',
                    borderRadius: '8px',
                    padding: '16px',
                    marginTop: '20px',
                    color: '#1e40af'
                  }}>
                    <p>⏳ Your exception request is pending admin review. You will be notified once a decision is made.</p>
                  </div>
                )}
              </>
            )}

            {/*  LATE SUBMISSION APPROVED BANNER */}
            {dashboardData?.exception_status === 'late_approved' && (
              <div className="late-approved-banner" style={{
                background: '#d1fae5',
                border: '1px solid #10b981',
                borderRadius: '12px',
                padding: '16px 20px',
                marginTop: '20px',
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                flexWrap: 'wrap'
              }}>
                <span style={{ fontSize: '24px' }}></span>
                <div style={{ flex: 1 }}>
                  <strong style={{ color: '#065f46', fontSize: '16px' }}>Late Submission Approved!</strong>
                  <p style={{ color: '#065f46', margin: '4px 0 0 0', fontSize: '13px' }}>
                    Your request to submit missing logs has been approved by your workplace supervisor.
                    You can now submit your missing weekly logs for review.
                  </p>
                </div>
                <button 
                  onClick={() => setActiveTab("logs")}
                  style={{
                    background: '#10b981',
                    color: 'white',
                    border: 'none',
                    padding: '8px 16px',
                    borderRadius: '8px',
                    cursor: 'pointer',
                    fontWeight: '500'
                  }}
                >
                  Go to Weekly Logs →
                </button>
              </div>
            )}

            {/* Missing Weeks Info (when late_approved) */}
            {dashboardData?.exception_status === 'late_approved' && dashboardData?.placement && (() => {
              const missingWeeks = calculateMissingWeeks();
              return missingWeeks.length > 0 && (
                <div style={{
                  background: '#fef3c7',
                  border: '1px solid #f59e0b',
                  borderRadius: '12px',
                  padding: '12px 16px',
                  marginTop: '12px'
                }}>
                  <p style={{ margin: 0, color: '#92400e', fontSize: '14px' }}>
                    <strong> Missing weeks you can now submit:</strong> Week {missingWeeks.join(', ')}
                  </p>
                </div>
              );
            })()}

            {/* FINAL EVALUATION DISPLAY WITH CHECKBOX */}
            {dashboardData?.evaluation && (
              <>
                <div className="section-title">
                  <h2>Final Evaluation Results</h2>
                </div>
                <div className="evaluation-card" style={{
                  background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                  borderRadius: '20px',
                  padding: '24px',
                  color: 'white',
                  marginTop: '20px'
                }}>
                  <div className="evaluation-scores" style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
                    gap: '20px'
                  }}>
                    <div className="score-item" style={{
                      textAlign: 'center',
                      padding: '12px',
                      background: 'rgba(255, 255, 255, 0.15)',
                      borderRadius: '12px'
                    }}>
                      <span>Workplace Score (40%)</span>
                      <strong style={{ fontSize: '24px', display: 'block' }}>
                        {dashboardData.evaluation.workplace_score || "Pending"}
                      </strong>
                    </div>
                    <div className="score-item" style={{
                      textAlign: 'center',
                      padding: '12px',
                      background: 'rgba(255, 255, 255, 0.15)',
                      borderRadius: '12px'
                    }}>
                      <span>Academic Score (30%)</span>
                      <strong style={{ fontSize: '24px', display: 'block' }}>
                        {dashboardData.evaluation.academic_score || "Pending"}
                      </strong>
                    </div>
                    <div className="score-item" style={{
                      textAlign: 'center',
                      padding: '12px',
                      background: 'rgba(255, 255, 255, 0.15)',
                      borderRadius: '12px'
                    }}>
                      <span>Log Average (30%)</span>
                      <strong style={{ fontSize: '24px', display: 'block' }}>
                        {dashboardData.evaluation.log_avg_score || "Pending"}
                      </strong>
                    </div>
                    <div className="score-item total" style={{
                      textAlign: 'center',
                      padding: '12px',
                      background: 'rgba(255, 255, 255, 0.25)',
                      borderRadius: '12px'
                    }}>
                      <span>Final Score</span>
                      <strong style={{ fontSize: '28px', display: 'block' }}>
                        {dashboardData.evaluation.final_score || "Pending"}
                      </strong>
                    </div>
                    <div className="score-item grade" style={{
                      textAlign: 'center',
                      padding: '12px',
                      background: 'rgba(255, 255, 255, 0.15)',
                      borderRadius: '12px'
                    }}>
                      <span>Grade</span>
                      <strong style={{
                        fontSize: '32px',
                        background: '#fbbf24',
                        color: '#1e293b',
                        padding: '4px 16px',
                        borderRadius: '40px',
                        display: 'inline-block'
                      }}>
                        {dashboardData.evaluation.grade || "Pending"}
                      </strong>
                    </div>
                  </div>

                  {/* CHECKBOX TO CONFIRM VIEWING */}
                  <div style={{
                    marginTop: '24px',
                    paddingTop: '16px',
                    borderTop: '1px solid rgba(255,255,255,0.2)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                    flexWrap: 'wrap'
                  }}>
                    <input
                      type="checkbox"
                      id="confirmEvaluationView"
                      checked={dashboardData.evaluation.student_confirmed_view || false}
                      onChange={confirmEvaluationView}
                      disabled={dashboardData.evaluation.student_confirmed_view || confirmingView}
                      style={{
                        width: '18px',
                        height: '18px',
                        cursor: dashboardData.evaluation.student_confirmed_view ? 'not-allowed' : 'pointer'
                      }}
                    />
                    <label 
                      htmlFor="confirmEvaluationView" 
                      style={{ 
                        fontSize: '14px', 
                        cursor: dashboardData.evaluation.student_confirmed_view ? 'not-allowed' : 'pointer',
                        opacity: dashboardData.evaluation.student_confirmed_view ? 0.7 : 1
                      }}
                    >
                      {dashboardData.evaluation.student_confirmed_view 
                        ? " I have reviewed my evaluation results" 
                        : "I confirm that I have reviewed my evaluation results"}
                    </label>
                    
                    {confirmingView && (
                      <span style={{ fontSize: '12px', opacity: 0.8 }}>Confirming...</span>
                    )}
                  </div>

                  {/* Show when it was confirmed */}
                  {dashboardData.evaluation.student_confirmed_view_at && (
                    <div style={{
                      marginTop: '8px',
                      fontSize: '11px',
                      opacity: 0.7,
                      textAlign: 'right'
                    }}>
                      Confirmed on: {new Date(dashboardData.evaluation.student_confirmed_view_at).toLocaleString()}
                    </div>
                  )}
                </div>
              </>
            )}

            {/* Recent Logs Section */}
            <div className="section-title">
              <h2>Recent Weekly Logs</h2>
            </div>
            {dashboardData?.recent_logs?.length > 0 ? (
              <div className="logs-list">
                {dashboardData.recent_logs.slice(0, 5).map((log, idx) => (
                  <div key={idx} className="log-item">
                    <div className="log-header">
                      <strong>Week {log.week_number}</strong>
                      <span className={`status-badge ${log.status}`}>{log.status}</span>
                      {log.is_late && <span className="status-badge late">Late</span>}
                      <span className="log-date">Submitted: {new Date(log.submission_date).toLocaleDateString()}</span>
                    </div>
                    <p className="log-activities">{log.activities}</p>
                    {log.score && <div className="log-score">Score: {log.score}/100</div>}
                    {log.feedback && (
                      <div className="log-feedback" style={{
                        background: '#f0fdf4',
                        padding: '10px 12px',
                        borderRadius: '10px',
                        marginTop: '10px',
                        fontSize: '13px',
                        color: '#166534'
                      }}>
                        <strong>Feedback:</strong> {log.feedback}
                      </div>
                    )}
                    {log.late_reason && (
                      <div className="late-reason" style={{
                        marginTop: '8px',
                        padding: '8px 12px',
                        background: '#fffbeb',
                        borderLeft: '3px solid #f59e0b',
                        borderRadius: '6px',
                        fontSize: '12px',
                        color: '#92400e'
                      }}>
                        {log.late_reason}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <p>No logs yet. Submit your first weekly log.</p>
            )}

            {/*  EVALUATION HISTORY SECTION - Shows past completed placements */}
            {dashboardData?.evaluation_history && dashboardData.evaluation_history.length > 0 && (
              <>
                <div className="section-title">
                  <h2> Internship History</h2>
                </div>
                <div className="history-list">
                  {dashboardData.evaluation_history.map((history) => (
                    <div key={history.id} className="history-card" style={{
                      background: 'white',
                      borderRadius: '12px',
                      padding: '20px',
                      marginBottom: '16px',
                      border: '1px solid #e2e8f0',
                      boxShadow: '0 1px 3px rgba(0,0,0,0.05)'
                    }}>
                      <div style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        flexWrap: 'wrap',
                        marginBottom: '12px'
                      }}>
                        <h3 style={{ color: '#1f3c88', margin: 0 }}>{history.company_name}</h3>
                        <span className="status-badge completed" style={{
                          background: '#6b7280',
                          color: 'white',
                          padding: '4px 12px',
                          borderRadius: '20px',
                          fontSize: '12px'
                        }}>
                          Completed
                        </span>
                      </div>
                      
                      <p style={{ margin: '5px 0', fontSize: '13px', color: '#555' }}>
                         {history.start_date} → {history.end_date}
                      </p>
                      
                      {history.workplace_supervisor_name && (
                        <p style={{ margin: '5px 0', fontSize: '13px', color: '#555' }}>
                           Workplace Supervisor: {history.workplace_supervisor_name}
                        </p>
                      )}
                      
                      {history.academic_supervisor_name && (
                        <p style={{ margin: '5px 0', fontSize: '13px', color: '#555' }}>
                           Academic Supervisor: {history.academic_supervisor_name}
                        </p>
                      )}
                      
                      {/* Evaluation Results for this placement */}
                      {history.evaluation && (
                        <div style={{
                          marginTop: '15px',
                          background: '#f8fafc',
                          borderRadius: '10px',
                          padding: '15px',
                          border: '1px solid #e2e8f0'
                        }}>
                          <h4 style={{ margin: '0 0 10px 0', color: '#1f3c88', fontSize: '14px' }}>
                             Evaluation Results
                          </h4>
                          <div style={{
                            display: 'grid',
                            gridTemplateColumns: 'repeat(auto-fit, minmax(100px, 1fr))',
                            gap: '10px'
                          }}>
                            <div style={{ textAlign: 'center' }}>
                              <div style={{ fontSize: '11px', color: '#666' }}>Workplace</div>
                              <div style={{ fontSize: '18px', fontWeight: 'bold', color: '#1f3c88' }}>
                                {history.evaluation.workplace_score || '—'}
                              </div>
                            </div>
                            <div style={{ textAlign: 'center' }}>
                              <div style={{ fontSize: '11px', color: '#666' }}>Academic</div>
                              <div style={{ fontSize: '18px', fontWeight: 'bold', color: '#1f3c88' }}>
                                {history.evaluation.academic_score || '—'}
                              </div>
                            </div>
                            <div style={{ textAlign: 'center' }}>
                              <div style={{ fontSize: '11px', color: '#666' }}>Final Score</div>
                              <div style={{ fontSize: '18px', fontWeight: 'bold', color: '#1f3c88' }}>
                                {history.evaluation.final_score || '—'}
                              </div>
                            </div>
                            <div style={{ textAlign: 'center' }}>
                              <div style={{ fontSize: '11px', color: '#666' }}>Grade</div>
                              <div style={{
                                fontSize: '20px',
                                fontWeight: 'bold',
                                background: history.evaluation.grade === 'A' ? '#10b981' :
                                           history.evaluation.grade === 'B' ? '#3b82f6' :
                                           history.evaluation.grade === 'C' ? '#f59e0b' : '#ef4444',
                                color: 'white',
                                padding: '2px 12px',
                                borderRadius: '20px',
                                display: 'inline-block'
                              }}>
                                {history.evaluation.grade || '—'}
                              </div>
                            </div>
                          </div>
                          
                          {/* Show confirmation status */}
                          {history.evaluation.student_confirmed_view && (
                            <div style={{
                              marginTop: '10px',
                              fontSize: '11px',
                              color: '#10b981',
                              textAlign: 'right'
                            }}>
                               Viewed on {new Date(history.evaluation.student_confirmed_view_at).toLocaleDateString()}
                            </div>
                          )}
                        </div>
                      )}
                      
                      {/* Logs Summary for this placement */}
                      {history.logs && history.logs.length > 0 && (
                        <details style={{ marginTop: '15px' }}>
                          <summary style={{
                            cursor: 'pointer',
                            color: '#3b82f6',
                            fontSize: '13px',
                            fontWeight: '500'
                          }}>
                            📋 View Submitted Logs ({history.logs.length} weeks)
                          </summary>
                          <div style={{
                            marginTop: '10px',
                            maxHeight: '200px',
                            overflowY: 'auto'
                          }}>
                            <table style={{
                              width: '100%',
                              fontSize: '12px',
                              borderCollapse: 'collapse'
                            }}>
                              <thead>
                                <tr style={{ background: '#f1f5f9' }}>
                                  <th style={{ padding: '8px', textAlign: 'left' }}>Week</th>
                                  <th style={{ padding: '8px', textAlign: 'left' }}>Status</th>
                                  <th style={{ padding: '8px', textAlign: 'left' }}>Score</th>
                                  <th style={{ padding: '8px', textAlign: 'left' }}>Feedback</th>
                                </tr>
                              </thead>
                              <tbody>
                                {history.logs.map((log, idx) => (
                                  <tr key={idx} style={{ borderBottom: '1px solid #e2e8f0' }}>
                                    <td style={{ padding: '6px 8px' }}>Week {log.week_number}</td>
                                    <td style={{ padding: '6px 8px' }}>
                                      <span className={`status-badge ${log.status}`} style={{ fontSize: '10px' }}>
                                        {log.status}
                                      </span>
                                    </td>
                                    <td style={{ padding: '6px 8px' }}>{log.score || '—'}/100</td>
                                    <td style={{ padding: '6px 8px' }}>{log.feedback || '—'}</td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        </details>
                      )}
                    </div>
                  ))}
                </div>
              </>
            )}

          </div>
        )}

        {activeTab === "placement" && (
          <StudentPlacement
            studentId={user?.student_id || ""}
            approvedCompanies={approvedCompanies}
            selectedCompanyId={selectedCompanyId}
            newCompanyName={newCompanyName}
            onCompanyChange={(e) => setSelectedCompanyId(e.target.value)}
            onNewCompanyChange={(e) => setNewCompanyName(e.target.value)}
            onSubmit={applyForPlacement}
          />
        )}

        {activeTab === "logs" && (
          <StudentLogs
            recentLogs={dashboardData?.recent_logs}
            onSubmit={submitWeeklyLog}
          />
        )}
      </div>

      {showExceptionModal && (
        <ExceptionRequestModal
          onClose={() => setShowExceptionModal(false)}
          onComplete={handleExceptionComplete}
        />
      )}
    </div>
  );
}