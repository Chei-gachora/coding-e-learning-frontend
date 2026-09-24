import { Link } from 'react-router-dom';

export default function Courses() {
  return (
    <>
      <header className="dashboard-navbar">
        <div className="container dashboard-nav-content">
          <Link to="/" className="logo">
            Code<span>Learn</span>
          </Link>

          <nav className="dashboard-links">
            <Link to="/dashboard">Dashboard</Link>
            <Link to="/courses" className="active">Courses</Link>
            <Link to="/labs">Labs</Link>
            <Link to="/results">Results</Link>
          </nav>

          <div className="student-profile">
            <div className="profile-avatar">P</div>
            <span>Student</span>
          </div>
        </div>
      </header>

      <main className="courses-page">
        <div className="container">
          <section className="page-header">
            <span>LEARNING PATH</span>
            <h1>Explore Courses</h1>
            <p>
              Build your coding skills through structured, practical learning.
            </p>
          </section>

          <section className="course-list">
            {/* HTML */}
            <div className="learning-course card">
              <div className="learning-course-top">
                <div className="learning-icon html-icon">🌐</div>
                <span className="badge badge-success">In Progress</span>
              </div>
              <h2>HTML Fundamentals</h2>
              <p>
                Learn the structure and building blocks of modern websites using HTML.
              </p>
              <div className="course-details">
                <span>📚 6 Modules</span>
                <span>📖 24 Lessons</span>
                <span>💻 30 Exercises</span>
              </div>
              <div className="course-progress">
                <div className="progress-info">
                  <span>Progress</span>
                  <strong>45%</strong>
                </div>
                <div className="progress-bar">
                  <div className="progress-fill" style={{ width: '45%' }}></div>
                </div>
              </div>
              <Link to="/lesson" className="btn btn-primary">
                Continue Course
              </Link>
            </div>

            {/* CSS */}
            <div className="learning-course card">
              <div className="learning-course-top">
                <div className="learning-icon css-icon">🎨</div>
                <span className="badge badge-warning">Not Started</span>
              </div>
              <h2>CSS Fundamentals</h2>
              <p>
                Learn how to style websites and create responsive and attractive interfaces.
              </p>
              <div className="course-details">
                <span>📚 5 Modules</span>
                <span>📖 20 Lessons</span>
                <span>💻 25 Exercises</span>
              </div>
              <div className="course-progress">
                <div className="progress-info">
                  <span>Progress</span>
                  <strong>0%</strong>
                </div>
                <div className="progress-bar">
                  <div className="progress-fill" style={{ width: '0%' }}></div>
                </div>
              </div>
              <Link to="/lesson" className="btn btn-outline">
                Start Course
              </Link>
            </div>

            {/* JAVASCRIPT */}
            <div className="learning-course card">
              <div className="learning-course-top">
                <div className="learning-icon js-icon">⚡</div>
                <span className="badge badge-danger">🔒 Locked</span>
              </div>
              <h2>JavaScript</h2>
              <p>
                Add interactivity and functionality to your websites using JavaScript.
              </p>
              <div className="course-details">
                <span>📚 8 Modules</span>
                <span>📖 32 Lessons</span>
                <span>💻 40 Exercises</span>
              </div>
              <div className="course-progress">
                <div className="progress-info">
                  <span>Progress</span>
                  <strong>0%</strong>
                </div>
                <div className="progress-bar">
                  <div className="progress-fill" style={{ width: '0%' }}></div>
                </div>
              </div>
              <button className="btn btn-outline" disabled>
                🔒 Locked
              </button>
            </div>

            {/* REACT */}
            <div className="learning-course card">
              <div className="learning-course-top">
                <div className="learning-icon react-icon">⚛️</div>
                <span className="badge badge-danger">🔒 Locked</span>
              </div>
              <h2>React</h2>
              <p>
                Build modern interactive user interfaces using React.
              </p>
              <div className="course-details">
                <span>📚 6 Modules</span>
                <span>📖 28 Lessons</span>
                <span>💻 35 Exercises</span>
              </div>
              <div className="course-progress">
                <div className="progress-info">
                  <span>Progress</span>
                  <strong>0%</strong>
                </div>
                <div className="progress-bar">
                  <div className="progress-fill" style={{ width: '0%' }}></div>
                </div>
              </div>
              <button className="btn btn-outline" disabled>
                🔒 Locked
              </button>
            </div>
          </section>
        </div>
      </main>

      <footer>
        <div className="container footer-content">
          <div>
            <h3>Code<span>Learn</span></h3>
            <p>Learn coding. Practice skills. Build projects.</p>
          </div>
          <p>© 2026 CodeLearn. All rights reserved.</p>
        </div>
      </footer>
    </>
  );
}
