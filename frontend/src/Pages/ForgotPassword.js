// frontend/src/Pages/ForgotPassword.js
import { useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import "../Login.css";
import API_URL from '../utils/api';
export default function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    setMessage("");

    try {
      await axios.post(`${API_URL}/api/token/forgot-password/`, {
        email: email
      });
      setMessage(" Password reset link has been sent to your email!");
      setTimeout(() => navigate("/login"), 3000);
    } catch (err) {
      if (err.response?.status === 404) {
        setError("No account found with this email address.");
      } else {
        setError(err.response?.data?.error || "Failed to send reset link. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-wrapper">
      <div className="login-left">
        <div className="overlay" />
        <div className="welcome-text">
          <h1>Reset Password</h1>
          <p>Enter your email to receive a password reset link.</p>
        </div>
      </div>

      <div className="login-right">
        <form className="login-card" onSubmit={handleSubmit}>
          <h2>Forgot Password?</h2>
          <p className="subtitle">We'll send you a link to reset your password</p>

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
            type="email"
            name="email"
            placeholder="Enter your registered email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />

          <button type="submit" disabled={loading}>
            {loading ? "Sending..." : "Send Reset Link"}
          </button>

          <p className="signup-text">
            <a href="/login">Back to Login</a>
          </p>
        </form>
      </div>
    </div>
  );
}