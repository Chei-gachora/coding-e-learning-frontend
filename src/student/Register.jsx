import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ImRocket } from 'react-icons/im';
import { api } from '../lib/api';

export default function Register() {
  const [fullName, setFullName] = useState('');
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError('');
    setNotice('');
    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }
    if (password.length < 8) {
      setError('Use a password with at least 8 characters.');
      return;
    }

    const [firstName, ...lastNameParts] = fullName.trim().split(/\s+/);
    setSubmitting(true);
    try {
      await api.register({
        username: username.trim(),
        email: email.trim(),
        password,
        first_name: firstName,
        last_name: lastNameParts.join(' '),
      });
      setNotice('Your student account was created. Check the backend email output for the verification link; an administrator must approve your account before you can sign in.');
    } catch (registrationError) {
      setError(registrationError.message || 'Registration failed. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <section className="login-page">
      <div className="login-container">
        <div className="login-info">
          <Link to="/" className="logo">Code<span>Learn</span></Link>
          <h1>Join CodeLearn Today!</h1>
          <p>Create a student account to start your coding journey.</p>
          <div className="login-features">
            <div><strong><ImRocket /></strong><span>Hands-on coding exercises</span></div>
            <div><strong>🔬</strong><span>Practical daily labs</span></div>
            <div><strong>🏆</strong><span>Track progress and earn certificates</span></div>
          </div>
        </div>

        <div className="login-card">
          <div className="login-heading">
            <h2>Create Student Account</h2>
            <p>Public registration is for student accounts only.</p>
          </div>

          {error && (
            <div
              role="alert"
              style={{ background: 'rgba(244,63,94,0.15)', color: '#f87171', border: '1px solid rgba(244,63,94,0.3)', padding: '10px', borderRadius: '8px', marginBottom: '16px', fontSize: '14px' }}
            >
              {error}
            </div>
          )}
          {notice && (
            <div
              role="status"
              style={{ background: 'rgba(16,185,129,0.12)', color: '#34d399', border: '1px solid rgba(16,185,129,0.3)', padding: '10px', borderRadius: '8px', marginBottom: '16px', fontSize: '14px' }}
            >
              <p>{notice}</p>
              <Link to="/login">Continue to sign in</Link>
            </div>
          )}

          {!notice && (
            <form id="registerForm" onSubmit={handleSubmit}>
              <div className="form-group">
                <label htmlFor="fullName">Full Name</label>
                <input
                  type="text"
                  id="fullName"
                  className="form-control"
                  value={fullName}
                  onChange={(event) => setFullName(event.target.value)}
                  autoComplete="name"
                  maxLength={150}
                  required
                />
              </div>
              <div className="form-group">
                <label htmlFor="username">Username</label>
                <input
                  type="text"
                  id="username"
                  className="form-control"
                  value={username}
                  onChange={(event) => setUsername(event.target.value)}
                  autoComplete="username"
                  maxLength={150}
                  required
                />
              </div>
              <div className="form-group">
                <label htmlFor="email">Email Address</label>
                <input
                  type="email"
                  id="email"
                  className="form-control"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  autoComplete="email"
                  maxLength={254}
                  required
                />
              </div>
              <div className="form-group">
                <label htmlFor="password">Password</label>
                <input
                  type="password"
                  id="password"
                  className="form-control"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  autoComplete="new-password"
                  minLength={8}
                  required
                />
              </div>
              <div className="form-group">
                <label htmlFor="confirmPassword">Confirm Password</label>
                <input
                  type="password"
                  id="confirmPassword"
                  className="form-control"
                  value={confirmPassword}
                  onChange={(event) => setConfirmPassword(event.target.value)}
                  autoComplete="new-password"
                  minLength={8}
                  required
                />
              </div>
              <button type="submit" className="btn btn-primary login-btn" disabled={submitting}>
                {submitting ? 'Creating account…' : 'Create Student Account →'}
              </button>
            </form>
          )}

          <div className="register-link" style={{ marginTop: '16px' }}>
            <p>Already have an account? <Link to="/login">Sign In</Link></p>
          </div>
          <div className="back-home"><Link to="/">← Back Home</Link></div>
        </div>
      </div>
    </section>
  );
}
