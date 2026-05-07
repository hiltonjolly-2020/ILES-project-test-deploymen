import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import { ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

import Login from "./Login";
import Register from "./Register";
import Dashboard from "./Pages/Dashboard";  
import AdminDashboard from './Pages/AdminDashboard';
import StudentDashboard from './Pages/StudentDashboard'; 
import AcademicDashboard from './Pages/AcademicDashboard';
import AcademicEvaluation from './Pages/AcademicEvaluation';
import SupervisorDashboard from './Pages/SupervisorDashboard';
// In App.js - Add these imports
import ForgotPassword from "./Pages/ForgotPassword";
import ResetPassword from "./Pages/ResetPassword";


function App() {
  return (
    <Router>
      
      
      <ToastContainer 
        position="top-right"
        autoClose={3000}
        hideProgressBar={false}
        newestOnTop={true}
        closeOnClick
        pauseOnHover
      />

      <Routes>
        <Route path="/" element={<Navigate to="/login" />} />
        
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />

        {/* Admin */}
        <Route path="/admin" element={<AdminDashboard />} />

        {/* Student */}
        <Route path="/student" element={<StudentDashboard />} />

        {/* Academic Supervisor */}
        <Route path="/academic" element={<AcademicDashboard />} />
        <Route path="/academic/evaluate" element={<AcademicEvaluation />} />

        {/* Workplace Supervisor */}
        <Route path="/workplace-supervisor" element={<SupervisorDashboard />} />

        {/* General Dashboard */}
        <Route path="/dashboard" element={<Dashboard />} />
			
		<Route path="/forgot-password" element={<ForgotPassword />} />
		<Route path="/reset-password" element={<ResetPassword />} />
      </Routes>

    </Router>
  );
}

export default App;
