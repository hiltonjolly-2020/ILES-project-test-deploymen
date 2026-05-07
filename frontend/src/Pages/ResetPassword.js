// frontend/src/Pages/ResetPassword.js
import { useState, useEffect } from "react";
import axios from "axios";
import { useNavigate, useSearchParams } from "react-router-dom";
import "../Login.css";
import API_URL from '../utils/api';
export default function ResetPassword() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token");
  
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    if (!token) {
      setError("Invalid or missing reset token");
    }
  }, [token]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (password !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }
    
    if (password.length < 8) {
      setError("Password must be at least 8 characters");
      return;
    }
    
    setLoading(true);
    setError("");
    setMessage("");

    try {
      await axios.post(`${API_URL}/api/token/forgot-password/reset-password/`, {
        token: token,
        new_password: password,
        confirm_password: confirmPassword
      });
      setMessage("✅ Password reset successfully! Redirecting to login...");
      setTimeout(() => navigate("/login"), 3000);
    } catch (err) {
      if (err.response?.status === 400) {
        setError(err.response?.data?.error || "Invalid or expired token");
      } else {
        setError("Failed to reset password. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  };

  if (!token) {
    return (
      <div className="login-wrapper">
        <div className="login-left">
          <div className="overlay" />
          <div className="welcome-text">
            <h1>Invalid Reset Link</h1>
            <p>The password reset link is invalid or has expired.</p>
          </div>
        </div>
        <div className="login-right">
          <div className="login-card">
            <h2>Invalid Link</h2>
            <p className="subtitle">This password reset link is invalid or has expired.</p>
            <p className="signup-text">
              <a href="/forgot-password">Request a new reset link</a>
            </p>
            <p className="signup-text">
              <a href="/login">Back to Login</a>
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="login-wrapper">
      <div className="login-left">
        <div className="overlay" />
        <div className="welcome-text">
          <h1>Create New Password</h1>
          <p>Enter your new password below.</p>
        </div>
      </div>

      <div className="login-right">
        <form className="login-card" onSubmit={handleSubmit}>
          <h2>Reset Password</h2>
          <p className="subtitle">Enter your new password</p>

          {message && <div className="success-message" style={{ 
            background: '#dcfce7', 
            color: '#15803d', 
            padding: '10px', 
            borderRadius: '8px',
            marginBottom: '15px',
            textAlign: 'center'
          }}>{message}</div>}

          {error && <div className="error-message" style={{ 
            background: '#fee2e2', 
            color: '#b91c1c', 
            padding: '10px', 
            borderRadius: '8px',
            marginBottom: '15px',
            textAlign: 'center'
          }}>{error}</div>}

          <input
            type="password"
            name="password"
            placeholder="New Password (min 8 characters)"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />

          <input
            type="password"
            name="confirm_password"
            placeholder="Confirm New Password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            required
          />

          <button type="submit" disabled={loading}>
            {loading ? "Resetting..." : "Reset Password"}
          </button>

          <p className="signup-text">
            <a href="/login">Back to Login</a>
          </p>
        </form>
      </div>
    </div>
  );
}