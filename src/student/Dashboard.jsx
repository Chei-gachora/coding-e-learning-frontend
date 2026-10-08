import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import logo from '../assets/codelearn_logo.jpg';
import { FaHandsClapping } from "react-icons/fa6";
import { IoBookSharp } from "react-icons/io5";
import { SiProgress } from "react-icons/si";
import { SiTicktick } from "react-icons/si";
import { GiTrophyCup } from "react-icons/gi";
import { ImHtmlFive } from "react-icons/im";
import { FaSyringe } from "react-icons/fa";
import { LuMessageCircleCode } from "react-icons/lu";
import Sidebar from '../components/Sidebar';

export default function StudentDashboard() {
  const { user, logout, switchRole } = useAuth();
  const navigate = useNavigate();

  // Interactive local state for student activities & lab submission
  const [tasks, setTasks] = useState(() => {
    const saved = localStorage.getItem(`codelearn_tasks_${user?.id}`);
    return saved ? JSON.parse(saved) : [
      { id: 1, title: 'HTML Forms Tutorial', desc: 'Complete the lesson tutorial', completed: false, category: 'Lesson' },
      { id: 2, title: 'Form Exercise', desc: 'Practice creating HTML form controls', completed: false, category: 'Exercise' },
      { id: 3, title: 'HTML Introduction', desc: 'Lesson completed', completed: true, category: 'Lesson' }
    ];
  });

  const [submittedLabs, setSubmittedLabs] = useState(() => {
    const saved = localStorage.getItem(`codelearn_labs_${user?.id}`);
    return saved ? JSON.parse(saved) : [
      { id: 1, title: 'Personal Profile Webpage', status: 'Due Today', submitted: false, code: '' }
    ];
  });

  // Sync state to localStorage for independent sessions
  useEffect(() => {
    if (user?.id) {
      localStorage.setItem(`codelearn_tasks_${user.id}`, JSON.stringify(tasks));
    }
  }, [tasks, user?.id]);

  useEffect(() => {
    if (user?.id) {
      localStorage.setItem(`codelearn_labs_${user.id}`, JSON.stringify(submittedLabs));
    }
  }, [submittedLabs, user?.id]);

  const [showLabModal, setShowLabModal] = useState(false);
  const [activeLab, setActiveLab] = useState(null);
  const [labCodeInput, setLabCodeInput] = useState('');
  const [notification, setNotification] = useState('');

  const toggleTask = (id) => {
    setTasks(tasks.map(t => t.id === id ? { ...t, completed: !t.completed } : t));
  };

  const handleOpenLabModal = (lab) => {
    setActiveLab(lab);
    setLabCodeInput(lab.code || '<!DOCTYPE html>\n<html>\n  <head><title>My Profile</title></head>\n  <body>\n    <h1>Hello World</h1>\n  </body>\n</html>');
    setShowLabModal(true);
  };

  const handleSubmitLab = (e) => {
    e.preventDefault();
    setSubmittedLabs(submittedLabs.map(l => l.id === activeLab.id ? { ...l, submitted: true, code: labCodeInput, status: 'Submitted - Pending Grade' } : l));
    setShowLabModal(false);
    showTempNotification('Lab submission uploaded successfully for instructor review! 🎉');
  };

  const showTempNotification = (msg) => {
    setNotification(msg);
    setTimeout(() => setNotification(''), 4000);
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const userName = user?.name || 'Alex Johnson';

  return (
    <div className="dashboard-layout">
      <Sidebar />
      <div className="main-content" style={{ display: 'flex', flexDirection: 'column' }}>

      {notification && (
        <div style={{ background: '#10b981', color: '#fff', textAlign: 'center', padding: '10px', fontWeight: '600', fontSize: '14px' }}>
          {notification}
        </div>
      )}

      <main className="dashboard" style={{ minHeight: 'unset', paddingTop: '0' }}>
        <div className="container" style={{ maxWidth: '100%', padding: '0' }}>
          {/* WELCOME */}
          <section className="welcome-section" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'linear-gradient(135deg, #131c2e 0%, #1e293b 100%)', padding: '28px', borderRadius: '16px', border: '1px solid #24344d', marginBottom: '28px' }}>
            <div>
              <span className="badge badge-success" style={{ marginBottom: '10px' }}>🎓 STUDENT PORTAL</span>
              <h1 style={{ fontSize: '28px', marginTop: '6px', color: '#ffffff' }}>Welcome back, {userName}! <FaHandsClapping /></h1>
              <p style={{ color: '#94a3b8', marginTop: '4px' }}>
                Track your course progress, complete daily labs, and build real-world coding projects.
              </p>
            </div>
            <div style={{ display: 'flex', gap: '10px' }}>
              <Link to="/courses" className="btn btn-primary">
                Browse Courses
              </Link>
            </div>
          </section>

          {/* PROGRESS OVERVIEW STATS */}
          <section className="dashboard-stats" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px', marginBottom: '28px' }}>
            <div className="dashboard-stat card" style={{ padding: '20px' }}>
              <div className="stat-icon" style={{ fontSize: '28px' }}><IoBookSharp /></div>
              <div>
                <strong style={{ fontSize: '24px' }}>3</strong>
                <span style={{ display: 'block', color: '#94a3b8', fontSize: '13px' }}>Enrolled Courses</span>
              </div>
            </div>

            <div className="dashboard-stat card" style={{ padding: '20px' }}>
              <div className="stat-icon" style={{ fontSize: '28px' }}><SiProgress /></div>
              <div>
                <strong style={{ fontSize: '24px' }}>42%</strong>
                <span style={{ display: 'block', color: '#94a3b8', fontSize: '13px' }}>Overall Progress</span>
              </div>
            </div>

            <div className="dashboard-stat card" style={{ padding: '20px' }}>
              <div className="stat-icon" style={{ fontSize: '28px' }}><SiTicktick /></div>
              <div>
                <strong style={{ fontSize: '24px' }}>
                  {18 + tasks.filter(t => t.completed).length}
                </strong>
                <span style={{ display: 'block', color: '#94a3b8', fontSize: '13px' }}>Completed Lessons</span>
              </div>
            </div>

            <div className="dashboard-stat card" style={{ padding: '20px' }}>
              <div className="stat-icon" style={{ fontSize: '28px' }}><GiTrophyCup /></div>
              <div>
                <strong style={{ fontSize: '24px' }}>76%</strong>
                <span style={{ display: 'block', color: '#94a3b8', fontSize: '13px' }}>Average Grade</span>
              </div>
            </div>
          </section>

          {/* CURRENT LEARNING */}
          <section className="dashboard-section" style={{ marginBottom: '28px' }}>
            <div className="section-title" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <div>
                <span style={{ fontSize: '12px', fontWeight: '700', color: '#3b82f6', letterSpacing: '0.5px' }}>CONTINUE LEARNING</span>
                <h2 style={{ fontSize: '20px' }}>Current Course</h2>
              </div>
              <Link to="/courses" style={{ fontSize: '14px' }}>View All Courses →</Link>
            </div>

            <div className="current-course card" style={{ padding: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '20px' }}>
              <div className="course-main" style={{ display: 'flex', gap: '20px', alignItems: 'center' }}>
                <div className="large-course-icon" style={{ fontSize: '40px', background: 'rgba(59, 130, 246, 0.1)', padding: '16px', borderRadius: '12px' }}><ImHtmlFive /></div>
                <div>
                  <span className="course-label" style={{ fontSize: '12px', color: '#06b6d4', fontWeight: '700' }}>FULL-STACK DEVELOPMENT</span>
                  <h3 style={{ fontSize: '18px', margin: '4px 0' }}>HTML &amp; Web Fundamentals</h3>
                  <p style={{ color: '#94a3b8', fontSize: '14px', marginBottom: '12px' }}>
                    Learn the foundations of HTML5 semantic elements and web page structures.
                  </p>
                  <div className="progress-info" style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', marginBottom: '6px' }}>
                    <span>Course Progress</span>
                    <strong>45%</strong>
                  </div>
                  <div className="progress-bar" style={{ width: '300px', height: '8px', background: '#1e293b', borderRadius: '4px', overflow: 'hidden' }}>
                    <div className="progress-fill" style={{ width: '45%', height: '100%', background: '#3b82f6' }}></div>
                  </div>
                </div>
              </div>
              <Link to="/lesson" className="btn btn-primary">
                Continue Lesson
              </Link>
            </div>
          </section>

          {/* TWO COLUMN AREA */}
          <section className="dashboard-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px', marginBottom: '28px' }}>
            {/* TODAY'S INTERACTIVE TASKS */}
            <div className="dashboard-section">
              <div className="section-title" style={{ marginBottom: '16px' }}>
                <span style={{ fontSize: '12px', fontWeight: '700', color: '#3b82f6' }}>INTERACTIVE TASKS</span>
                <h2 style={{ fontSize: '20px' }}>Today's Activities</h2>
              </div>

              <div className="activity-list" style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {tasks.map((t) => (
                  <div
                    key={t.id}
                    className="activity-item card"
                    onClick={() => toggleTask(t.id)}
                    style={{
                      padding: '14px 18px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      cursor: 'pointer',
                      borderLeft: t.completed ? '4px solid #10b981' : '4px solid #f59e0b',
                      opacity: t.completed ? 0.8 : 1
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <input
                        type="checkbox"
                        checked={t.completed}
                        onChange={() => toggleTask(t.id)}
                        style={{ width: '18px', height: '18px', cursor: 'pointer' }}
                      />
                      <div>
                        <h3 style={{ fontSize: '15px', textDecoration: t.completed ? 'line-through' : 'none' }}>{t.title}</h3>
                        <p style={{ fontSize: '13px', color: '#94a3b8' }}>{t.desc}</p>
                      </div>
                    </div>
                    <span className={`badge ${t.completed ? 'badge-success' : 'badge-warning'}`}>
                      {t.completed ? '✓ Completed' : 'Pending'}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* PENDING LABS */}
            <div className="dashboard-section">
              <div className="section-title" style={{ marginBottom: '16px' }}>
                <span style={{ fontSize: '12px', fontWeight: '700', color: '#3b82f6' }}>PRACTICAL WORK</span>
                <h2 style={{ fontSize: '20px' }}>Lab Submissions</h2>
              </div>

              {submittedLabs.map((lab) => (
                <div key={lab.id} className="lab-card card" style={{ padding: '20px', display: 'flex', alignItems: 'center', gap: '16px', justifyContent: 'space-between' }}>
                  <div style={{ display: 'flex', gap: '14px', alignItems: 'center' }}>
                    <div className="lab-icon" style={{ fontSize: '28px' }}><FaSyringe /></div>
                    <div>
                      <h3 style={{ fontSize: '16px' }}>{lab.title}</h3>
                      <p style={{ fontSize: '13px', color: '#94a3b8' }}>Create a personal profile webpage using semantic HTML elements.</p>
                      <span className="deadline" style={{ fontSize: '12px', color: lab.submitted ? '#34d399' : '#fbbf24', marginTop: '4px', display: 'inline-block' }}>
                        {lab.submitted ? '<SiTicktick /> Submitted for Grading' : '⏰ Due Today'}
                      </span>
                    </div>
                  </div>
                  <button
                    onClick={() => handleOpenLabModal(lab)}
                    className={`btn ${lab.submitted ? 'btn-outline' : 'btn-primary'}`}
                  >
                    {lab.submitted ? 'View / Edit Code' : 'Submit Lab'}
                  </button>
                </div>
              ))}
            </div>
          </section>

          {/* RESULTS AND FEEDBACK */}
          <section className="dashboard-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px', marginBottom: '28px' }}>
            <div className="dashboard-section">
              <div className="section-title" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                <div>
                  <span style={{ fontSize: '12px', fontWeight: '700', color: '#3b82f6' }}>ASSESSMENTS</span>
                  <h2 style={{ fontSize: '20px' }}>Recent Quiz Result</h2>
                </div>
                <Link to="/results" style={{ fontSize: '13px' }}>View All →</Link>
              </div>

              <div className="result-card card" style={{ padding: '20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', gap: '14px', alignItems: 'center' }}>
                  <div className="result-icon" style={{ fontSize: '28px' }}><GiTrophyCup /></div>
                  <div>
                    <h3 style={{ fontSize: '16px' }}>HTML Fundamentals Quiz</h3>
                    <p style={{ fontSize: '13px', color: '#94a3b8' }}>Module 1 Assessment</p>
                  </div>
                </div>
                <div className="result-score" style={{ textAlign: 'right' }}>
                  <strong style={{ fontSize: '20px', display: 'block', color: '#34d399' }}>76%</strong>
                  <span className="badge badge-success">Passed</span>
                </div>
              </div>
            </div>

            <div className="dashboard-section">
              <div className="section-title" style={{ marginBottom: '16px' }}>
                <span style={{ fontSize: '12px', fontWeight: '700', color: '#3b82f6' }}>INSTRUCTOR FEEDBACK</span>
                <h2 style={{ fontSize: '20px' }}>Latest Feedback</h2>
              </div>

              <div className="feedback-card card" style={{ padding: '20px', display: 'flex', gap: '14px' }}>
                <div className="feedback-icon" style={{ fontSize: '28px' }}><LuMessageCircleCode /></div>
                <div>
                  <h3 style={{ fontSize: '16px' }}>HTML Profile Lab</h3>
                  <p style={{ fontSize: '14px', color: '#cbd5e1', italic: 'true', margin: '4px 0' }}>
                    “Good structure and clear use of HTML elements! Keep up the great work.”
                  </p>
                  <span style={{ fontSize: '12px', color: '#64748b' }}>— Dr. Sarah Jenkins (Instructor)</span>
                </div>
              </div>
            </div>
          </section>
        </div>
      </main>

      {/* LAB SUBMISSION MODAL */}
      {showLabModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '20px' }}>
          <div className="card" style={{ width: '100%', maxWidth: '650px', background: '#131c2e', padding: '24px', border: '1px solid #3b82f6', borderRadius: '16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h2 style={{ fontSize: '20px' }}>🧪 Submit Lab Work: {activeLab?.title}</h2>
              <button onClick={() => setShowLabModal(false)} style={{ background: 'transparent', border: 'none', color: '#94a3b8', fontSize: '20px', cursor: 'pointer' }}>✕</button>
            </div>
            
            <form onSubmit={handleSubmitLab}>
              <div className="form-group" style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', marginBottom: '6px', fontSize: '13px', color: '#94a3b8' }}>Paste your HTML Solution Code:</label>
                <textarea
                  value={labCodeInput}
                  onChange={(e) => setLabCodeInput(e.target.value)}
                  rows={8}
                  style={{ width: '100%', background: '#090d16', border: '1px solid #24344d', color: '#38bdf8', fontFamily: 'monospace', padding: '12px', borderRadius: '8px', fontSize: '13px' }}
                  required
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
                <button type="button" onClick={() => setShowLabModal(false)} className="btn btn-outline">Cancel</button>
                <button type="submit" className="btn btn-primary">Submit to Instructor →</button>
              </div>
            </form>
          </div>
        </div>
      )}

      <footer className="site-footer" style={{ borderTop: '1px solid #24344d', padding: '20px 0', marginTop: '40px' }}>
        <div className="container" style={{ display: 'flex', justifyContent: 'space-between', color: '#64748b', fontSize: '14px' }}>
          <p>© 2026 CodeLearn. Student Portal.</p>
          <p>LoggedIn as: {userName} (Student)</p>
        </div>
      </footer>
      </div>
    </div>
  );
}

