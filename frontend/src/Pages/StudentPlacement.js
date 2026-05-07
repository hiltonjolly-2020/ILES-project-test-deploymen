// src/Pages/StudentPlacement.jsx
import React, { useState } from 'react';

export default function StudentPlacement({ 
  studentId, 
  approvedCompanies, 
  selectedCompanyId, 
  newCompanyName,
  onCompanyChange,
  onNewCompanyChange,
  onSubmit 
}) {
  const [searchTerm, setSearchTerm] = useState('');

  const filteredCompanies = approvedCompanies.filter((company) =>
    company.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div>
      <h1>Apply for Internship Placement</h1>
      <div className="form-card">
        <form onSubmit={onSubmit}>
          <div className="form-group">
            <label>Student ID</label>
            <input type="text" value={studentId} readOnly className="readonly-input" />
          </div>
          
          <div className="form-group">
            <label>Search company:</label>
            <input
              type="text"
              placeholder="Type to filter companies..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="search-input"
            />
          </div>

          <div className="form-group">
            <label>Select existing company (approved):</label>
            <select value={selectedCompanyId} onChange={onCompanyChange} size="5">
              <option value="">-- Select Company --</option>
              {filteredCompanies.map((company) => (
                <option key={company.id} value={company.id}>
                  {company.name}
                </option>
              ))}
            </select>
            {filteredCompanies.length === 0 && searchTerm && (
              <small className="hint-text">No companies found. You can add a new one below.</small>
            )}
          </div>

          <div className="form-group">
            <label>Or enter new company name:</label>
            <input
              type="text"
              placeholder="New Company Name"
              value={newCompanyName}
              onChange={onNewCompanyChange}
            />
            <small className="hint-text">New companies will need admin approval</small>
          </div>
          
          <div className="form-row">
            <div className="form-group">
              <label>Start Date *</label>
              <input type="date" id="start_date" name="start_date" required />
            </div>
            <div className="form-group">
              <label>End Date *</label>
              <input type="date" id="end_date" name="end_date" required />
            </div>
          </div>
          
          <button type="submit" className="submit-btn">Submit Application</button>
        </form>
      </div>
    </div>
  );
}