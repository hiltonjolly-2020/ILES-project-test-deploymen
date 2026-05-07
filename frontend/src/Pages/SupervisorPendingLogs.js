// src/Pages/SupervisorPendingLogs.jsx
import React from 'react';

export default function SupervisorPendingLogs({ pendingReviews, onReview }) {
  if (!pendingReviews || pendingReviews.length === 0) {
    return <p>No pending logs to review.</p>;
  }

  return (
    <div>
      <h1>Pending Logs</h1>
      {pendingReviews.map((log) => (
        <div key={log.id} className="log-card">
          <strong>Week {log.week_number}</strong> - {log.activities}
          <br />
          <small>Student: {log.student_name}</small>
          <br />
          <br />
          <button className="review-btn" onClick={() => onReview(log)}>
            Review Log
          </button>
        </div>
      ))}
    </div>
  );
}