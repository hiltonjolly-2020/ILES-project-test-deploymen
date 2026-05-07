// src/Pages/SupervisorStudents.jsx
import React from 'react';

export default function SupervisorStudents({ assignedStudents, role, onViewLogs, onEvaluate }) {
  if (!assignedStudents) {
    return <p>Loading assigned students...</p>;
  }

  const ongoingStudents = [];
  const completedStudents = [];
  
  for (var i = 0; i < assignedStudents.length; i++) {
    var student = assignedStudents[i];
    if (student.status !== 'completed') {
      ongoingStudents.push(student);
    } else {
      completedStudents.push(student);
    }
  }

  return (
    <div>
      <h1>Assigned Students</h1>
      
      <div className="section-title">
        <h2>Ongoing Internships</h2>
      </div>
      {ongoingStudents.length === 0 ? (
        <p>No ongoing internships.</p>
      ) : (
        ongoingStudents.map(function(student) {
          return (
            <div key={student.id} className="student-card ongoing">
              <div>
                <strong>{student.student_name}</strong> - {student.company_name}
              </div>
              <div className="student-actions">
                <button className="view-logs-btn" onClick={function() { onViewLogs(student.id, student.student_name); }}>
                  View All Logs
                </button>
                {!student.evaluation_submitted && (
                  <button className="evaluate-btn" onClick={function() { onEvaluate(student.id, student.student_name); }}>
                    Submit {role === "workplace" ? "Workplace" : "Academic"} Evaluation
                  </button>
                )}
                {student.evaluation_submitted && (
                  <span className="evaluated-badge">Evaluation Submitted</span>
                )}
              </div>
            </div>
          );
        })
      )}

      <div className="section-title">
        <h2>Completed / Evaluated</h2>
      </div>
      {completedStudents.length === 0 ? (
        <p>No completed internships.</p>
      ) : (
        completedStudents.map(function(student) {
          return (
            <div key={student.id} className="student-card completed">
              <div>
                <strong>{student.student_name}</strong> - {student.company_name}
              </div>
              <div className="student-actions">
                <button className="view-logs-btn" onClick={function() { onViewLogs(student.id, student.student_name); }}>
                  View All Logs
                </button>
                <span className="evaluated-badge">Evaluation Submitted</span>
              </div>
            </div>
          );
        })
      )}
    </div>
  );
}