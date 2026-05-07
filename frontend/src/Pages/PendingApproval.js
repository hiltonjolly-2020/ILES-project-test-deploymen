import React from 'react';
import "./PendingApproval.css";
import pendingIcon from '../assets/gif/download.png';
import API_URL from '../utils/api';
export default function PendingApproval({ role, userName }) {
  const getMessageByRole = () => {
    switch(role) {
      case 'academic':
        return {
          title: "Academic Supervisor Account Pending Approval",
          message: "Your academic supervisor account is waiting for approval from your department administrator.",
          instruction: "You will be able to review student logs and manage placements once approved.",
          contact: "Contact your department head for approval status updates."
        };
      case 'workplace':
        return {
          title: "Workplace Supervisor Account Pending Approval",
          message: "Your workplace supervisor account is waiting for approval from your department administrator.",
          instruction: "You will be able to review intern logs and submit evaluations once approved.",
          contact: "Contact the department administrator or your company's HR for approval status."
        };
      case 'admin':
        return {
          title: "Administrator Account Pending Approval",
          message: "Your administrator account is waiting for approval from the main system administrator.",
          instruction: "You will have full system access once approved.",
          contact: "Contact the system administrator for approval status."
        };
      default:
        return {
          title: "Account Pending Approval",
          message: "Your account is waiting for approval.",
          instruction: "Please wait for an administrator to approve your account.",
          contact: "Contact support if you need assistance."
        };
    }
  };

  const { title, message, instruction, contact } = getMessageByRole();

  return (
    <div className="pending-approval-container">
      <div className="pending-approval-card">
        <div className="pending-icon">
          <img src={pendingIcon} alt="Pending Approval" />
        </div>
        <h2>{title}</h2>
        <p className="pending-message">{message}</p>
        <div className="pending-details">
          <p><strong>Hello, {userName}</strong></p>
          <p>{instruction}</p>
        </div>
        <div className="pending-contact">
          <p>{contact}</p>
        </div>
        <div className="pending-info">
          <p>You will be notified once your account is approved.</p>
          <button 
            className="refresh-btn"
            onClick={() => window.location.reload()}
          >
            Check Status
          </button>
        </div>
      </div>
    </div>
  );
}