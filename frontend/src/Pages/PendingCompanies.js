// src/Pages/PendingCompanies.jsx
import React from 'react';

export default function PendingCompanies({ pendingCompanies, loadingCompanies, onApprove, onReject }) {
  if (loadingCompanies) {
    return <p>Loading pending companies...</p>;
  }

  if (!pendingCompanies || pendingCompanies.length === 0) {
    return <p>No pending company approvals.</p>;
  }

  return (
    <div>
      <h1>Pending Company Approvals</h1>
      <p>Review and approve companies submitted by workplace supervisors and students</p>
      
      <table className="data-table">
        <thead>
          <tr>
            <th>Company Name</th>
            <th>Submitted By</th>
            <th>Role</th>
            <th>Contact</th>
            <th>Submitted Date</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {pendingCompanies.map((company) => (
            <tr key={company.id}>
              <td><strong>{company.name}</strong></td>
              <td>{company.created_by?.first_name} {company.created_by?.last_name}</td>
              <td>{company.created_by?.role === 'workplace' ? 'Workplace Supervisor' : 'Student'}</td>
              <td>{company.email || company.phone || 'N/A'}</td>
              <td>{new Date(company.created_at).toLocaleDateString()}</td>
              <td>
                <button 
                  className="approve-btn" 
                  onClick={() => onApprove(company.id)}
                  style={{background: '#10b981', marginRight: '8px'}}
                >
                  Approve
                </button>
                <button 
                  className="reject-btn" 
                  onClick={() => onReject(company.id)}
                  style={{background: '#ef4444'}}
                >
                  Reject
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}