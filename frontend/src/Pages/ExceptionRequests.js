// src/Pages/ExceptionRequests.jsx
import React, { useState } from 'react';
import axios from 'axios';
import API_URL from '../utils/api';
export default function ExceptionRequests({ exceptionRequests, loadingExceptions, onApprove, onReject }) {
  const [processingId, setProcessingId] = useState(null);
  
  const getToken = () => localStorage.getItem("access");

  const handleApproveCountExisting = async (id) => {
    setProcessingId(id);
    try {
      const token = getToken();
      await axios.post(`${API_URL}/api/admin/approve-count-existing/${id}/`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      alert(" Count existing request approved! Grade recalculated.");
      onApprove(id);
    } catch (error) {
      console.error(error);
      alert(error.response?.data?.error || "Failed to approve");
    } finally {
      setProcessingId(null);
    }
  };

  const handleNotifyWorkplace = async (id) => {
    setProcessingId(id);
    try {
      const token = getToken();
      await axios.post(`${API_URL}/api/admin/notify-workplace/${id}/`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      alert("📧 Workplace supervisor notified! Waiting for their decision.");
      onApprove(id);
    } catch (error) {
      console.error(error);
      alert(error.response?.data?.error || "Failed to notify workplace");
    } finally {
      setProcessingId(null);
    }
  };

  if (loadingExceptions) {
    return <p>Loading requests...</p>;
  }

  if (!exceptionRequests || exceptionRequests.length === 0) {
    return (
      <div className="empty-state">
        <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
          <path d="M20 12v6a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2v-6" />
          <path d="M12 16V2" />
          <path d="m8 6 4-4 4 4" />
        </svg>
        <p>No exception requests found</p>
      </div>
    );
  }

  // Separate requests by type and status
  const countExistingPending = exceptionRequests.filter(req => 
    req.exception_request_type === 'count_existing' && req.exception_status === 'pending'
  );
  
  const lateSubmissionPending = exceptionRequests.filter(req => 
    req.exception_request_type === 'late_submission' && req.exception_status === 'late_pending'
  );
  
  const workplacePending = exceptionRequests.filter(req => 
    req.exception_request_type === 'late_submission' && req.exception_status === 'workplace_pending'
  );
  
  const approvedRequests = exceptionRequests.filter(req => 
    req.exception_status === 'approved' || req.exception_status === 'late_approved'
  );
  
  const rejectedRequests = exceptionRequests.filter(req => 
    req.exception_status === 'rejected' || req.exception_status === 'late_rejected'
  );

  return (
    <div>
      <div className="exceptions-header">
        <h1>Exception Requests</h1>
        <p className="subtitle">Review and manage student requests for missing weekly logs</p>
      </div>

      {/* COUNT EXISTING - PENDING ADMIN APPROVAL */}
      {countExistingPending.length > 0 && (
        <>
          <div className="exception-tabs">
            <button className="exception-tab active">
              📊 Count Existing Only
              <span className="badge">{countExistingPending.length}</span>
            </button>
          </div>
          {countExistingPending.map((req) => (
            <div key={req.id} className="exception-card pending">
              <div className="exception-card-header">
                <div className="student-info">
                  <span className="student-name">{req.student_name}</span>
                  <span className="student-id">{req.student_id}</span>
                </div>
                <span className="request-date">
                  {new Date(req.created_at).toLocaleDateString('en-US', {
                    year: 'numeric',
                    month: 'short',
                    day: 'numeric'
                  })}
                </span>
              </div>
              <div className="exception-card-body">
                <div className="info-row">
                  <span className="info-label">Placement</span>
                  <span className="info-value">{req.company_name}</span>
                </div>
                <div className="info-row">
                  <span className="info-label">Request Type</span>
                  <span className="info-value" style={{ background: '#fef3c7', padding: '2px 8px', borderRadius: '4px', display: 'inline-block' }}>
                    📊 Count existing only
                  </span>
                </div>
                <div className="info-row">
                  <span className="info-label">Reason</span>
                  <div className="reason-text">{req.reason || req.exception_reason}</div>
                </div>
              </div>
              <div className="exception-card-footer">
                <button 
                  className="btn-approve" 
                  onClick={() => handleApproveCountExisting(req.id)}
                  disabled={processingId === req.id}
                  style={{ background: '#10b981' }}
                >
                  {processingId === req.id ? "Processing..." : "✅ Approve (Count Existing)"}
                </button>
                <button 
                  className="btn-reject" 
                  onClick={() => onReject(req.id)}
                  disabled={processingId === req.id}
                >
                  ❌ Reject
                </button>
              </div>
            </div>
          ))}
        </>
      )}

      {/* LATE SUBMISSION - PENDING ADMIN REVIEW (Before forwarding to workplace) */}
      {lateSubmissionPending.length > 0 && (
        <>
          <div className="exception-tabs">
            <button className="exception-tab active">
              📝 Late Submission (Admin Review)
              <span className="badge">{lateSubmissionPending.length}</span>
            </button>
          </div>
          {lateSubmissionPending.map((req) => (
            <div key={req.id} className="exception-card pending">
              <div className="exception-card-header">
                <div className="student-info">
                  <span className="student-name">{req.student_name}</span>
                  <span className="student-id">{req.student_id}</span>
                </div>
                <span className="request-date">
                  {new Date(req.created_at).toLocaleDateString('en-US', {
                    year: 'numeric',
                    month: 'short',
                    day: 'numeric'
                  })}
                </span>
              </div>
              <div className="exception-card-body">
                <div className="info-row">
                  <span className="info-label">Placement</span>
                  <span className="info-value">{req.company_name}</span>
                </div>
                <div className="info-row">
                  <span className="info-label">Request Type</span>
                  <span className="info-value" style={{ background: '#e0f2fe', padding: '2px 8px', borderRadius: '4px', display: 'inline-block' }}>
                    📝 Request late submission
                  </span>
                </div>
                <div className="info-row">
                  <span className="info-label">Reason</span>
                  <div className="reason-text">{req.reason || req.exception_reason}</div>
                </div>
                <div className="info-row">
                  <span className="info-label">Missing Weeks</span>
                  <span className="info-value">{req.missing_weeks?.join(', ') || 'Check logs'}</span>
                </div>
              </div>
              <div className="exception-card-footer">
                <button 
                  className="btn-approve" 
                  onClick={() => handleNotifyWorkplace(req.id)}
                  disabled={processingId === req.id}
                  style={{ background: '#3b82f6' }}
                >
                  {processingId === req.id ? "Processing..." : "📧 Notify Workplace Supervisor"}
                </button>
                <button 
                  className="btn-reject" 
                  onClick={() => onReject(req.id)}
                  disabled={processingId === req.id}
                >
                  ❌ Reject Request
                </button>
              </div>
            </div>
          ))}
        </>
      )}

      {/* LATE SUBMISSION - PENDING WORKPLACE DECISION */}
      {workplacePending.length > 0 && (
        <>
          <div className="exception-tabs">
            <button className="exception-tab">
              ⏳ Pending Workplace Decision
              <span className="badge">{workplacePending.length}</span>
            </button>
          </div>
          {workplacePending.map((req) => (
            <div key={req.id} className="exception-card pending" style={{ borderLeftColor: '#3b82f6' }}>
              <div className="exception-card-header">
                <div className="student-info">
                  <span className="student-name">{req.student_name}</span>
                  <span className="student-id">{req.student_id}</span>
                </div>
                <span className="request-date">
                  {new Date(req.created_at).toLocaleDateString('en-US', {
                    year: 'numeric',
                    month: 'short',
                    day: 'numeric'
                  })}
                </span>
              </div>
              <div className="exception-card-body">
                <div className="info-row">
                  <span className="info-label">Placement</span>
                  <span className="info-value">{req.company_name}</span>
                </div>
                <div className="info-row">
                  <span className="info-label">Status</span>
                  <span className="info-value" style={{ background: '#dbeafe', padding: '2px 8px', borderRadius: '4px', display: 'inline-block' }}>
                    ⏳ Waiting for workplace decision
                  </span>
                </div>
                <div className="info-row">
                  <span className="info-label">Reason</span>
                  <div className="reason-text">{req.reason || req.exception_reason}</div>
                </div>
              </div>
              <div className="exception-card-footer">
                <span style={{ color: '#666', fontSize: '12px' }}>
                  Workplace supervisor has been notified and is reviewing this request.
                </span>
              </div>
            </div>
          ))}
        </>
      )}

      {/* APPROVED REQUESTS */}
      {approvedRequests.length > 0 && (
        <>
          <div className="exception-tabs">
            <button className="exception-tab">
              ✅ Approved
              <span className="badge">{approvedRequests.length}</span>
            </button>
          </div>
          {approvedRequests.map((req) => (
            <div key={req.id} className="exception-card approved">
              <div className="exception-card-header">
                <div className="student-info">
                  <span className="student-name">{req.student_name}</span>
                  <span className="student-id">{req.student_id}</span>
                  <span className="status-badge-sm approved">
                    {req.exception_status === 'late_approved' ? '✓ Late Approved' : '✓ Approved'}
                  </span>
                </div>
                <span className="request-date">
                  {new Date(req.created_at).toLocaleDateString('en-US', {
                    year: 'numeric',
                    month: 'short',
                    day: 'numeric'
                  })}
                </span>
              </div>
              <div className="exception-card-body">
                <div className="info-row">
                  <span className="info-label">Request Type</span>
                  <span className="info-value">
                    {req.exception_request_type === 'count_existing' ? '📊 Count existing only' : '📝 Late submission'}
                  </span>
                </div>
                <div className="info-row">
                  <span className="info-label">Reason</span>
                  <div className="reason-text">{req.reason || req.exception_reason}</div>
                </div>
              </div>
            </div>
          ))}
        </>
      )}

      {/* REJECTED REQUESTS */}
      {rejectedRequests.length > 0 && (
        <>
          <div className="exception-tabs">
            <button className="exception-tab">
              ❌ Rejected
              <span className="badge">{rejectedRequests.length}</span>
            </button>
          </div>
          {rejectedRequests.map((req) => (
            <div key={req.id} className="exception-card rejected">
              <div className="exception-card-header">
                <div className="student-info">
                  <span className="student-name">{req.student_name}</span>
                  <span className="student-id">{req.student_id}</span>
                  <span className="status-badge-sm rejected">
                    {req.exception_status === 'late_rejected' ? '✗ Late Rejected' : '✗ Rejected'}
                  </span>
                </div>
                <span className="request-date">
                  {new Date(req.created_at).toLocaleDateString('en-US', {
                    year: 'numeric',
                    month: 'short',
                    day: 'numeric'
                  })}
                </span>
              </div>
              <div className="exception-card-body">
                <div className="info-row">
                  <span className="info-label">Request Type</span>
                  <span className="info-value">
                    {req.exception_request_type === 'count_existing' ? '📊 Count existing only' : '📝 Late submission'}
                  </span>
                </div>
                <div className="info-row">
                  <span className="info-label">Reason</span>
                  <div className="reason-text">{req.reason || req.exception_reason}</div>
                </div>
                {req.workplace_decision_reason && (
                  <div className="info-row">
                    <span className="info-label">Decision Reason</span>
                    <div className="reason-text" style={{ background: '#fee2e2' }}>
                      {req.workplace_decision_reason}
                    </div>
                  </div>
                )}
              </div>
            </div>
          ))}
        </>
      )}
    </div>
  );
}