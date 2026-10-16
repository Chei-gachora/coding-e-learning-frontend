import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth, detectRoleFromEmail } from './context/AuthContext';
import codelearnLogo from './assets/codelearn_logo.jpg';
import { PiStudentBold } from 'react-icons/pi';
import { FaChalkboardTeacher } from 'react-icons/fa';
import { MdAdminPanelSettings } from 'react-icons/md';


export default function Login() {
  const { login, user } = useAuth();
  const navigate = useNavigate();

  // Redirect already-logged-in users straight to their dashboard
  useEffect(() => {
    if (user) {
      if (user.role === 'instructor') navigate('/instructor', { replace: true });
      else if (user.role === 'admin') navigate('/admin', { replace: true });
      else navigate('/dashboard', { replace: true });
    }
  }, [user, navigate]);

  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');
  const [error, setError]       = useState('');
  const [isRegistering, setIsRegistering] = useState(false);
  const [fullName, setFullName] = useState('');

  // Admin Modal States
  const [showAdminPasswordModal, setShowAdminPasswordModal] = useState(false);
  const [adminPasswordInput, setAdminPasswordInput]         = useState('');
  const [modalError, setModalError]                         = useState('');

  // Live-detect role as user types
  const detectedRole = email ? detectRoleFromEmail(email) : null;

  const roleColor = { admin: '#f59e0b', instructor: '#a78bfa', student: '#34d399' };

  const handleSubmit = (e) => {
    e.preventDefault();
    setError('');

    if (!email || !password) {
      setError('Please fill in all fields.');
      return;
    }

    const role = detectRoleFromEmail(email);

    if (role === 'admin') {
      // Admin requires an extra authorization step
      setShowAdminPasswordModal(true);
      return;
    }

    const userData = login(email, password);
    if (userData.role === 'instructor') navigate('/instructor');
    else navigate('/dashboard');
  };

  const handleAdminModalSubmit = (e) => {
    e.preventDefault();
    setModalError('');
    if (adminPasswordInput !== 'Admin123') {
      setModalError('Incorrect administrative password.');
      return;
    }
    setShowAdminPasswordModal(false);
    login(email, adminPasswordInput, isRegistering ? fullName : '');
    navigate('/admin');
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
            <h2>{isRegistering ? 'Admin Registration' : 'Sign In'}</h2>
            <p>
              {isRegistering
                ? 'Register a new administrative account.'
                : 'Enter your email and we will direct you to the right dashboard.'}
            </p>
          </div>

          {error && (
            <div style={{ background: 'rgba(198, 205, 233, 0.92)', color: '#f87171', border: '1px solid rgba(244,63,94,0.3)', padding: '10px', borderRadius: '8px', marginBottom: '16px', fontSize: '14px' }}>
              {error}
            </div>
          )}

          <form id="loginForm" onSubmit={handleSubmit}>

            {isRegistering && (
              <div className="form-group">
                <label htmlFor="fullName">Full Name</label>
                <input
                  type="text"
                  id="fullName"
                  className="form-control"
                  placeholder="Enter your full name"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  required
                />
              </div>
            )}

            {/* Email — role is inferred from this */}
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
              {/* Live role hint */}
              {detectedRole && (
                <div style={{ marginTop: '6px', fontSize: '12px', color: roleColor[detectedRole], display: 'flex', alignItems: 'center', gap: '6px' }}>
                  {detectedRole === 'admin'      && <MdAdminPanelSettings />}
                  {detectedRole === 'instructor' && <FaChalkboardTeacher />}
                  {detectedRole === 'student'    && <PiStudentBold />}
                  Detected as&nbsp;<strong style={{ textTransform: 'capitalize' }}>{detectedRole}</strong>
                  &nbsp;&mdash; you will be directed to the {detectedRole} dashboard.
                </div>
              )}
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
              {!isRegistering && (
                <>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer' }}>
                    <input type="checkbox" defaultChecked /> Remember me
                  </label>
                  <a href="#forgot" onClick={(e) => { e.preventDefault(); alert('Password reset instructions sent to your email.'); }}>
                    Forgot Password?
                  </a>
                </>
              )}
            </div>

            <button type="submit" className="btn btn-primary login-btn">
              {isRegistering ? 'Register Admin Account →' : 'Login →'}
            </button>
          </form>

          <div className="register-link">
            <p>
              {isRegistering ? (
                <>Already have an account?&nbsp;
                  <a href="#signin" onClick={(e) => { e.preventDefault(); setIsRegistering(false); }}>Sign In</a>
                </>
              ) : (
                <>Don&rsquo;t have an account?&nbsp;<Link to="/register">Create an account</Link></>
              )}
            </p>
          </div>

          <div className="back-home">
            <Link to="/">← Back to Home</Link>
          </div>
        </div>
      </div>

      {/* ── ADMIN PASSWORD MODAL ── */}
      {showAdminPasswordModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '20px' }}>
          <div className="card" style={{ width: '100%', maxWidth: '400px', background: '#131c2e', padding: '24px', border: '1px solid #3b82f6', borderRadius: '16px', boxShadow: '0 10px 25px rgba(0,0,0,0.5)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h2 style={{ fontSize: '20px', color: '#fff' }}>
                <MdAdminPanelSettings className="role-icon" /> Admin Authorization
              </h2>
              <button
                type="button"
                onClick={() => { setShowAdminPasswordModal(false); setAdminPasswordInput(''); setModalError(''); }}
                style={{ background: 'transparent', border: 'none', color: '#94a3b8', fontSize: '20px', cursor: 'pointer' }}
              >
                ✕
              </button>
            </div>

            {modalError && (
              <div style={{ background: 'rgba(244,63,94,0.15)', color: '#f87171', border: '1px solid rgba(244,63,94,0.3)', padding: '10px', borderRadius: '8px', marginBottom: '16px', fontSize: '13px' }}>
                {modalError}
              </div>
            )}

            <form onSubmit={handleAdminModalSubmit}>
              <div className="form-group" style={{ marginBottom: '20px' }}>
                <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', color: '#94a3b8' }}>
                  Please enter the master admin password:
                </label>
                <input
                  type="password"
                  className="form-control"
                  placeholder="Enter Admin Password"
                  value={adminPasswordInput}
                  onChange={(e) => setAdminPasswordInput(e.target.value)}
                  autoFocus
                  required
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
                <button
                  type="button"
                  onClick={() => { setShowAdminPasswordModal(false); setAdminPasswordInput(''); setModalError(''); }}
                  className="btn btn-outline"
                >
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">Authorize →</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </section>
  );
}
