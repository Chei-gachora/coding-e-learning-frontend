import { useState } from 'react';
import { Link } from 'react-router-dom';
import Sidebar from '../components/Sidebar';
import { useAuth } from '../context/AuthContext';
import { coursesData } from '../data/coursesData';
import { FaDownload, FaShareAlt, FaCheckCircle, FaPrint, FaTimes, FaGraduationCap } from 'react-icons/fa';
import { GiTrophyCup } from 'react-icons/gi';

const certificateCatalog = [
  {
    courseSlug: 'python-crash-course',
    title: 'Python Crash Course',
    instructor: 'James Wilson',
    issuedDate: 'July 28, 2025',
    credentialId: 'CL-PY-2025-07319',
    thumbnail: '🐍',
    color: '#22c55e',
    grade: '98% (Honors)',
    skills: ['Python 3', 'Data Structures', 'Automation', 'Functions']
  },
  {
    courseSlug: 'data-structures-algorithms',
    title: 'Data Structures & Algorithms',
    instructor: 'Michael Torres',
    issuedDate: 'June 15, 2025',
    credentialId: 'CL-DSA-2025-06102',
    thumbnail: '🧠',
    color: '#8b5cf6',
    grade: '95% (Distinction)',
    skills: ['Big-O Notation', 'Hash Tables', 'Binary Search', 'Optimization']
  },
  {
    courseSlug: 'javascript-fundamentals',
    title: 'JavaScript Fundamentals',
    instructor: 'Sarah Chen',
    issuedDate: 'Pending Completion',
    credentialId: 'CL-JS-2025-PENDING',
    thumbnail: '🟨',
    color: '#eab308',
    grade: 'In Progress',
    skills: ['ES6+', 'Async / Await', 'DOM API', 'Closures']
  },
  {
    courseSlug: 'react-for-beginners',
    title: 'React for Beginners',
    instructor: 'Alex Rivera',
    issuedDate: 'Pending Completion',
    credentialId: 'CL-REACT-PENDING',
    thumbnail: '⚛️',
    color: '#38bdf8',
    grade: 'In Progress',
    skills: ['Components', 'JSX', 'Hooks', 'Virtual DOM']
  },
  {
    courseSlug: 'fullstack-nodejs',
    title: 'Full Stack with Node.js',
    instructor: 'David Kim',
    issuedDate: 'Pending Completion',
    credentialId: 'CL-NODE-PENDING',
    thumbnail: '🟢',
    color: '#10b981',
    grade: 'In Progress',
    skills: ['Express', 'REST APIs', 'Node.js', 'Middleware']
  },
  {
    courseSlug: 'html-fundamentals',
    title: 'HTML Fundamentals',
    instructor: 'Dr. Sarah Jenkins',
    issuedDate: 'Pending Completion',
    credentialId: 'CL-HTML-PENDING',
    thumbnail: '🌐',
    color: '#f97316',
    grade: 'In Progress',
    skills: ['Semantic HTML5', 'Forms', 'Accessibility', 'SEO']
  },
  {
    courseSlug: 'css-fundamentals',
    title: 'CSS Fundamentals',
    instructor: 'Dr. Sarah Jenkins',
    issuedDate: 'Not Started',
    credentialId: 'CL-CSS-PENDING',
    thumbnail: '🎨',
    color: '#38bdf8',
    grade: 'Not Started',
    skills: ['Box Model', 'Flexbox', 'CSS Grid', 'Responsive']
  },
  {
    courseSlug: 'typescript-mastery',
    title: 'TypeScript Mastery',
    instructor: 'Emily Park',
    issuedDate: 'Not Started',
    credentialId: 'CL-TS-PENDING',
    thumbnail: '💙',
    color: '#6366f1',
    grade: 'Not Started',
    skills: ['Types', 'Interfaces', 'Generics', 'Strict Mode']
  }
];

