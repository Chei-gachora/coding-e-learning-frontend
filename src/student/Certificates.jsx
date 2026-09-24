import { useState } from 'react';
import { Link } from 'react-router-dom';

const Certificates = () => {
  const [activeFilter, setActiveFilter] = useState('all');

  const certificates = [
    {
      id: 1,
      title: 'JavaScript Fundamentals',
      issuedDate: 'August 12, 2025',
      credentialId: 'CL-JS-2025-08421',
      instructor: 'Sarah Chen',
      status: 'earned',
      thumbnail: '🟨',
      color: '#eab308',
    },
    {
      id: 2,
      title: 'Python Crash Course',
      issuedDate: 'July 28, 2025',
      credentialId: 'CL-PY-2025-07319',
      instructor: 'James Wilson',
      status: 'earned',
      thumbnail: '🐍',
      color: '#22c55e',
    },
    {
      id: 3,
      title: 'React for Beginners',
      issuedDate: null,
      credentialId: null,
      instructor: 'Alex Rivera',
      status: 'in-progress',
      progress: 65,
      thumbnail: '⚛️',
      color: '#3b82f6',
    },
    {
      id: 4,
      title: 'TypeScript Mastery',
      issuedDate: null,
      credentialId: null,
      instructor: 'Emily Park',
      status: 'locked',
      progress: 0,
      thumbnail: '💙',
      color: '#6366f1',
    },
    {
      id: 5,
      title: 'Full Stack with Node.js',
      issuedDate: null,
      credentialId: null,
      instructor: 'David Kim',
      status: 'in-progress',
      progress: 30,
      thumbnail: '🟢',
      color: '#10b981',
    },
    {
      id: 6,
      title: 'Data Structures & Algorithms',
      issuedDate: 'June 15, 2025',
      credentialId: 'CL-DSA-2025-06102',
      instructor: 'Michael Torres',
      status: 'earned',
      thumbnail: '🧠',
      color: '#8b5cf6',
    },
  ];

  const filteredCertificates = certificates.filter((cert) => {
    if (activeFilter === 'all') return true;
    return cert.status === activeFilter;
  });

  const earnedCount = certificates.filter((c) => c.status === 'earned').length;

  return (
    <div className="certificates-page">
      {/* Sidebar */}
      <aside className="sidebar">
        <div className="logo">
          <Link to="/" style={{ textDecoration: 'none', color: 'inherit', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span className="logo-icon">💻</span>
            <span className="logo-text">CodeLearn</span>
          </Link>
        </div>

        <nav className="nav">
          <Link to="/dashboard" className="nav-item">
            <span>🏠</span> Dashboard
          </Link>
          <Link to="/my-courses" className="nav-item">
            <span>📚</span> My Courses
          </Link>
          <Link to="/learning-paths" className="nav-item">
            <span>🔥</span> Learning Paths
          </Link>
          <Link to="/certificates" className="nav-item active">
            <span>🏆</span> Certificates
          </Link>
          <Link to="/dashboard" className="nav-item">
            <span>⚙️</span> Settings
          </Link>
        </nav>

        <div className="sidebar-footer">
          <Link to="/login" className="logout-btn" style={{ textAlign: 'center', textDecoration: 'none', display: 'block' }}>Log Out</Link>
        </div>
      </aside>

      {/* Main Content */}
      <main className="main-content">
        {/* Header */}
        <header className="page-header">
          <div>
            <h1>Certificates</h1>
            <p>Your achievements and credentials</p>
          </div>
          <div className="stats-badge">
            🏆 {earnedCount} Certificates Earned
          </div>
        </header>

        {/* Filters */}
        <div className="filters">
          <button
            className={`filter-btn ${activeFilter === 'all' ? 'active' : ''}`}
            onClick={() => setActiveFilter('all')}
          >
            All
          </button>
          <button
            className={`filter-btn ${activeFilter === 'earned' ? 'active' : ''}`}
            onClick={() => setActiveFilter('earned')}
          >
            Earned
          </button>
          <button
            className={`filter-btn ${activeFilter === 'in-progress' ? 'active' : ''}`}
            onClick={() => setActiveFilter('in-progress')}
          >
            In Progress
          </button>
          <button
            className={`filter-btn ${activeFilter === 'locked' ? 'active' : ''}`}
            onClick={() => setActiveFilter('locked')}
          >
            Locked
          </button>
        </div>

        {/* Certificates Grid */}
        <div className="certificates-grid">
          {filteredCertificates.length === 0 ? (
            <div className="empty-state">
              <p>No certificates found in this category.</p>
            </div>
          ) : (
            filteredCertificates.map((cert) => (
              <div
                key={cert.id}
                className={`certificate-card ${cert.status}`}
              >
                {/* Top accent */}
                <div
                  className="cert-accent"
                  style={{ backgroundColor: cert.color }}
                ></div>

                <div className="cert-content">
                  <div className="cert-header">
                    <div
                      className="cert-thumb"
                      style={{ backgroundColor: `${cert.color}22` }}
                    >
                      {cert.thumbnail}
                    </div>

                    {cert.status === 'earned' && (
                      <span className="earned-badge">✓ Earned</span>
                    )}
                    {cert.status === 'in-progress' && (
                      <span className="progress-badge">In Progress</span>
                    )}
                    {cert.status === 'locked' && (
                      <span className="locked-badge">🔒 Locked</span>
                    )}
                  </div>

                  <h3>{cert.title}</h3>
                  <p className="instructor">Instructor: {cert.instructor}</p>

                  {/* Earned Certificate Info */}
                  {cert.status === 'earned' && (
                    <>
                      <div className="cert-info">
                        <div className="info-row">
                          <span className="label">Issued on</span>
                          <span className="value">{cert.issuedDate}</span>
                        </div>
                        <div className="info-row">
                          <span className="label">Credential ID</span>
                          <span className="value mono">{cert.credentialId}</span>
                        </div>
                      </div>

                      <div className="cert-actions">
                        <button className="btn primary">Download PDF</button>
                        <button className="btn secondary">Share</button>
                      </div>
                    </>
                  )}

                  {/* In Progress */}
                  {cert.status === 'in-progress' && (
                    <>
                      <div className="progress-section">
                        <div className="progress-info">
                          <span>Course Progress</span>
                          <span>{cert.progress}%</span>
                        </div>
                        <div className="progress-bar">
                          <div
                            className="progress-fill"
                            style={{
                              width: `${cert.progress}%`,
                              backgroundColor: cert.color,
                            }}
                          ></div>
                        </div>
                      </div>
                      <p className="hint">
                        Complete the course to unlock this certificate
                      </p>
                      <button className="btn primary full">Continue Course</button>
                    </>
                  )}

                  {/* Locked */}
                  {cert.status === 'locked' && (
                    <>
                      <p className="hint locked-hint">
                        Enroll and complete this course to earn the certificate
                      </p>
                      <button className="btn secondary full" disabled>
                        Locked
                      </button>
                    </>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </main>
    </div>
  );
};

export default Certificates;
