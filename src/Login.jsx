import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext';

export default function Login() {
  const [email, setEmail] = useState('student@codelearn.com');
  const [password, setPassword] = useState('password123');
  const [role, setRole] = useState('student');
  const [error, setError] = useState('');
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleRoleSelect = (selectedRole) => {
    setRole(selectedRole);
    if (selectedRole === 'student') {
      setEmail('student@codelearn.com');
    } else if (selectedRole === 'instructor') {
      setEmail('instructor@codelearn.com');
    } else if (selectedRole === 'admin') {
      setEmail('admin@codelearn.com');
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!email || !password) {
      setError('Please fill in all fields.');
      return;
    }

    login(email, password, role);

    if (role === 'instructor') {
      navigate('/instructor');
    } else if (role === 'admin') {
      navigate('/admin');
    } else {
      navigate('/dashboard');
    }
  };

  const handleQuickDemo = (demoRole) => {
    login('', '', demoRole);
    if (demoRole === 'instructor') {
      navigate('/instructor');
    } else if (demoRole === 'admin') {
      navigate('/admin');
    } else {
      navigate('/dashboard');
    }
  };

  return (
    <section className="login-page">
      <div className="login-container">
        {/* LEFT SIDE */}
        <div className="login-info">
          <Link to="/" className="logo">
            Code<span>Learn</span>
          </Link>
          <h1>Welcome Back!</h1>
          <p>
            Access your personalized learning portal, manage courses, track student progress, or administrate the platform.
          </p>

          <div className="login-features">
            <div>
              <strong>🎓</strong>
              <span><strong>Student Portal:</strong> Access interactive lessons, labs, and grades</span>
            </div>
            <div>
              <strong>👨‍🏫</strong>
              <span><strong>Instructor Portal:</strong> Manage courses, review labs & grade students</span>
            </div>
            <div>
              <strong>🛡️</strong>
              <span><strong>Admin Portal:</strong> User management, platform metrics & system settings</span>
            </div>
          </div>

          <div style={{ marginTop: '28px', background: 'rgba(59, 130, 246, 0.1)', padding: '16px', borderRadius: '12px', border: '1px solid rgba(59, 130, 246, 0.2)' }}>
            <h4 style={{ fontSize: '14px', marginBottom: '8px', color: '#60a5fa' }}>⚡ Quick Demo Logins:</h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <button
                type="button"
                className="btn btn-outline btn-small"
                onClick={() => handleQuickDemo('student')}
                style={{ justifyContent: 'flex-start', background: 'rgba(15, 23, 42, 0.6)' }}
              >
                🎓 Login as Demo Student (Alex Johnson)
              </button>
              <button
                type="button"
                className="btn btn-outline btn-small"
                onClick={() => handleQuickDemo('instructor')}
                style={{ justifyContent: 'flex-start', background: 'rgba(15, 23, 42, 0.6)' }}
              >
                👨‍🏫 Login as Demo Instructor (Dr. Sarah Jenkins)
              </button>
              <button
                type="button"
                className="btn btn-outline btn-small"
                onClick={() => handleQuickDemo('admin')}
                style={{ justifyContent: 'flex-start', background: 'rgba(15, 23, 42, 0.6)' }}
              >
                🛡️ Login as Demo Admin (System Admin)
              </button>
            </div>
          </div>
        </div>

        {/* RIGHT SIDE */}
        <div className="login-card">
          <div className="login-heading">
            <h2>Sign In</h2>
            <p>Select your portal role and enter your login details.</p>
          </div>

          {error && (
            <div style={{ background: 'rgba(244, 63, 94, 0.15)', color: '#f87171', border: '1px solid rgba(244, 63, 94, 0.3)', padding: '10px', borderRadius: '8px', marginBottom: '16px', fontSize: '14px' }}>
              {error}
            </div>
          )}

          <form id="loginForm" onSubmit={handleSubmit}>
            <div className="form-group" style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', marginBottom: '8px', fontSize: '13px', fontWeight: '600', color: '#94a3b8' }}>
                1. SELECT PORTAL ROLE
              </label>
              <div style={{ display: 'flex', gap: '8px', background: '#090d16', padding: '4px', borderRadius: '8px', border: '1px solid #24344d' }}>
                <button
                  type="button"
                  className={`btn ${role === 'student' ? 'btn-primary' : 'btn-outline'}`}
                  onClick={() => handleRoleSelect('student')}
                  style={{ flex: 1, padding: '8px 4px', fontSize: '13px', border: role === 'student' ? 'none' : 'transparent' }}
                >
                  🎓 Student
                </button>
                <button
                  type="button"
                  className={`btn ${role === 'instructor' ? 'btn-primary' : 'btn-outline'}`}
                  onClick={() => handleRoleSelect('instructor')}
                  style={{ flex: 1, padding: '8px 4px', fontSize: '13px', border: role === 'instructor' ? 'none' : 'transparent' }}
                >
                  👨‍🏫 Instructor
                </button>
                <button
                  type="button"
                  className={`btn ${role === 'admin' ? 'btn-primary' : 'btn-outline'}`}
                  onClick={() => handleRoleSelect('admin')}
                  style={{ flex: 1, padding: '8px 4px', fontSize: '13px', border: role === 'admin' ? 'none' : 'transparent' }}
                >
                  🛡️ Admin
                </button>
              </div>
            </div>

            <div className="form-group">
              <label htmlFor="email">Email Address</label>
              <input
                type="email"
                id="email"
                className="form-control"
                placeholder="Enter your email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor="password">Password</label>
              <input
                type="password"
                id="password"
                className="form-control"
                placeholder="Enter your password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>

            <div className="login-options">
              <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer' }}>
                <input type="checkbox" defaultChecked /> Remember me
              </label>
              <a href="#forgot" onClick={(e) => { e.preventDefault(); alert('Password reset instructions sent to your email.'); }}>Forgot Password?</a>
            </div>

            <button type="submit" className="btn btn-primary login-btn">
              Login to {role.charAt(0).toUpperCase() + role.slice(1)} Dashboard →
            </button>
          </form>

          <div className="register-link">
            <p>
              Don't have an account? <Link to="/register">Create an account</Link>
            </p>
          </div>

          <div className="back-home">
            <Link to="/">← Back to Home</Link>
          </div>
        </div>
      </div>
    </section>
  );
}
