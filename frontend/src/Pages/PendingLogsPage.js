import API_URL from '../utils/api';
import { useEffect, useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import "./SupervisorDashboard.css";
export default function PendingLogsPage() {
  const [logs, setLogs] = useState([]);
  const navigate = useNavigate();

  useEffect(() => {
    axios.get(`${API_URL}/logs/pending/`)
      .then(res => setLogs(res.data))
      .catch(err => console.log(err));
  }, []);

  return (
    <div>
      <h2>Pending Logs</h2>
      <table>
        <thead>
          <tr>
            <th>Student</th>
            <th>Date</th>
            <th>Activity</th>
            <th>Action</th>
          </tr>
        </thead>
        <tbody>
          {logs.map(log => (
            <tr key={log.id}>
              <td>{log.student_name}</td>
              <td>{log.date}</td>
              <td>{log.activity}</td>
              <td>
                <button onClick={() => navigate(`/supervisor/review/${log.id}`)}>
                  Review
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}