import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import { api } from './lib/api';
import codelearnLogo from './assets/codelearn_logo.jpg';
import { PiStudentBold } from 'react-icons/pi';
import { FaChalkboardTeacher } from 'react-icons/fa';
import { MdAdminPanelSettings } from 'react-icons/md';


export default function Login() {
  const { login, user, loading: authLoading, authError } = useAuth();
  const navigate = useNavigate();

  // Redirect already-logged-in users straight to their dashboard
  useEffect(() => {
    if (user) {
      if (user.role === 'instructor') navigate('/instructor', { replace: true });
      else if (user.role === 'admin') navigate('/admin', { replace: true });
      else navigate('/dashboard', { replace: true });
    }
  }, [user, navigate]);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setNotice('');
    setSubmitting(true);
    try {
      const signedInUser = await login(email.trim(), password);
      const dashboardByRole = {
        student: '/dashboard',
        instructor: '/instructor',
        admin: '/admin',
      };
      navigate(dashboardByRole[signedInUser.role] || '/', { replace: true });
    } catch (loginError) {
      setError(loginError.message || 'Sign in failed. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const handlePasswordReset = async () => {
    setError('');
    setNotice('');
    if (!email.trim()) {
      setError('Enter your email address first to request a password reset.');
      return;
    }
    try {
      const response = await api.requestPasswordReset(email.trim());
      setNotice(response?.detail || 'If the account exists, password reset instructions have been sent.');
    } catch (resetError) {
      setError(resetError.message || 'Unable to request a password reset.');
    }
  };

  return (
    <section className="login-page">
      <div className="login-container">

        {/* ── LEFT SIDE ── */}
        <div className="login-info">
          <Link to="/" className="logo">Code<span>Learn</span></Link>

          <div className="login-logo-wrap">
            <img src={codelearnLogo} alt="CodeLearn Logo" className="login-logo-img" />
          </div>

          <h1>Welcome Back!</h1>
          <p>
            Access your personalized learning portal, manage courses, track
            student progress, or administrate the platform.
          </p>

          <div className="login-features">
            <div>
              <strong><PiStudentBold className="role-icon" /></strong>
              <span><strong>Student Portal:</strong> Access interactive lessons, labs, and grades</span>
            </div>
            <div>
              <strong><FaChalkboardTeacher className="role-icon" /></strong>
              <span><strong>Instructor Portal:</strong> Manage courses, review labs &amp; grade students</span>
            </div>
            <div>
              <strong><MdAdminPanelSettings className="role-icon" /></strong>
              <span><strong>Admin Portal:</strong> User management, platform metrics &amp; system settings</span>
            </div>
          </div>
        </div>

        {/* ── RIGHT SIDE ── */}
        <div className="login-card">
          <div className="login-heading">
            <h2>Sign In</h2>
            <p>Sign in with your account to continue to your dashboard.</p>
          </div>

          {(error || authError) && (
            <div style={{ background: 'rgba(198, 205, 233, 0.92)', color: '#f87171', border: '1px solid rgba(244,63,94,0.3)', padding: '10px', borderRadius: '8px', marginBottom: '16px', fontSize: '14px' }}>
              {error || authError}
            </div>
          )}
          {notice && (
            <div role="status" style={{ color: '#34d399', marginBottom: '16px', fontSize: '14px' }}>
              {notice}
            </div>
          )}

          <form id="loginForm" onSubmit={handleSubmit}>
            <div className="form-group">
              <label htmlFor="email">Email Address</label>
              <input
                type="email"
                id="email"
                className="form-control"
                autoComplete="email"
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
                autoComplete="current-password"
                placeholder="Enter your password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>

            <div className="login-options">
              <button type="button" className="btn btn-outline" onClick={handlePasswordReset}>
                Forgot Password?
              </button>
            </div>

            <button type="submit" className="btn btn-primary login-btn" disabled={submitting || authLoading}>
              {submitting ? 'Signing in…' : 'Sign In →'}
            </button>
          </form>

          <div className="register-link">
            <p>
              Don&rsquo;t have an account?&nbsp;<Link to="/register">Create an account</Link>
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
