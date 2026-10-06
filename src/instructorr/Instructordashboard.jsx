import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import logo from '../assets/codelearn_logo.jpg';
import { IoBookSharp } from "react-icons/io5";
import { FaLaptopCode } from "react-icons/fa6";
import Sidebar from '../components/Sidebar';

export default function InstructorDashboard() {
  const { user, logout, switchRole } = useAuth();
  const navigate = useNavigate();

  // State for pending student submissions
  const [submissions, setSubmissions] = useState(() => {
    const saved = localStorage.getItem(`codelearn_instructor_submissions_${user?.id}`);
    return saved ? JSON.parse(saved) : [
      { id: 1, student: 'Brian Mwangi', activity: 'CSS Styling Challenge', date: '09 Sep 2026', status: 'Pending', score: null, feedback: '', code: '<style>\n  body { background: #0f172a; color: white; }\n  .card { padding: 20px; border-radius: 8px; }\n</style>' },
      { id: 2, student: 'Ann Wanjiku', activity: 'HTML Profile Page', date: '09 Sep 2026', status: 'Pending', score: null, feedback: '', code: '<!DOCTYPE html>\n<html>\n  <body>\n    <h1>Ann Wanjiku Profile</h1>\n  </body>\n</html>' },
      { id: 3, student: 'Kevin Otieno', activity: 'JavaScript Array Exercise', date: '08 Sep 2026', status: 'Pending', score: null, feedback: '', code: 'function filterScores(arr) {\n  return arr.filter(score => score >= 70);\n}' }
    ];
  });

  // Modal states
  const [gradingSubmission, setGradingSubmission] = useState(null);
  const [gradeInput, setGradeInput] = useState('85');
  const [feedbackInput, setFeedbackInput] = useState('Great structure! Good understanding of the concepts.');

  const [activeModal, setActiveModal] = useState(null); // 'course' | 'lesson' | 'exercise' | 'lab'
  const [newItemTitle, setNewItemTitle] = useState('');
  const [notification, setNotification] = useState('');

  const [courses, setCourses] = useState(() => {
    const saved = localStorage.getItem(`codelearn_instructor_courses_${user?.id}`);
    return saved ? JSON.parse(saved) : [
      { id: 1, title: 'HTML Fundamentals', students: 65, progress: 72 },
      { id: 2, title: 'CSS Fundamentals', students: 54, progress: 48 },
      { id: 3, title: 'JavaScript Essentials', students: 38, progress: 31 },
      { id: 4, title: 'React Web Development', students: 29, progress: 15 }
    ];
  });

  // Sync state to localStorage for independent sessions
  useEffect(() => {
    if (user?.id) {
      localStorage.setItem(`codelearn_instructor_submissions_${user.id}`, JSON.stringify(submissions));
    }
  }, [submissions, user?.id]);

  useEffect(() => {
    if (user?.id) {
      localStorage.setItem(`codelearn_instructor_courses_${user.id}`, JSON.stringify(courses));
    }
  }, [courses, user?.id]);

  const handleOpenGradeModal = (sub) => {
    setGradingSubmission(sub);
    setGradeInput(sub.score ? String(sub.score) : '90');
    setFeedbackInput(sub.feedback || 'Well structured work! Approved.');
  };

  const handleSaveGrade = (e) => {
    e.preventDefault();
    setSubmissions(submissions.map(s => 
      s.id === gradingSubmission.id 
        ? { ...s, status: `Graded (${gradeInput}%)`, score: gradeInput, feedback: feedbackInput } 
        : s
    ));
    setGradingSubmission(null);
    showTempNotification(`Grade (${gradeInput}%) & feedback sent to ${gradingSubmission.student}! ✅`);
  };

  const handleCreateContent = (e) => {
    e.preventDefault();
    if (!newItemTitle) return;
    if (activeModal === 'course') {
      setCourses([...courses, { id: Date.now(), title: newItemTitle, students: 0, progress: 0 }]);
      showTempNotification(`New course "${newItemTitle}" created! 📚`);
    } else {
      showTempNotification(`New ${activeModal} "${newItemTitle}" published! 🚀`);
    }
    setNewItemTitle('');
    setActiveModal(null);
  };

  const showTempNotification = (msg) => {
    setNotification(msg);
    setTimeout(() => setNotification(''), 4000);
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const instructorName = user?.name || 'Dr. Sarah Jenkins';

  return (
    <div className="dashboard-layout">
      <Sidebar />
      <div className="main-content" style={{ display: 'flex', flexDirection: 'column' }}>

      {notification && (
        <div style={{ background: '#10b981', color: '#fff', textAlign: 'center', padding: '10px', fontWeight: '600', fontSize: '14px' }}>
          {notification}
        </div>
      )}

      <main className="instructor-page" style={{ minHeight: 'unset', padding: '0' }}>
        <div className="container" style={{ paddingTop: '0', maxWidth: '100%', padding: '0' }}>
          <div className="instructor-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'linear-gradient(135deg, #1e1b4b 0%, #1e293b 100%)', padding: '28px', borderRadius: '16px', border: '1px solid #4338ca', marginBottom: '28px' }}>
            <div>
              <span className="badge" style={{ background: 'rgba(139, 92, 246, 0.2)', color: '#c084fc', border: '1px solid rgba(139, 92, 246, 0.4)', marginBottom: '8px' }}>
                👨‍🏫 INSTRUCTOR PORTAL
              </span>
              <h1 style={{ fontSize: '28px', marginTop: '6px' }}>Instructor Dashboard</h1>
              <p style={{ color: '#94a3b8', marginTop: '4px' }}>
                Manage courses, review student code submissions, evaluate daily labs, and guide learners.
              </p>
            </div>
            <button onClick={() => setActiveModal('course')} className="btn btn-primary" style={{ background: 'linear-gradient(135deg, #8b5cf6 0%, #6d28d9 100%)' }}>
              + Create New Course
            </button>
          </div>

          <section className="instructor-stats" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', marginBottom: '28px' }}>
            <div className="instructor-stat-card card" style={{ padding: '20px' }}>
              <span style={{ color: '#94a3b8', fontSize: '13px' }}>Total Courses</span>
              <strong style={{ display: 'block', fontSize: '26px', margin: '4px 0' }}>{courses.length}</strong>
              <small style={{ color: '#34d399' }}>Active courses</small>
            </div>
            <div className="instructor-stat-card card" style={{ padding: '20px' }}>
              <span style={{ color: '#94a3b8', fontSize: '13px' }}>Total Students</span>
              <strong style={{ display: 'block', fontSize: '26px', margin: '4px 0' }}>86</strong>
              <small style={{ color: '#60a5fa' }}>Enrolled learners</small>
            </div>
            <div className="instructor-stat-card card" style={{ padding: '20px' }}>
              <span style={{ color: '#94a3b8', fontSize: '13px' }}>Pending Submissions</span>
              <strong style={{ display: 'block', fontSize: '26px', margin: '4px 0', color: '#fbbf24' }}>
                {submissions.filter(s => s.status.includes('Pending')).length}
              </strong>
              <small style={{ color: '#fbbf24' }}>Waiting for review</small>
            </div>
            <div className="instructor-stat-card card" style={{ padding: '20px' }}>
              <span style={{ color: '#94a3b8', fontSize: '13px' }}>Students Behind</span>
              <strong style={{ display: 'block', fontSize: '26px', margin: '4px 0', color: '#f87171' }}>7</strong>
              <small style={{ color: '#f87171' }}>Need attention</small>
            </div>
          </section>

          {/* COURSE & CONTENT MANAGEMENT */}
          <section className="instructor-management" style={{ marginBottom: '32px' }}>
            <div className="section-heading" style={{ marginBottom: '16px' }}>
              <h2 style={{ fontSize: '20px' }}>Management Actions</h2>
            </div>

            <div className="management-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px' }}>
              <div className="management-card card" style={{ padding: '20px' }}>
                <div style={{ fontSize: '32px', marginBottom: '8px' }}><IoBookSharp /></div>
                <h3 style={{ fontSize: '16px' }}>Courses</h3>
                <p style={{ fontSize: '13px', color: '#94a3b8', margin: '6px 0 14px' }}>Create and manage coding courses.</p>
                <button onClick={() => setActiveModal('course')} className="btn btn-small btn-outline" style={{ width: '100%' }}>
                  + Add Course
                </button>
              </div>

              <div className="management-card card" style={{ padding: '20px' }}>
                <div style={{ fontSize: '32px', marginBottom: '8px' }}>📖</div>
                <h3 style={{ fontSize: '16px' }}>Lessons</h3>
                <p style={{ fontSize: '13px', color: '#94a3b8', margin: '6px 0 14px' }}>Organize modules and tutorial lessons.</p>
                <button onClick={() => setActiveModal('lesson')} className="btn btn-small btn-outline" style={{ width: '100%' }}>
                  + Add Lesson
                </button>
              </div>

              <div className="management-card card" style={{ padding: '20px' }}>
                <div style={{ fontSize: '32px', marginBottom: '8px' }}><FaLaptopCode /></div>
                <h3 style={{ fontSize: '16px' }}>Exercises</h3>
                <p style={{ fontSize: '13px', color: '#94a3b8', margin: '6px 0 14px' }}>Create coding tasks and starter code.</p>
                <button onClick={() => setActiveModal('exercise')} className="btn btn-small btn-outline" style={{ width: '100%' }}>
                  + Add Exercise
                </button>
              </div>

              <div className="management-card card" style={{ padding: '20px' }}>
                <div style={{ fontSize: '32px', marginBottom: '8px' }}>🧪</div>
                <h3 style={{ fontSize: '16px' }}>Daily Labs</h3>
                <p style={{ fontSize: '13px', color: '#94a3b8', margin: '6px 0 14px' }}>Create practical lab assignments.</p>
                <button onClick={() => setActiveModal('lab')} className="btn btn-small btn-outline" style={{ width: '100%' }}>
                  + Add Daily Lab
                </button>
              </div>
            </div>
          </section>

          {/* INTERACTIVE PENDING SUBMISSIONS TABLE */}
          <section className="instructor-submissions" style={{ marginBottom: '32px' }}>
            <div className="section-heading" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <div>
                <h2 style={{ fontSize: '20px' }}>Student Submissions</h2>
                <p style={{ fontSize: '13px', color: '#94a3b8' }}>Review submitted code and assign grades.</p>
              </div>
            </div>

            <div className="card" style={{ padding: '0', overflow: 'hidden' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1.5fr 1fr 1fr 1fr', padding: '14px 20px', background: '#090d16', borderBottom: '1px solid #24344d', fontWeight: '600', fontSize: '13px', color: '#94a3b8' }}>
                <span>Student Name</span>
                <span>Assignment</span>
                <span>Date Submitted</span>
                <span>Status</span>
                <span style={{ textAlign: 'right' }}>Action</span>
              </div>

              {submissions.map((sub) => (
                <div key={sub.id} style={{ display: 'grid', gridTemplateColumns: '1.2fr 1.5fr 1fr 1fr 1fr', padding: '16px 20px', borderBottom: '1px solid #1e293b', alignItems: 'center', fontSize: '14px' }}>
                  <strong>{sub.student}</strong>
                  <span>{sub.activity}</span>
                  <span style={{ color: '#94a3b8' }}>{sub.date}</span>
                  <div>
                    <span className={`badge ${sub.status.includes('Graded') ? 'badge-success' : 'badge-warning'}`}>
                      {sub.status}
                    </span>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <button
                      onClick={() => handleOpenGradeModal(sub)}
                      className="btn btn-small btn-primary"
                    >
                      {sub.status.includes('Graded') ? 'Edit Grade' : 'Review & Grade'}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* STUDENT PROGRESS OVERVIEW */}
          <section className="student-progress-section" style={{ marginBottom: '32px' }}>
            <div className="section-heading" style={{ marginBottom: '16px' }}>
              <h2 style={{ fontSize: '20px' }}>Course Performance Overview</h2>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {courses.map((course) => (
                <div key={course.id} className="card" style={{ padding: '18px 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <strong style={{ fontSize: '16px', display: 'block' }}>{course.title}</strong>
                    <span style={{ fontSize: '13px', color: '#94a3b8' }}>{course.students} students enrolled</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '16px', width: '300px' }}>
                    <div style={{ flex: 1, height: '8px', background: '#1e293b', borderRadius: '4px', overflow: 'hidden' }}>
                      <div style={{ width: `${course.progress}%`, height: '100%', background: '#8b5cf6' }}></div>
                    </div>
                    <strong style={{ fontSize: '14px', width: '40px', textAlign: 'right' }}>{course.progress}%</strong>
                  </div>
                </div>
              ))}
            </div>
          </section>
        </div>
      </main>

      {/* GRADE SUBMISSION MODAL */}
      {gradingSubmission && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '20px' }}>
          <div className="card" style={{ width: '100%', maxWidth: '650px', background: '#131c2e', padding: '24px', border: '1px solid #8b5cf6', borderRadius: '16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h2 style={{ fontSize: '20px' }}>📝 Review &amp; Grade: {gradingSubmission.student}</h2>
              <button onClick={() => setGradingSubmission(null)} style={{ background: 'transparent', border: 'none', color: '#94a3b8', fontSize: '20px', cursor: 'pointer' }}>✕</button>
            </div>

            <p style={{ fontSize: '14px', color: '#94a3b8', marginBottom: '12px' }}>
              Submitted Code for <strong>{gradingSubmission.activity}</strong>:
            </p>

            <pre style={{ background: '#090d16', padding: '12px', borderRadius: '8px', border: '1px solid #24344d', color: '#38bdf8', fontSize: '13px', overflowX: 'auto', marginBottom: '16px' }}>
              {gradingSubmission.code}
            </pre>

            <form onSubmit={handleSaveGrade}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '16px', marginBottom: '16px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '13px', color: '#94a3b8', marginBottom: '6px' }}>Numeric Score (0 - 100%):</label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    className="form-control"
                    value={gradeInput}
                    onChange={(e) => setGradeInput(e.target.value)}
                    required
                    style={{ background: '#090d16', border: '1px solid #334155', color: '#fff', padding: '10px', borderRadius: '6px', width: '100%' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '13px', color: '#94a3b8', marginBottom: '6px' }}>Written Feedback:</label>
                  <input
                    type="text"
                    className="form-control"
                    value={feedbackInput}
                    onChange={(e) => setFeedbackInput(e.target.value)}
                    required
                    style={{ background: '#090d16', border: '1px solid #334155', color: '#fff', padding: '10px', borderRadius: '6px', width: '100%' }}
                  />
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
                <button type="button" onClick={() => setGradingSubmission(null)} className="btn btn-outline">Cancel</button>
                <button type="submit" className="btn btn-primary" style={{ background: '#8b5cf6' }}>Save Grade &amp; Send Feedback →</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* CREATE ITEM MODAL */}
      {activeModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '20px' }}>
          <div className="card" style={{ width: '100%', maxWidth: '500px', background: '#131c2e', padding: '24px', border: '1px solid #8b5cf6', borderRadius: '16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h2 style={{ fontSize: '20px', textTransform: 'capitalize' }}>Create New {activeModal}</h2>
              <button onClick={() => setActiveModal(null)} style={{ background: 'transparent', border: 'none', color: '#94a3b8', fontSize: '20px', cursor: 'pointer' }}>✕</button>
            </div>

            <form onSubmit={handleCreateContent}>
              <div className="form-group" style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', fontSize: '13px', color: '#94a3b8', marginBottom: '6px' }}>Title / Name:</label>
                <input
                  type="text"
                  className="form-control"
                  placeholder={`Enter ${activeModal} title...`}
                  value={newItemTitle}
                  onChange={(e) => setNewItemTitle(e.target.value)}
                  required
                  style={{ background: '#090d16', border: '1px solid #334155', color: '#fff', padding: '10px', borderRadius: '6px', width: '100%' }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
                <button type="button" onClick={() => setActiveModal(null)} className="btn btn-outline">Cancel</button>
                <button type="submit" className="btn btn-primary" style={{ background: '#8b5cf6' }}>Create {activeModal} →</button>
              </div>
            </form>
          </div>
        </div>
      )}

      <footer className="site-footer" style={{ borderTop: '1px solid #24344d', padding: '20px 0', marginTop: '40px' }}>
        <div className="container" style={{ display: 'flex', justifyContent: 'space-between', color: '#64748b', fontSize: '14px' }}>
          <p>© 2026 CodeLearn. Instructor Portal.</p>
          <p>LoggedIn as: {instructorName} (Instructor)</p>
        </div>
      </footer>
      </div>
    </div>
  );
}
