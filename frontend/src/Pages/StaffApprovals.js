import React from 'react';

export default function StaffApprovals({ pendingStaff, onApprove, onReject }) {
  if (!pendingStaff || pendingStaff.length === 0) {
    return <p>No pending staff approvals.</p>;
  }

  // Create a copy to avoid loop reference issues
  const staffList = pendingStaff.map(function(staff) {
    return (
      <tr key={staff.id}>
        <td>{staff.first_name} {staff.last_name}</td>
        <td>{staff.email}</td>
        <td>{staff.role}</td>
        <td>{staff.staff_id}</td>
        <td>
          <button 
            className="approve-btn" 
            onClick={function() { onApprove(staff); }}
          >
            Approve
          </button>
          <button 
            className="reject-btn" 
            onClick={function() { onReject(staff); }}
          >
            Reject
          </button>
        </td>
      </tr>
    );
  });

  return (
    <div>
      <h1>Staff Approvals</h1>
      <table className="data-table">
        <thead>
          <tr>
            <th>Name</th>
            <th>Email</th>
            <th>Role</th>
            <th>Staff ID</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {staffList}
        </tbody>
      </table>
    </div>
  );
}