const Certificates = () => {
  const { user } = useAuth();
  const studentName = user?.name || 'Alex Johnson';

  // Default active filter: 'downloadable' so ONLY completed courses show up for download
  const [activeFilter, setActiveFilter] = useState('downloadable');
  const [selectedCertificate, setSelectedCertificate] = useState(null);
  const [copiedNotification, setCopiedNotification] = useState('');

  // Dynamically compute completion status based on actual coursesData
  const certificatesWithStatus = certificateCatalog.map((cert) => {
    const matchedCourse = coursesData.find((c) => c.slug === cert.courseSlug);
    const progress = matchedCourse ? matchedCourse.progress : 0;
    const isCompleted = matchedCourse
      ? matchedCourse.progress >= 100 || matchedCourse.status === 'completed'
      : false;

    return {
      ...cert,
      progress,
      isCompleted,
      status: isCompleted ? 'earned' : progress > 0 ? 'in-progress' : 'locked',
      totalLessons: matchedCourse ? matchedCourse.totalLessons : 20,
      completedLessons: matchedCourse ? matchedCourse.completedLessons : 0,
    };
  });

  const completedCertificates = certificatesWithStatus.filter((c) => c.isCompleted);
  const inProgressCertificates = certificatesWithStatus.filter((c) => !c.isCompleted && c.progress > 0);

  // Filter based on selected view
  const filteredCertificates = certificatesWithStatus.filter((cert) => {
    if (activeFilter === 'downloadable' || activeFilter === 'earned') {
      return cert.isCompleted;
    }
    if (activeFilter === 'in-progress') {
      return !cert.isCompleted && cert.progress > 0;
    }
    return true; // 'all'
  });

  const handleDownloadPdf = (cert) => {
    setSelectedCertificate(cert);
  };

  const handlePrintCertificate = () => {
    window.print();
  };

  const handleShare = (cert) => {
    navigator.clipboard?.writeText(
      `https://codelearn.dev/verify/${cert.credentialId}`
    );
    setCopiedNotification(`Credential link for ${cert.title} copied to clipboard!`);
    setTimeout(() => setCopiedNotification(''), 3500);
  };

  return (
    <div className="certificates-page">
      {/* Stationary Sidebar */}
      <Sidebar />

      {/* Main Content */}
      <main className="main-content">
        {/* Header */}
        <header className="page-header" style={{ marginBottom: '24px' }}>
          <div>
            <h1>Official Certificates &amp; Credentials</h1>
            <p>
              Earned credentials for completed courses. Download verified PDF certificates or share your achievements.
            </p>
          </div>
          <div className="stats-badge" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <GiTrophyCup style={{ fontSize: '18px', color: '#fbbf24' }} />
            <span>{completedCertificates.length} Certificates Ready for Download</span>
          </div>
        </header>

        {copiedNotification && (
          <div
            style={{
              background: '#064e3b',
              color: '#6ee7b7',
              border: '1px solid #059669',
              padding: '12px 18px',
              borderRadius: '10px',
              marginBottom: '20px',
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              fontSize: '14px',
            }}
          >
            <FaCheckCircle /> {copiedNotification}
          </div>
        )}

        {/* View Filters */}
        <div className="filters" style={{ marginBottom: '28px' }}>
          <button
            className={`filter-btn ${activeFilter === 'downloadable' ? 'active' : ''}`}
            onClick={() => setActiveFilter('downloadable')}
          >
            Available for Download ({completedCertificates.length})
          </button>
          <button
            className={`filter-btn ${activeFilter === 'in-progress' ? 'active' : ''}`}
            onClick={() => setActiveFilter('in-progress')}
          >
            In Progress Courses ({inProgressCertificates.length})
          </button>
          <button
            className={`filter-btn ${activeFilter === 'all' ? 'active' : ''}`}
            onClick={() => setActiveFilter('all')}
          >
            All Courses ({certificatesWithStatus.length})
          </button>
        </div>

        {/* Notice for Downloadable view */}
        {activeFilter === 'downloadable' && (
          <div
            style={{
              background: 'rgba(16, 185, 129, 0.1)',
              border: '1px solid rgba(16, 185, 129, 0.25)',
              borderRadius: '12px',
              padding: '14px 20px',
              marginBottom: '24px',
              color: '#34d399',
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              fontSize: '14px',
            }}
          >
            <FaCheckCircle style={{ fontSize: '18px', flexShrink: 0 }} />
            <span>
              Showing only <strong>100% completed courses</strong>. These certificates are issued and available for instant PDF download.
            </span>
          </div>
        )}

        {/* Certificates Grid */}
        <div className="certificates-grid">
          {filteredCertificates.length === 0 ? (
            <div className="empty-state" style={{ padding: '40px', textAlign: 'center', gridColumn: '1 / -1' }}>
              <p style={{ color: '#94a3b8', fontSize: '16px' }}>
                No completed courses available for download yet. Complete a course to earn and download your certificate!
              </p>
              <Link to="/my-courses" className="btn btn-primary" style={{ marginTop: '14px' }}>
                Go to My Courses →
              </Link>
            </div>
          ) : (
            filteredCertificates.map((cert) => (
              <div
                key={cert.courseSlug}
                className={`certificate-card ${cert.status}`}
                style={{
                  border: cert.isCompleted ? `1px solid ${cert.color}66` : undefined,
                  boxShadow: cert.isCompleted ? `0 6px 20px ${cert.color}15` : undefined,
                }}
              >
                {/* Top accent */}
                <div
                  className="cert-accent"
                  style={{ backgroundColor: cert.isCompleted ? cert.color : '#475569' }}
                ></div>

                <div className="cert-content">
                  <div className="cert-header">
                    <div
                      className="cert-thumb"
                      style={{
                        backgroundColor: cert.isCompleted ? `${cert.color}22` : '#1e293b',
                        border: cert.isCompleted ? `1px solid ${cert.color}44` : '1px solid #334155',
                      }}
                    >
                      {cert.thumbnail}
                    </div>

                    {cert.isCompleted ? (
                      <span className="earned-badge" style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                        <FaCheckCircle /> ✓ Ready to Download
                      </span>
                    ) : cert.progress > 0 ? (
                      <span className="progress-badge">In Progress ({cert.progress}%)</span>
                    ) : (
                      <span className="locked-badge">🔒 Incomplete</span>
                    )}
                  </div>

                  <h3>{cert.title}</h3>
                  <p className="instructor">Instructor: {cert.instructor}</p>

                  {/* ONLY Completed courses show download information & download buttons */}
                  {cert.isCompleted ? (
                    <>
                      <div className="cert-info">
                        <div className="info-row">
                          <span className="label">Status</span>
                          <span className="value" style={{ color: '#34d399', fontWeight: '700' }}>
                            Course Completed (100%)
                          </span>
                        </div>
                        <div className="info-row">
                          <span className="label">Issued Date</span>
                          <span className="value">{cert.issuedDate}</span>
                        </div>
                        <div className="info-row">
                          <span className="label">Credential ID</span>
                          <span className="value mono">{cert.credentialId}</span>
                        </div>
                        <div className="info-row">
                          <span className="label">Grade Score</span>
                          <span className="value" style={{ color: '#fbbf24' }}>
                            {cert.grade}
                          </span>
                        </div>
                      </div>

                      <div className="cert-actions">
                        <button
                          className="btn primary"
                          onClick={() => handleDownloadPdf(cert)}
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '8px',
                            flex: '1',
                            justifyContent: 'center',
                          }}
                        >
                          <FaDownload /> Download PDF
                        </button>
                        <button
                          className="btn secondary"
                          onClick={() => handleShare(cert)}
                          title="Share Certificate"
                          style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
                        >
                          <FaShareAlt /> Share
                        </button>
                      </div>
                    </>
                  ) : (
                    /* Incomplete courses show progress and continue option - NO download option */
                    <>
                      <div className="progress-section" style={{ margin: '12px 0 16px 0' }}>
                        <div className="progress-info" style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', marginBottom: '6px' }}>
                          <span style={{ color: '#94a3b8' }}>Course Progress</span>
                          <strong style={{ color: '#38bdf8' }}>{cert.progress}%</strong>
                        </div>
                        <div className="progress-bar" style={{ width: '100%', height: '8px', background: '#1e293b', borderRadius: '4px', overflow: 'hidden' }}>
                          <div
                            className="progress-fill"
                            style={{
                              width: `${cert.progress}%`,
                              height: '100%',
                              backgroundColor: cert.color,
                            }}
                          ></div>
                        </div>
                      </div>

                      <p
                        className="hint"
                        style={{
                          fontSize: '13px',
                          color: '#f87171',
                          background: 'rgba(239, 68, 68, 0.1)',
                          padding: '10px 12px',
                          borderRadius: '8px',
                          marginBottom: '16px',
                        }}
                      >
                        🔒 Certificate locked. Complete all lessons (100%) to unlock download.
                      </p>

                      <Link
                        to={`/lesson?course=${cert.courseSlug}`}
                        className="btn primary full"
                        style={{ width: '100%', textAlign: 'center', textDecoration: 'none' }}
                      >
                        Continue Course ({cert.progress}%) →
                      </Link>
                    </>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </main>

      {/* OFFICIAL PRINTABLE CERTIFICATE MODAL */}
      {selectedCertificate && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(3, 7, 18, 0.85)',
            backdropFilter: 'blur(8px)',
            zIndex: 1000,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '20px',
          }}
          onClick={() => setSelectedCertificate(null)}
        >
          <div
            style={{
              background: '#0b1120',
              border: '2px solid #3b82f6',
              borderRadius: '20px',
              maxWidth: '800px',
              width: '100%',
              padding: '36px',
              boxShadow: '0 25px 60px rgba(0, 0, 0, 0.6)',
              position: 'relative',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Close Button */}
            <button
              onClick={() => setSelectedCertificate(null)}
              style={{
                position: 'absolute',
                top: '18px',
                right: '18px',
                background: 'transparent',
                border: 'none',
                color: '#94a3b8',
                fontSize: '20px',
                cursor: 'pointer',
              }}
            >
              <FaTimes />
            </button>

            {/* CERTIFICATE DOCUMENT PREVIEW */}
            <div
              className="printable-certificate"
              style={{
                background: 'linear-gradient(135deg, #090d16 0%, #111827 100%)',
                border: '3px solid #f59e0b',
                borderRadius: '16px',
                padding: '40px 32px',
                textAlign: 'center',
                position: 'relative',
                boxShadow: 'inset 0 0 30px rgba(245, 158, 11, 0.1)',
                marginBottom: '24px',
              }}
            >
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', color: '#fbbf24', fontSize: '13px', fontWeight: '800', letterSpacing: '2px', textTransform: 'uppercase', marginBottom: '14px' }}>
                <FaGraduationCap style={{ fontSize: '18px' }} /> CODELEARN ACADEMY VERIFIED CREDENTIAL
              </div>

              <h1 style={{ fontSize: '32px', fontWeight: '900', color: '#f8fafc', margin: '0 0 8px 0', letterSpacing: '-0.5px' }}>
                Certificate of Completion
              </h1>
              <p style={{ color: '#94a3b8', fontSize: '14px', margin: '0 0 24px 0' }}>
                This is proudly presented to verify that
              </p>

              <div
                style={{
                  fontSize: '28px',
                  fontWeight: '800',
                  color: '#38bdf8',
                  borderBottom: '2px dashed #334155',
                  paddingBottom: '8px',
                  maxWidth: '450px',
                  margin: '0 auto 20px auto',
                }}
              >
                {studentName}
              </div>

              <p style={{ color: '#cbd5e1', fontSize: '15px', lineHeight: '1.6', maxWidth: '580px', margin: '0 auto 28px auto' }}>
                has successfully completed all requirements, coding exercises, and final assessments for the accredited course:
              </p>

              <h2
                style={{
                  fontSize: '24px',
                  fontWeight: '800',
                  color: '#f59e0b',
                  margin: '0 0 28px 0',
                }}
              >
                {selectedCertificate.title}
              </h2>

              {/* Certificate Metadata Footer */}
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'flex-end',
                  borderTop: '1px solid #1f2937',
                  paddingTop: '20px',
                  marginTop: '10px',
                  fontSize: '13px',
                  color: '#94a3b8',
                  flexWrap: 'wrap',
                  gap: '16px',
                }}
              >
                <div style={{ textAlign: 'left' }}>
                  <div style={{ color: '#64748b', fontSize: '11px', textTransform: 'uppercase' }}>Issued Date</div>
                  <strong style={{ color: '#f8fafc' }}>{selectedCertificate.issuedDate}</strong>
                  <div style={{ marginTop: '4px', fontSize: '11px', color: '#64748b' }}>
                    Grade: <span style={{ color: '#34d399' }}>{selectedCertificate.grade}</span>
                  </div>
                </div>

                <div style={{ textAlign: 'center' }}>
                  <div style={{ width: '48px', height: '48px', borderRadius: '50%', background: 'rgba(245, 158, 11, 0.15)', border: '2px solid #f59e0b', margin: '0 auto 6px auto', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '22px' }}>
                    🏅
                  </div>
                  <span style={{ fontSize: '11px', color: '#fbbf24', fontWeight: '700' }}>VERIFIED CODELEARN SEAL</span>
                </div>

                <div style={{ textAlign: 'right' }}>
                  <div style={{ color: '#64748b', fontSize: '11px', textTransform: 'uppercase' }}>Credential ID</div>
                  <strong style={{ color: '#f8fafc', fontFamily: 'monospace' }}>{selectedCertificate.credentialId}</strong>
                  <div style={{ marginTop: '4px', fontSize: '11px', color: '#64748b' }}>
                    Instructor: <span style={{ color: '#cbd5e1' }}>{selectedCertificate.instructor}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* ACTION BUTTONS */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
              <button
                className="btn btn-outline"
                onClick={() => setSelectedCertificate(null)}
              >
                Close
              </button>
              <button
                className="btn btn-primary"
                onClick={handlePrintCertificate}
                style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}
              >
                <FaPrint /> Print / Save as PDF
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Certificates;
