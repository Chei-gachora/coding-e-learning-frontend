import { Link } from 'react-router-dom';

export default function Labs() {
  return (
    <>
      <header className="dashboard-navbar">
        <div className="container dashboard-nav-content">
          <Link to="/" className="logo">Code<span>Learn</span></Link>
          <div className="dashboard-links">
            <Link to="/dashboard">Dashboard</Link>
            <Link to="/courses">Courses</Link>
            <Link to="/labs" className="active">Labs</Link>
            <Link to="/results">Results</Link>
          </div>
          <div className="student-profile">
            <div className="profile-avatar">P</div>
            <span>Student</span>
          </div>
        </div>
      </header>

      <main className="labs-page">
        <div className="container">
          <div className="page-header">
            <div>
              <span className="section-label">PRACTICAL LEARNING</span>
              <h1>Daily Labs</h1>
              <p>
                Put your coding skills into practice by completing practical projects and submitting your work.
              </p>
            </div>
          </div>

          <section className="lab-summary">
            <div className="lab-summary-card">
              <span className="summary-icon">🧪</span>
              <div>
                <strong>4</strong>
                <span>Total Labs</span>
              </div>
            </div>

            <div className="lab-summary-card">
              <span className="summary-icon">✅</span>
              <div>
                <strong>1</strong>
                <span>Completed</span>
              </div>
            </div>

            <div className="lab-summary-card">
              <span className="summary-icon">⏳</span>
              <div>
                <strong>2</strong>
                <span>Pending</span>
              </div>
            </div>

            <div className="lab-summary-card">
              <span className="summary-icon">⚠️</span>
              <div>
                <strong>1</strong>
                <span>Missed</span>
              </div>
            </div>
          </section>

          <section className="labs-list">
            {/* Completed Lab */}
            <article className="lab-card">
              <div className="lab-card-top">
                <div>
                  <span className="lab-number">LAB 01</span>
                  <h2>Build a Personal Profile Page</h2>
                </div>
                <span className="lab-status completed">Completed</span>
              </div>
              <p className="lab-description">
                Create a simple personal profile webpage using basic HTML elements such as headings, paragraphs, images and links.
              </p>
              <div className="lab-details">
                <span>📚 HTML Fundamentals</span>
                <span>⭐ 20 Points</span>
                <span>📅 Due: Sept 5</span>
              </div>
              <div className="lab-progress">
                <div className="progress-label">
                  <span>Progress</span>
                  <strong>100%</strong>
                </div>
                <div className="progress-bar">
                  <div className="progress-fill" style={{ width: '100%' }}></div>
                </div>
              </div>
              <Link to="/results" className="btn btn-outline">
                View Result
              </Link>
            </article>

            {/* Pending Lab */}
            <article className="lab-card">
              <div className="lab-card-top">
                <div>
                  <span className="lab-number">LAB 02</span>
                  <h2>Design a Styled Web Page</h2>
                </div>
                <span className="lab-status pending">Pending</span>
              </div>
              <p className="lab-description">
                Build a webpage and use CSS to control colors, spacing, typography, borders and layout.
              </p>
              <div className="lab-details">
                <span>🎨 CSS Fundamentals</span>
                <span>⭐ 20 Points</span>
                <span>📅 Due: Sept 12</span>
              </div>
              <div className="lab-progress">
                <div className="progress-label">
                  <span>Progress</span>
                  <strong>0%</strong>
                </div>
                <div className="progress-bar">
                  <div className="progress-fill" style={{ width: '0%' }}></div>
                </div>
              </div>
              <Link to="/lesson" className="btn btn-primary">
                Start Lab
              </Link>
            </article>

            {/* Upcoming Lab */}
            <article className="lab-card">
              <div className="lab-card-top">
                <div>
                  <span className="lab-number">LAB 03</span>
                  <h2>Interactive JavaScript Page</h2>
                </div>
                <span className="lab-status upcoming">Upcoming</span>
              </div>
              <p className="lab-description">
                Create an interactive webpage using JavaScript variables, functions, events and DOM manipulation.
              </p>
              <div className="lab-details">
                <span>⚡ JavaScript</span>
                <span>⭐ 25 Points</span>
                <span>📅 Due: Sept 19</span>
              </div>
              <div className="lab-progress">
                <div className="progress-label">
                  <span>Progress</span>
                  <strong>Locked</strong>
                </div>
                <div className="progress-bar">
                  <div className="progress-fill" style={{ width: '0%' }}></div>
                </div>
              </div>
              <button className="btn btn-disabled" disabled>
                🔒 Locked
              </button>
            </article>

            {/* Missed Lab */}
            <article className="lab-card missed-lab">
              <div className="lab-card-top">
                <div>
                  <span className="lab-number">LAB 04</span>
                  <h2>Responsive Landing Page</h2>
                </div>
                <span className="lab-status missed">Not Completed</span>
              </div>
              <p className="lab-description">
                Create a responsive landing page that adapts to different screen sizes using HTML and CSS.
              </p>
              <div className="lab-details">
                <span>💻 HTML &amp; CSS</span>
                <span>⭐ 25 Points</span>
                <span>📅 Due: Sept 3</span>
              </div>
              <div className="lab-progress">
                <div className="progress-label">
                  <span>Status</span>
                  <strong>Deadline Passed</strong>
                </div>
                <div className="progress-bar">
                  <div className="progress-fill" style={{ width: '0%' }}></div>
                </div>
              </div>
              <button className="btn btn-disabled" disabled>
                Not Available
              </button>
            </article>
          </section>
        </div>
      </main>

      <footer className="site-footer">
        <div className="container">
          <p>© 2026 CodeLearn. Learn. Practice. Build.</p>
        </div>
      </footer>
    </>
  );
}
