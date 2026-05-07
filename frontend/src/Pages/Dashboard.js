import { useEffect, useState } from "react";
import axios from "axios";
import "./Dashboard.css";
import AssignSupervisorModal from "./AssignSupervisorModal";
import ReviewLogModal from "./ReviewLogModal";
import EvaluationModal from "./EvaluationModal";
import ExceptionRequestModal from "./ExceptionRequestModal";
import StaffApprovals from "./StaffApprovals";
import Applications from "./Applications";
import PendingCompanies from "./PendingCompanies";
import ExceptionRequests from "./ExceptionRequests";
import StudentPlacement from "./StudentPlacement";
import StudentLogs from "./StudentLogs";
import SupervisorStudents from "./SupervisorStudents";
import SupervisorPendingLogs from "./SupervisorPendingLogs";
import API_URL from '../utils/api';
export default function Dashboard() {
  const [user, setUser] = useState(null);
  const [dashboardData, setDashboardData] = useState(null);
  const [pendingStaff, setPendingStaff] = useState([]);
  const [pendingApplications, setPendingApplications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("dashboard");
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [selectedPlacement, setSelectedPlacement] = useState(null);
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [selectedLog, setSelectedLog] = useState(null);
  const [showEvaluationModal, setShowEvaluationModal] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [viewLogsStudent, setViewLogsStudent] = useState(null);
  const [studentLogs, setStudentLogs] = useState([]);
  const [loadingLogs, setLoadingLogs] = useState(false);
  const [showExceptionModal, setShowExceptionModal] = useState(false);
  const [exceptionRequests, setExceptionRequests] = useState([]);
  const [loadingExceptions, setLoadingExceptions] = useState(false);
  const [pendingCompanies, setPendingCompanies] = useState([]);
  const [loadingCompanies, setLoadingCompanies] = useState(false);
  const [approvedCompanies, setApprovedCompanies] = useState([]);
  const [selectedCompanyId, setSelectedCompanyId] = useState("");
  const [newCompanyName, setNewCompanyName] = useState("");

  
  const getToken = () => localStorage.getItem("access");

  const openAssignModal = (placement) => {
    setSelectedPlacement(placement);
    setShowAssignModal(true);
  };

  const openReviewModal = (log) => {
    setSelectedLog(log);
    setShowReviewModal(true);
  };

  const openEvaluationModal = (placementId, studentName) => {
    setSelectedStudent({ id: placementId, name: studentName });
    setShowEvaluationModal(true);
  };

  const openExceptionModal = () => {
    setShowExceptionModal(true);
  };

  const fetchPendingCompanies = async () => {
    setLoadingCompanies(true);
    try {
      const token = getToken();
      const response = await axios.get(`${API_URL}/api/admin/pending-companies/`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setPendingCompanies(response.data);
    } catch (error) {
      console.error("Error fetching pending companies:", error);
    } finally {
      setLoadingCompanies(false);
    }
  };

  const approveCompany = async (companyId) => {
    try {
      const token = getToken();
      await axios.post(`${API_URL}/api/admin/approve-company/${companyId}/`, 
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );
      alert("Company approved! Workplace supervisor can now login.");
      fetchPendingCompanies();
    } catch (error) {
      console.error("Error approving company:", error);
      alert(error.response?.data?.message || "Failed to approve company");
    }
  };

  const rejectCompany = async (companyId) => {
    const reason = prompt("Please provide a rejection reason (will be shown to the user):");
    if (!reason) return;
    
    try {
      const token = getToken();
      await axios.post(`${API_URL}/api/admin/reject-company/${companyId}/`,
        { reason: reason },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      alert("Company rejected and removed!");
      fetchPendingCompanies();
    } catch (error) {
      console.error("Error rejecting company:", error);
      alert(error.response?.data?.message || "Failed to reject company");
    }
  };

  const fetchExceptionRequests = async () => {
    setLoadingExceptions(true);
    try {
      const token = getToken();
      const response = await axios.get(`${API_URL}/api/admin/pending-exceptions/`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const mappedData = response.data.map(item => ({
        id: item.id,
        student_name: item.student_name,
        student_id: item.student_id,
        company_name: item.company_name,
        exception_status: item.exception_status,
        status: item.exception_status,
        exception_reason: item.exception_reason,
        reason: item.exception_reason,
        created_at: item.created_at,
        missing_weeks: item.missing_weeks || [],
        submitted_weeks: item.submitted_weeks || []
      }));
      setExceptionRequests(mappedData);
    } catch (error) {
      console.error("Error fetching exception requests:", error);
    } finally {
      setLoadingExceptions(false);
    }
  };

  const approveExceptionRequest = async (requestId) => {
    try {
      const token = getToken();
      await axios.post(`${API_URL}/api/admin/approve-exception/${requestId}/`, 
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );
      alert("Exception request approved! Student will be notified.");
      fetchExceptionRequests();
    } catch (error) {
      console.error("Error approvng request:", error);
      alert(error.response?.data?.message || "Failed to approve request");
    }
  };

  const rejectExceptionRequest = async (requestId) => {
    const reason = prompt("Please provide a rejection reason (will be shown to student):");
    if (!reason) return;
    
    try {
      const token = getToken();
      await axios.post(`${API_URL}/api/admin/reject-exception/${requestId}/`,
        { reason: reason },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      alert("Exception request rejected!");
      fetchExceptionRequests();
    } catch (error) {
      console.error("Error rejecting request:", error);
      alert(error.response?.data?.message || "Failed to reject request");
    }
  };

  const viewStudentLogs = async (studentId, studentName) => {
    setViewLogsStudent({ id: studentId, name: studentName });
    setLoadingLogs(true);
    setActiveTab("viewLogs");
    
    try {
      const token = getToken();
      const response = await axios.get(`${API_URL}/logs/?placement__student=${studentId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setStudentLogs(response.data);
    } catch (error) {
      console.error("Error fetching student logs:", error);
      setStudentLogs([]);
    } finally {
      setLoadingLogs(false);
    }
  };

  const applyForPlacement = async (e) => {
    e.preventDefault();
    
    const start_date = document.getElementById("start_date").value;
    const end_date = document.getElementById("end_date").value;
    const student_id = user?.student_id;
    
    if (!student_id) {
      alert("Student ID not found. Please update your profle.");
      return;
    }
    
    let company_name = "";
    if (selectedCompanyId) {
      const selectedCompany = approvedCompanies.find(c => c.id === parseInt(selectedCompanyId));
      company_name = selectedCompany?.name || "";
    } else if (newCompanyName) {
      company_name = newCompanyName;
    } else {
      alert("Please select a company or enter a new company name");
      return;
    }
    
    if (!company_name) {
      alert("Please provide a company name");
      return;
    }
    
    try {
      const token = getToken();
      const response = await axios.post(
        `${API_URL}/api/placements/apply/`,
        {
          student_id: student_id,
          company_name: company_name,
          start_date: start_date,
          end_date: end_date
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      if (response.status === 201 || response.status === 200) {
        alert("Placement application submtted successfully!");
        const dashboardRes = await axios.get(`${API_URL}/api/student/dashboard/`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        setDashboardData(dashboardRes.data);
        setActiveTab("dashboard");
        
        setSelectedCompanyId("");
        setNewCompanyName("");
        document.getElementById("start_date").value = "";
        document.getElementById("end_date").value = "";
      }
    } catch (error) {
      console.error("Error applying for placement:", error);
      if (error.response?.data) {
        alert(error.response.data.error || error.response.data.message || "Application failed");
      } else {
        alert("Failed to submit application. Please try again.");
      }
    }
  };

  const submitWeeklyLog = async (e) => {
    e.preventDefault();
    
    const week_number = document.getElementById("week_number").value;
    const activities = document.getElementById("activities").value;
    const challenges = document.getElementById("challenges").value;
    const working_hours = document.getElementById("working_hours")?.value || 0;
    const attachment = document.getElementById("attachment")?.files[0];
    
    const placementId = dashboardData?.placement?.id;
    
    if (!placementId) {
      alert("No approved placement found. Please wat for admin approval.");
      return;
    }
    
    const formData = new FormData();
    formData.append("placement", placementId);
    formData.append("week_number", parseInt(week_number));
    formData.append("activities", activities);
    formData.append("challenges", challenges);
    formData.append("working_hours", parseFloat(working_hours));
    if (attachment) {
      formData.append("attachment", attachment);
    }
    
    try {
      const token = getToken();
      const response = await axios.post(
        `${API_URL}/api/student/logs/`,
        formData,
        { 
          headers: { 
            Authorization: `Bearer ${token}`,
            'Content-Type': 'multipart/form-data'
          } 
        }
      );
      
      if (response.status === 201 || response.status === 200) {
        alert("Weekly log submitted successfully!");
        const dashboardRes = await axios.get(`${API_URL}/api/student/dashboard/`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        setDashboardData(dashboardRes.data);
        document.getElementById("week_number").value = "";
        document.getElementById("activities").value = "";
        document.getElementById("challenges").value = "";
        if (document.getElementById("working_hours")) {
          document.getElementById("working_hours").value = "";
        }
        if (document.getElementById("attachment")) {
          document.getElementById("attachment").value = "";
        }
      }
    } catch (error) {
      console.error("Error submitting log:", error);
      if (error.response?.data) {
        alert(error.response.data.error || "Failed to submit log");
      } else {
        alert("Failed to submt log. Please try again.");
      }
    }
  };

  const handleCompanyChange = (e) => {
    setSelectedCompanyId(e.target.value);
    setNewCompanyName("");
  };

  const handleNewCompanyChange = (e) => {
    setNewCompanyName(e.target.value);
    setSelectedCompanyId("");
  };

  useEffect(() => {
    const fetchUserAndDashboard = async () => {
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

        const role = userRes.data.user.role;
        
        if (role === "admin") {
          const adminRes = await axios.get(`${API_URL}/api/admin/dashboard/`, {
            headers: { Authorization: `Bearer ${token}` }
          });
          setDashboardData(adminRes.data);
          
          const staffRes = await axios.get(`${API_URL}/users/pending_staff/`, {
            headers: { Authorization: `Bearer ${token}` }
          });
          setPendingStaff(staffRes.data);
          
          const appsRes = await axios.get(`${API_URL}/placements/pending/`, {
            headers: { Authorization: `Bearer ${token}` }
          });
          setPendingApplications(appsRes.data);
          
        } else if (role === "student") {
          const studentRes = await axios.get(`${API_URL}/api/student/dashboard/`, {
            headers: { Authorization: `Bearer ${token}` }
          });
          setDashboardData(studentRes.data);
          
        } else if (role === "workplace" || role === "academic") {
          const supervisorRes = await axios.get(`${API_URL}/api/supervisor/dashboard/`, {
            headers: { Authorization: `Bearer ${token}` }
          });
          setDashboardData(supervisorRes.data);
        }
        
      } catch (error) {
        console.error("Error fetching data:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchUserAndDashboard();
  }, []);

  useEffect(() => {
    const fetchApprovedCompanies = async () => {
      try {
        const response = await axios.get(`${API_URL}/api/companies/approved/`);
        setApprovedCompanies(response.data);
      } catch (error) {
        console.error("Error fetching approved companies:", error);
      }
    };
    fetchApprovedCompanies();
  }, []);

  const approveStaff = async (staffObj) => {
    const token = getToken();
    const userId = staffObj.id || staffObj.user_id || staffObj.pk || staffObj.userId;
    
    if (!userId) {
      alert("Error: Could not find user ID for this staff member");
      return;
    }
    
    try {
      await axios.post(`${API_URL}/users/approve_staff/`, 
        { user_id: userId, approve: true },
        { headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' } }
      );
      const staffRes = await axios.get(`${API_URL}/users/pending_staff/`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setPendingStaff(staffRes.data);
      alert("Staff approved successfully!");
    } catch (error) {
      console.error("Error approving staff:", error);
      alert("Failed to approve staff");
    }
  };

  const rejectStaff = async (staffObj) => {
    const token = getToken();
    const userId = staffObj.id || staffObj.user_id;
    
    if (!userId) {
      alert("Error: Could not fid user ID for this staff member");
      return;
    }
    
    try {
      await axios.post(`${API_URL}/users/approve_staff/`, 
        { user_id: userId, approve: false },
        { headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' } }
      );
      const staffRes = await axios.get(`${API_URL}/users/pending_staff/`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setPendingStaff(staffRes.data);
      alert("Staff rejected!");
    } catch (error) {
      console.error("Error rejecting staff:", error);
      alert("Failed to reject staff");
    }
  };

  const logout = () => {
    localStorage.removeItem("access");
    localStorage.removeItem("refresh");
    window.location.href = "/login";
  };

  if (loading) {
    return <div className="loading-container">Loading dashboard...</div>;
  }

  const role = user?.role;
  const isStudent = role === "student";
  const isSupervisor = role === "workplace" || role === "academic";
  const isAdmin = role === "admin";

  return (
    <div className="dashboard-container">
      <div className="sidebar">
        <h2>ILES System</h2>
        <div className="user-info">
          <p><strong>{user?.first_name} {user?.last_name}</strong></p>
          <p className="role-badge">{role}</p>
        </div>
        <nav className="sidebar-nav">
          <button className={activeTab === "dashboard" ? "active" : ""} onClick={() => setActiveTab("dashboard")}>
            Dashboard
          </button>
          
          {isStudent && (
            <>
              <button className={activeTab === "placement" ? "active" : ""} onClick={() => setActiveTab("placement")}>
                Placement
              </button>
              <button className={activeTab === "logs" ? "active" : ""} onClick={() => setActiveTab("logs")}>
                Weekly Logs
              </button>
            </>
          )}

          {isSupervisor && (
            <>
              <button className={activeTab === "students" ? "active" : ""} onClick={() => setActiveTab("students")}>
                Assigned Students
              </button>
              <button className={activeTab === "pending" ? "active" : ""} onClick={() => setActiveTab("pending")}>
                Pending Logs
              </button>
            </>
          )}

          {isAdmin && (
            <>
              <button className={activeTab === "staff" ? "active" : ""} onClick={() => setActiveTab("staff")}>
                Staff Approvals
                {pendingStaff.length > 0 && (
                  <span className="notification-badge">{pendingStaff.length}</span>
                )}
              </button>
              <button className={activeTab === "applications" ? "active" : ""} onClick={() => setActiveTab("applications")}>
                Applications
                {pendingApplications.length > 0 && (
                  <span className="notification-badge">{pendingApplications.length}</span>
                )}
              </button>
              <button 
                className={activeTab === "exceptions" ? "active" : ""} 
                onClick={() => {
                  setActiveTab("exceptions");
                  fetchExceptionRequests();
                }}
              >
                Exception Requests
                {exceptionRequests.filter(r => r.status === 'pending').length > 0 && (
                  <span className="notification-badge">
                    {exceptionRequests.filter(r => r.status === 'pending').length}
                  </span>
                )}
              </button>
              <button 
                className={activeTab === "pending_companies" ? "active" : ""} 
                onClick={() => {
                  setActiveTab("pending_companies");
                  fetchPendingCompanies();
                }}
              >
                Pending Companies
                {pendingCompanies.length > 0 && (
                  <span className="notification-badge">
                    {pendingCompanies.length}
                  </span>
                )}
              </button>
              <button className={activeTab === "reports" ? "active" : ""} onClick={() => setActiveTab("reports")}>
                Reports
              </button>
            </>
          )}

          {activeTab === "viewLogs" && viewLogsStudent && (
            <button className="active" onClick={() => {}}>
              Logs: {viewLogsStudent.name}
            </button>
          )}

          <button onClick={logout} className="logout-btn">Logout</button>
        </nav>
      </div>

      <div className="main-content">
        {/* ADMIN DASHBOARD */}
        {isAdmin && activeTab === "dashboard" && (
          <div>
            <h1>Admin Dashboard</h1>
            <div className="dashboard-cards">
              <div className="card">
                <h3>Total Students</h3>
                <p>{dashboardData?.total_students || 0}</p>
              </div>
              <div className="card">
                <h3>Total Supervisors</h3>
                <p>{dashboardData?.total_supervisors || 0}</p>
              </div>
              <div className="card">
                <h3>Pending Applications</h3>
                <p>{dashboardData?.pending_applications || 0}</p>
              </div>
              <div className="card">
                <h3>Active Internships</h3>
                <p>{dashboardData?.active_internships || 0}</p>
              </div>
            </div>
          </div>
        )}

        {/* ADMIN - STAFF APPROVALS */}
        {isAdmin && activeTab === "staff" && (
          <StaffApprovals 
            pendingStaff={pendingStaff} 
            onApprove={approveStaff} 
            onReject={rejectStaff} 
          />
        )}

        {/* ADMIN - PENDING APPLICATIONS */}
        {isAdmin && activeTab === "applications" && (
          <Applications 
            pendingApplications={pendingApplications} 
            onAssign={openAssignModal} 
          />
        )}

        {/* ADMIN - PENDING COMPANIES */}
        {isAdmin && activeTab === "pending_companies" && (
          <PendingCompanies
            pendingCompanies={pendingCompanies}
            loadingCompanies={loadingCompanies}
            onApprove={approveCompany}
            onReject={rejectCompany}
          />
        )}

        {/* ADMIN - EXCEPTION REQUESTS */}
        {isAdmin && activeTab === "exceptions" && (
          <ExceptionRequests
            exceptionRequests={exceptionRequests}
            loadingExceptions={loadingExceptions}
            onApprove={approveExceptionRequest}
            onReject={rejectExceptionRequest}
          />
        )}

        {/* ADMIN - REPORTS */}
        {isAdmin && activeTab === "reports" && (
          <div>
            <h1>System Reports</h1>
            <p>Reports and analytics will go here</p>
          </div>
        )}

        {/* STUDENT DASHBOARD */}
        {isStudent && activeTab === "dashboard" && (
          <div>
            <h1>Student Dashboard</h1>
            <div className="dashboard-cards">
              <div className="card">
                <h3>Student ID</h3>
                <p>{user?.student_id || "Not set"}</p>
              </div>
              <div className="card">
                <h3>Department</h3>
                <p>{user?.department_name || "Not set"}</p>
              </div>
              <div className="card">
                <h3>Email</h3>
                <p>{user?.email || "Not set"}</p>
              </div>
            </div>

            <div className="section-title">
              <h2>Internship Placement</h2>
            </div>
            {dashboardData?.placement ? (
              <div className="placement-info">
                <div className="placement-details">
                  <div className="detail-row">
                    <span className="detail-label">Company:</span>
                    <span className="detail-value">{dashboardData.placement.company_name}</span>
                  </div>
                  <div className="detail-row">
                    <span className="detail-label">Status:</span>
                    <span className={`status-badge ${dashboardData.placement.status}`}>
                      {dashboardData.placement.status}
                    </span>
                  </div>
                  <div className="detail-row">
                    <span className="detail-label">Start Date:</span>
                    <span className="detail-value">{dashboardData.placement.start_date}</span>
                  </div>
                  <div className="detail-row">
                    <span className="detail-label">End Date:</span>
                    <span className="detail-value">{dashboardData.placement.end_date}</span>
                  </div>
                  <div className="detail-row">
                    <span className="detail-label">Workplace Supervisor:</span>
                    <span className="detail-value">{dashboardData.placement.workplace_supervisor_name || "Not assigned yet"}</span>
                  </div>
                  <div className="detail-row">
                    <span className="detail-label">Academic Supervisor:</span>
                    <span className="detail-value">{dashboardData.placement.academic_supervisor_name || "Not assigned yet"}</span>
                  </div>
                </div>
              </div>
            ) : (
              <div className="empty-placement">
                <p>No placement yet. <button onClick={() => setActiveTab("placement")}>Apply now</button></p>
              </div>
            )}

            <div className="section-title">
              <h2>Recent Weekly Logs</h2>
            </div>
            {dashboardData?.recent_logs?.length > 0 ? (
              <div className="logs-list">
                {dashboardData.recent_logs.map((log, idx) => (
                  <div key={idx} className="log-item">
                    <div className="log-header">
                      <strong>Week {log.week_number}</strong>
                      <span className={`status-badge ${log.status}`}>{log.status}</span>
                      {log.is_late && <span className="status-badge late">Late</span>}
                      <span className="log-date">Submitted: {new Date(log.submission_date).toLocaleDateString()}</span>
                    </div>
                    <p className="log-activities">{log.activities}</p>
                    {log.score && <div className="log-score">Score: {log.score}/100</div>}
                    {log.feedback && <div className="log-feedback">Feedback: {log.feedback}</div>}
                    {log.late_reason && <div className="late-reason">{log.late_reason}</div>}
                  </div>
                ))}
              </div>
            ) : (
              <p>No logs yet. Submit your first weekly log.</p>
            )}

            {dashboardData?.can_request_exception && (
              <div className="exception-request">
                <p>You have missing weekly logs. The system cannot calculate your final grade.</p>
                <button className="exception-btn" onClick={openExceptionModal}>
                  Request Exception for Missing Logs
                </button>
              </div>
            )}

            {dashboardData?.exception_status && dashboardData.exception_status !== 'pending' && (
              <div className={`exception-status ${dashboardData.exception_status}`}>
                {dashboardData.exception_status === 'approved' ? (
                  <p>Your exception request has been approved. Your grade will be calculated based on submitted logs.</p>
                ) : dashboardData.exception_status === 'rejected' ? (
                  <p>Your exception request was rejected. Please contact your supervisor to resolve missing logs.</p>
                ) : null}
              </div>
            )}

            {dashboardData?.exception_status === 'pending' && (
              <div className="exception-status pending">
                <p>Your exception request is pending admin review. You will be notified once a decision is made.</p>
              </div>
            )}

            {dashboardData?.evaluation && (
              <>
                <div className="section-title">
                  <h2>Final Evaluation</h2>
                </div>
                <div className="evaluation-card">
                  <div className="evaluation-scores">
                    <div className="score-item">
                      <span>Workplace Score (40%)</span>
                      <strong>{dashboardData.evaluation.workplace_score || "Pending"}</strong>
                    </div>
                    <div className="score-item">
                      <span>Academic Score (30%)</span>
                      <strong>{dashboardData.evaluation.academic_score || "Pending"}</strong>
                    </div>
                    <div className="score-item">
                      <span>Log Average (30%)</span>
                      <strong>{dashboardData.evaluation.log_avg_score || "Pending"}</strong>
                    </div>
                    <div className="score-item total">
                      <span>Final Score</span>
                      <strong>{dashboardData.evaluation.final_score || "Pending"}</strong>
                    </div>
                    <div className="score-item grade">
                      <span>Grade</span>
                      <strong className="grade-value">{dashboardData.evaluation.grade || "Pending"}</strong>
                    </div>
                  </div>
                </div>
              </>
            )}
          </div>
        )}

        {/* STUDENT - APPLY FOR PLACEMENT */}
        {isStudent && activeTab === "placement" && (
          <StudentPlacement
            studentId={user?.student_id || ""}
            approvedCompanies={approvedCompanies}
            selectedCompanyId={selectedCompanyId}
            newCompanyName={newCompanyName}
            onCompanyChange={handleCompanyChange}
            onNewCompanyChange={handleNewCompanyChange}
            onSubmit={applyForPlacement}
          />
        )}

        {/* STUDENT - WEEKLY LOGS */}
        {isStudent && activeTab === "logs" && (
          <StudentLogs 
            recentLogs={dashboardData?.recent_logs} 
            onSubmit={submitWeeklyLog} 
          />
        )}

        {/* SUPERVISOR DASHBOARD */}
        {isSupervisor && activeTab === "dashboard" && (
          <div>
            <h1>Supervisor Dashboard</h1>
            <div className="dashboard-cards">
              <div className="card">
                <h3>Assigned Students</h3>
                <p>{dashboardData?.assigned_students?.length || 0}</p>
              </div>
              <div className="card">
                <h3>Pending Reviews</h3>
                <p>{dashboardData?.pending_reviews?.length || 0}</p>
              </div>
            </div>
          </div>
        )}

        {/* SUPERVISOR ASSIGNED STUDENTS */}
        {isSupervisor && activeTab === "students" && (
          <SupervisorStudents
            assignedStudents={dashboardData?.assigned_students}
            role={role}
            onViewLogs={viewStudentLogs}
            onEvaluate={openEvaluationModal}
          />
        )}

        {/* SUPERVISOR PENDING LOGS */}
        {isSupervisor && activeTab === "pending" && (
          <SupervisorPendingLogs
            pendingReviews={dashboardData?.pending_reviews}
            onReview={openReviewModal}
          />
        )}

        {/* VIEW STUDENT LOGS */}
        {isSupervisor && activeTab === "viewLogs" && viewLogsStudent && (
          <div>
            <h1>Weekly Logs - {viewLogsStudent.name}</h1>
            <button className="back-btn" onClick={() => setActiveTab("students")}>
              Back to Students
            </button>
            
            {loadingLogs ? (
              <p>Loading logs...</p>
            ) : studentLogs.length > 0 ? (
              <div className="logs-list">
                {studentLogs.map((log) => (
                  <div key={log.id} className="log-item readonly-log">
                    <div className="log-header">
                      <strong>Week {log.week_number}</strong>
                      <span className={`status-badge ${log.status}`}>{log.status}</span>
                      {log.is_late && <span className="status-badge late">Late</span>}
                    </div>
                    <p><strong>Activities:</strong> {log.activities}</p>
                    {log.challenges && <p><strong>Challenges:</strong> {log.challenges}</p>}
                    {log.feedback && <p><strong>Feedback:</strong> {log.feedback}</p>}
                    {log.score && <p><strong>Score:</strong> {log.score}/100</p>}
                    {log.working_hours && <p><strong>Hours:</strong> {log.working_hours}</p>}
                    {log.attachment && (
                      <p><strong>Attachment:</strong> <a href={log.attachment} target="_blank" rel="noopener noreferrer">Download</a></p>
                    )}
                    <p className="log-date">Submitted: {new Date(log.submission_date).toLocaleDateString()}</p>
                    {log.late_reason && <div className="late-reason">{log.late_reason}</div>}
                  </div>
                ))}
              </div>
            ) : (
              <p>No logs submitted yet.</p>
            )}
          </div>
        )}
      </div>

      {/* Modals */}
      {showAssignModal && (
        <AssignSupervisorModal
          placement={{
            ...selectedPlacement,
            student_department: selectedPlacement?.student_department || user?.department_name
          }}
          onClose={() => setShowAssignModal(false)}
          onAssign={() => {
            const refreshApplications = async () => {
              const token = getToken();
              const appsRes = await axios.get(`${API_URL}/placements/pending/`, {
                headers: { Authorization: `Bearer ${token}` }
              });
              setPendingApplications(appsRes.data);
            };
            refreshApplications();
            setShowAssignModal(false);
          }}
        />
      )}

      {showReviewModal && (
        <ReviewLogModal
          log={selectedLog}
          onClose={() => setShowReviewModal(false)}
          onReviewComplete={() => {
            const refreshDashboard = async () => {
              const token = getToken();
              const supervisorRes = await axios.get(`${API_URL}/api/supervisor/dashboard/`, {
                headers: { Authorization: `Bearer ${token}` }
              });
              setDashboardData(supervisorRes.data);
            };
            refreshDashboard();
            setShowReviewModal(false);
          }}
        />
      )}

      {showEvaluationModal && (
        <EvaluationModal
          student={selectedStudent}
          role={role}
          onClose={() => setShowEvaluationModal(false)}
          onComplete={() => {
            const refreshDashboard = async () => {
              const token = getToken();
              const supervisorRes = await axios.get(`${API_URL}/api/supervisor/dashboard/`, {
                headers: { Authorization: `Bearer ${token}` }
              });
              setDashboardData(supervisorRes.data);
            };
            refreshDashboard();
            setShowEvaluationModal(false);
          }}
        />
      )}

      {showExceptionModal && (
        <ExceptionRequestModal
          onClose={() => setShowExceptionModal(false)}
          onComplete={() => {
            const refreshDashboard = async () => {
              const token = getToken();
              const dashboardRes = await axios.get(`${API_URL}/api/student/dashboard/`, {
                headers: { Authorization: `Bearer ${token}` }
              });
              setDashboardData(dashboardRes.data);
            };
            refreshDashboard();
            setShowExceptionModal(false);
          }}
        />
      )}
    </div>
  );
}