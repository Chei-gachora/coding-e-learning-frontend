import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';

export default function Register() {
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('student');
  const navigate = useNavigate();

  const handleSubmit = (e) => {
    e.preventDefault();
    if (role === 'instructor') {
      navigate('/instructor');
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
          <h1>Join CodeLearn Today!</h1>
          <p>
            Start your coding journey with interactive courses, daily labs, and instructor-guided learning paths.
          </p>

          <div className="login-features">
            <div>
              <strong>🚀</strong>
              <span>Hands-on coding exercises</span>
            </div>
            <div>
              <strong>🧪</strong>
              <span>Practical daily labs</span>
            </div>
            <div>
              <strong>🏆</strong>
              <span>Earn industry-recognized certificates</span>
            </div>
          </div>
        </div>

        {/* RIGHT SIDE */}
        <div className="login-card">
          <div className="login-heading">
            <h2>Create Account</h2>
            <p>Fill in your details to get started.</p>
          </div>

          <form id="registerForm" onSubmit={handleSubmit}>
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
                placeholder="Create a strong password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor="role">Select Your Role</label>
              <select
                id="role"
                className="form-control"
                value={role}
                onChange={(e) => setRole(e.target.value)}
                style={{ width: '100%', padding: '10px', background: '#1e293b', border: '1px solid #334155', color: '#fff', borderRadius: '6px' }}
              >
                <option value="student">Student Learner</option>
                <option value="instructor">Instructor</option>
              </select>
            </div>

            <button type="submit" className="btn btn-primary login-btn" style={{ marginTop: '12px' }}>
              Create Account &amp; Start Learning
            </button>
          </form>

          <div className="register-link" style={{ marginTop: '16px' }}>
            <p>
              Already have an account? <Link to="/login">Sign In</Link>
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
