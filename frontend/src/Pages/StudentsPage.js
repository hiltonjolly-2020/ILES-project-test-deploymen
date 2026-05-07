// StudentsPage.jsx
import { useEffect, useState } from "react";
import axios from "axios";
import "./SupervisorDashboard.css";
import API_URL from '../utils/api';
export default function StudentsPage() {
  const [students, setStudents] = useState([]);

  useEffect(() => {
    axios.get(`${API_URL}/supervisor/students/`)
      .then(res => setStudents(res.data))
      .catch(err => console.log(err));
  }, []);

  return (
    <div>
      <h2>Assigned Students</h2>
      <table>
        <thead>
          <tr>
            <th>Name</th>
            <th>Institution</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody>
          {students.map(student => (
            <tr key={student.id}>
              <td>{student.name}</td>
              <td>{student.institution}</td>
              <td>{student.status}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}