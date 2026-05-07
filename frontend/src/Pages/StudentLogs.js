// src/Pages/StudentLogs.jsx
import React from 'react';

export default function StudentLogs({ recentLogs, onSubmit }) {
  return (
    <div>
      <h1>Weekly Logs</h1>
      
      <div className="form-card">
        <h3>Submit Weekly Log</h3>
        <form onSubmit={onSubmit}>
          <div className="form-group">
            <label>Week Number *</label>
            <input type="number" id="week_number" placeholder="Week number" min="1" required />
          </div>
          <div className="form-group">
            <label>Activities Performed *</label>
            <textarea id="activities" rows="4" placeholder="Describe your activities this week" required></textarea>
          </div>
          <div className="form-group">
            <label>Challenges Faced</label>
            <textarea id="challenges" rows="2" placeholder="Any challenges faced?"></textarea>
          </div>
          <div className="form-group">
            <label>Working Hours</label>
            <input type="number" id="working_hours" step="0.5" placeholder="Hours worked this week" />
          </div>
          <div className="form-group">
            <label>Attachment (Optional)</label>
            <input type="file" id="attachment" />
          </div>
          <button type="submit" className="submit-btn">Submit Log</button>
        </form>
      </div>

      <div className="section-title">
        <h2>Your Submitted Logs</h2>
      </div>
      {recentLogs && recentLogs.length > 0 ? (
        <div className="logs-list">
          {recentLogs.map(function(log, idx) {
            return (
              <div key={idx} className="log-item">
                <div className="log-header">
                  <strong>Week {log.week_number}</strong>
                  <span className={"status-badge " + log.status}>{log.status}</span>
                  {log.is_late && <span className="status-badge late">Late</span>}
                  <span className="log-date">Submitted: {new Date(log.submission_date).toLocaleDateString()}</span>
                </div>
                <p className="log-activities">{log.activities}</p>
                {log.challenges && <p><strong>Challenges:</strong> {log.challenges}</p>}
                {log.working_hours && <p><strong>Hours:</strong> {log.working_hours}</p>}
                {log.attachment && (
                  <p><strong>Attachment:</strong> <a href={log.attachment} target="_blank" rel="noopener noreferrer">Download</a></p>
                )}
                {log.feedback && <div className="log-feedback"><strong>Feedback:</strong> {log.feedback}</div>}
                {log.score && <div className="log-score"><strong>Score:</strong> {log.score}/100</div>}
                {log.late_reason && <div className="late-reason">{log.late_reason}</div>}
              </div>
            );
          })}
        </div>
      ) : (
        <p>No logs submitted yet.</p>
      )}
    </div>
  );
}