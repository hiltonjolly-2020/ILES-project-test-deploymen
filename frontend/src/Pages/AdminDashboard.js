import { useEffect, useState } from "react";
import axios from "axios";
import "./AdminDashboard.css";
import notifications from "../utils/notifications";
import PendingApproval from "./PendingApproval";
import Notifications from "./Notifications";
import API_URL from '../utils/api';
import StaffApprovals from "./StaffApprovals";
import Applications from "./Applications";
import PendingCompanies from "./PendingCompanies";
import ExceptionRequests from "./ExceptionRequests";
import AssignSupervisorModal from "./AssignSupervisorModal";

export default function AdminDashboard({ user }) {
  const [activeTab, setActiveTab] = useState("dashboard");
  const [dashboardData, setDashboardData] = useState({});
  const [pendingStaff, setPendingStaff] = useState([]);
  const [pendingApplications, setPendingApplications] = useState([]);
  const [pendingCompanies, setPendingCompanies] = useState([]);
  const [exceptionRequests, setExceptionRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [selectedPlacement, setSelectedPlacement] = useState(null);
  const [currentUser, setCurrentUser] = useState(null);
  const [isApproved, setIsApproved] = useState(true);
  
  const [departmentStudents, setDepartmentStudents] = useState([]);
  const [departmentSupervisors, setDepartmentSupervisors] = useState([]);
  const [studentSearch, setStudentSearch] = useState("");
  const [supervisorSearch, setSupervisorSearch] = useState("");
  const [studentFilter, setStudentFilter] = useState("all");

  const getToken = () => localStorage.getItem("access");

  const handleLogout = () => {
    localStorage.removeItem("access");
    localStorage.removeItem("refresh");
    notifications.notifyInfo("Logged out successfully");
    window.location.href = "/login";
  };

  useEffect(() => {
    const checkAdminApproval = async () => {
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
        setCurrentUser(userData);
        
        const approved = userData.is_approved !== false;
        setIsApproved(approved);
        
        if (approved) {
          await fetchAllAdminData();
          await fetchDepartmentStudents();
          await fetchDepartmentSupervisors();
        } else {
          setLoading(false);
        }
      } catch (error) {
        console.error("Error checking admin approval:", error);
        if (error.response?.status === 401) {
          localStorage.removeItem("access");
          localStorage.removeItem("refresh");
          window.location.href = "/login";
        }
        setLoading(false);
      }
    };

    checkAdminApproval();
  }, []);

  const fetchAllAdminData = async () => {
    try {
      const token = getToken();

      const [dashboardRes, staffRes, applicationsRes, companiesRes, exceptionsRes] =
        await Promise.all([
          axios.get(`${API_URL}/api/admin/dashboard/`, {
            headers: { Authorization: `Bearer ${token}` },
          }),
          axios.get(`${API_URL}/users/pending_staff/`, {
            headers: { Authorization: `Bearer ${token}` },
          }),
          axios.get(`${API_URL}/placements/pending/`, {
            headers: { Authorization: `Bearer ${token}` },
          }),
          axios.get(`${API_URL}/api/admin/pending-companies/`, {
            headers: { Authorization: `Bearer ${token}` },
          }),
          axios.get(`${API_URL}/api/admin/pending-exceptions/`, {
            headers: { Authorization: `Bearer ${token}` },
          }),
        ]);

      setDashboardData(dashboardRes.data);
      setPendingStaff(staffRes.data);
      setPendingApplications(applicationsRes.data);
      setPendingCompanies(companiesRes.data);
      setExceptionRequests(exceptionsRes.data);
    } catch (error) {
      console.error("Admin dashboard load error:", error);
      notifications.notifyError("Failed to load admin dashboard");
    } finally {
      setLoading(false);
    }
  };

  const fetchDepartmentStudents = async () => {
    try {
      const token = getToken();
      const response = await axios.get(`${API_URL}/api/admin/department-students/`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setDepartmentStudents(response.data);
    } catch (error) {
      console.error("Error fetching department students:", error);
      notifications.notifyError("Failed to load department students");
    }
  };

  const fetchDepartmentSupervisors = async () => {
    try {
      const token = getToken();
      const response = await axios.get(`${API_URL}/api/admin/department-supervisors/`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setDepartmentSupervisors(response.data);
    } catch (error) {
      console.error("Error fetching department supervisors:", error);
      notifications.notifyError("Failed to load department supervisors");
    }
  };

  const approveStaff = async (staff) => {
    try {
      const token = getToken();
      await axios.post(
        `${API_URL}/api/approve-staff/`,
        { user_id: staff.id, approve: true },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      notifications.notifySuccess(`Staff ${staff.username} approved`);
      
      // Remove from list and refresh data
      setPendingStaff(prev => prev.filter(s => s.id !== staff.id));
      await fetchAllAdminData();
      
    } catch (error) {
      console.error(error);
      notifications.notifyError(error.response?.data?.error || "Failed to approve staff");
    }
  };

  const rejectStaff = async (staff) => {
    try {
      const token = getToken();
      await axios.post(
        `${API_URL}/api/approve-staff/`,
        { user_id: staff.id, approve: false },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      notifications.notifyInfo(`Staff ${staff.username} rejected`);
      
      // Remove from list and refresh data
      setPendingStaff(prev => prev.filter(s => s.id !== staff.id));
      await fetchAllAdminData();
      
    } catch (error) {
      console.error(error);
      notifications.notifyError(error.response?.data?.error || "Failed to reject staff");
    }
  };

  const approveCompany = async (id) => {
    try {
      const token = getToken();
      await axios.post(
        `${API_URL}/api/admin/approve-company/${id}/`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );
      notifications.notifySuccess("Company approved");
      
      // Remove from list and refresh data
      setPendingCompanies(prev => prev.filter(c => c.id !== id));
      await fetchAllAdminData();
      
    } catch (error) {
      console.error(error);
      notifications.notifyError("Failed to approve company");
    }
  };

  const rejectCompany = async (id) => {
    try {
      const token = getToken();
      await axios.post(
        `${API_URL}/api/admin/reject-company/${id}/`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );
      notifications.notifyInfo("Company rejected");
      
      // Remove from list and refresh data
      setPendingCompanies(prev => prev.filter(c => c.id !== id));
      await fetchAllAdminData();
      
    } catch (error) {
      console.error(error);
      notifications.notifyError("Failed to reject company");
    }
  };

  const approveException = async (id) => {
    try {
      const token = getToken();
      await axios.post(
        `${API_URL}/api/admin/approve-exception/${id}/`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );
      notifications.notifySuccess("Exception request approved");
      
      // Remove from list and refresh data
      setExceptionRequests(prev => prev.filter(e => e.id !== id));
      await fetchAllAdminData();
      
    } catch (error) {
      console.error(error);
      notifications.notifyError("Failed to approve exception");
    }
  };

  const rejectException = async (id) => {
    try {
      const token = getToken();
      await axios.post(
        `${API_URL}/api/admin/reject-exception/${id}/`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );
      notifications.notifyInfo("Exception request rejected");
      
      // Remove from list and refresh data
      setExceptionRequests(prev => prev.filter(e => e.id !== id));
      await fetchAllAdminData();
      
    } catch (error) {
      console.error(error);
      notifications.notifyError("Failed to reject exception");
    }
  };

  const openAssignModal = (app) => {
    setSelectedPlacement(app);
    setShowAssignModal(true);
  };

  const handleAssign = () => {
    notifications.notifySuccess("Supervisor assigned successfully");
    fetchAllAdminData();
    setShowAssignModal(false);
  };

  const filteredStudents = departmentStudents.filter(student => {
    const matchesSearch = student.name?.toLowerCase().includes(studentSearch.toLowerCase()) ||
                          student.student_id?.toLowerCase().includes(studentSearch.toLowerCase());
    
    if (studentFilter === "active") {
      return matchesSearch && student.has_active_placement;
    } else if (studentFilter === "inactive") {
      return matchesSearch && !student.has_active_placement;
    }
    return matchesSearch;
  });

  const filteredSupervisors = departmentSupervisors.filter(supervisor =>
    supervisor.name?.toLowerCase().includes(supervisorSearch.toLowerCase()) ||
    supervisor.staff_id?.toLowerCase().includes(supervisorSearch.toLowerCase())
  );

  if (loading) return <div className="loading-state">Loading Admin Dashboard...</div>;
  
  if (!isApproved && currentUser) {
    const userName = `${currentUser.first_name || ""} ${currentUser.last_name || ""}`;
    return <PendingApproval role="admin" userName={userName} />;
  }

  return (
    <div className="dashboard-container">
      <div className="sidebar">
        <h2>Admin Dashboard</h2>
        <p className="admin-name">
          {currentUser?.first_name} {currentUser?.last_name}
        </p>
        <p className="department-badge">{currentUser?.department_fk?.name || "Department Admin"}</p>
        
        <button onClick={() => setActiveTab("dashboard")}> Dashboard</button>
        <button onClick={() => setActiveTab("staff")}>Staff Approvals</button>
        <button onClick={() => setActiveTab("applications")}>Applications</button>
        <button onClick={() => setActiveTab("companies")}>Pending Companies</button>
        <button onClick={() => setActiveTab("exceptions")}>Exception Requests</button>
        <button onClick={() => setActiveTab("students")}>Department Students</button>
        <button onClick={() => setActiveTab("supervisors")}>Department Supervisors</button>
        
        <button className="logout-btn" onClick={handleLogout}>
          Logout
        </button>
      </div>

      <div className="main-content">
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '20px' }}>
          <Notifications 
            role="admin"
            getToken={getToken}
            
            onNotificationClick={(notification) => {
              if (notification.type === 'staff') setActiveTab('staff');
              else if (notification.type === 'application') setActiveTab('applications');
              else if (notification.type === 'company') setActiveTab('companies');
              else if (notification.type === 'exception') setActiveTab('exceptions');
            }}
          />
        </div>

        {activeTab === "dashboard" && (
          <div className="dashboard-cards">
            <div className="card">
              <h3>Total Students</h3>
              <p>{dashboardData.total_students || 0}</p>
            </div>
            <div className="card">
              <h3>Total Supervisors</h3>
              <p>{dashboardData.total_supervisors || 0}</p>
            </div>
            <div className="card">
              <h3>Pending Applications</h3>
              <p>{dashboardData.pending_applications || 0}</p>
            </div>
            <div className="card">
              <h3>Active Internships</h3>
              <p>{dashboardData.active_internships || 0}</p>
            </div>
          </div>
        )}

        {activeTab === "staff" && (
          <StaffApprovals
            pendingStaff={pendingStaff}
            onApprove={approveStaff}
            onReject={rejectStaff}
          />
        )}

        {activeTab === "applications" && (
          <Applications
            pendingApplications={pendingApplications}
            onAssign={openAssignModal}
          />
        )}

        {activeTab === "companies" && (
          <PendingCompanies
            pendingCompanies={pendingCompanies}
            onApprove={approveCompany}
            onReject={rejectCompany}
          />
        )}

        {activeTab === "exceptions" && (
          <ExceptionRequests
            exceptionRequests={exceptionRequests}
            onApprove={approveException}
            onReject={rejectException}
          />
        )}

        {activeTab === "students" && (
          <div className="department-students">
            <h2>Department Students</h2>
            
            <div className="filter-bar">
              <input
                type="text"
                placeholder="Search by name or student ID..."
                value={studentSearch}
                onChange={(e) => setStudentSearch(e.target.value)}
                className="search-input"
              />
              <select 
                value={studentFilter} 
                onChange={(e) => setStudentFilter(e.target.value)}
                className="filter-select"
              >
                <option value="all">All Students</option>
                <option value="active">Active Internship</option>
                <option value="inactive">No Active Internship</option>
              </select>
            </div>

            <div className="students-table">
              <table>
                <thead>
                  <tr>
                    <th>Student Name</th>
                    <th>Student ID</th>
                    <th>Email</th>
                    <th>Company</th>
                    <th>Status</th>
                    <th>Placement Period</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredStudents.length === 0 ? (
                    <tr className="empty-row">
                      <td colSpan="6">
                        <div className="empty-state">No students found</div>
                      </td>
                    </tr>
                  ) : (
                    filteredStudents.map((student) => (
                      <tr key={student.id}>
                        <td><strong>{student.name || "N/A"}</strong></td>
                        <td>{student.student_id || "N/A"}</td>
                        <td>{student.email || "N/A"}</td>
                        <td>
                          <span className="company-name">
                            {student.company_name || "Not assigned"}
                          </span>
                        </td>
                        <td>
                          <span className={`status-badge ${student.has_active_placement ? "active" : "inactive"}`}>
                            {student.has_active_placement ? "Active Internship" : "No Placement"}
                          </span>
                        </td>
                        <td>
                          {student.placement_period ? (
                            <span className="date-badge">
                              {student.placement_period.start_date} → {student.placement_period.end_date}
                            </span>
                          ) : "N/A"}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeTab === "supervisors" && (
          <div className="department-supervisors">
            <h2>Department Supervisors</h2>
            
            <div className="filter-bar">
              <input
                type="text"
                placeholder="Search by name or staff ID..."
                value={supervisorSearch}
                onChange={(e) => setSupervisorSearch(e.target.value)}
                className="search-input"
              />
            </div>

            <div className="supervisors-table">
              <table>
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Staff ID</th>
                    <th>Email</th>
                    <th>Role</th>
                    <th>Assigned Students</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredSupervisors.length === 0 ? (
                    <tr className="empty-row">
                      <td colSpan="6">
                        <div className="empty-state">No supervisors found</div>
                      </td>
                    </tr>
                  ) : (
                    filteredSupervisors.map((supervisor) => (
                      <tr key={supervisor.id}>
                        <td><strong>{supervisor.name || "N/A"}</strong></td>
                        <td>{supervisor.staff_id || "N/A"}</td>
                        <td>{supervisor.email || "N/A"}</td>
                        <td>
                          <span className="role-badge">
                            {supervisor.role === "academic" ? "Academic Supervisor" : "Workplace Supervisor"}
                          </span>
                        </td>
                        <td>
                          <span className="assigned-count">
                            {supervisor.assigned_students_count || 0}
                          </span>
                        </td>
                        <td>
                          <span className={`status-badge ${supervisor.is_approved ? "approved" : "pending"}`}>
                            {supervisor.is_approved ? "Approved" : "Pending"}
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {showAssignModal && (
        <AssignSupervisorModal
          placement={selectedPlacement}
          onClose={() => setShowAssignModal(false)}
          onAssign={handleAssign}
        />
      )}
    </div>
  );
}