import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useCourses } from '../context/CourseContext';
import logo from '../assets/codelearn_logo.jpg';
import { IoBookSharp } from "react-icons/io5";
import { FaLaptopCode } from "react-icons/fa6";
import Sidebar from '../components/Sidebar';

export default function InstructorDashboard() {
  const { user, logout } = useAuth();
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
  const [newItemDescription, setNewItemDescription] = useState('');
  const [newItemLevel, setNewItemLevel] = useState('Beginner');
  const [selectedCourseId, setSelectedCourseId] = useState('');
  const [newItemModule, setNewItemModule] = useState('');
  const [newItemCode, setNewItemCode] = useState('');
  const [newItemExpected, setNewItemExpected] = useState('');
  const [expandedCourseId, setExpandedCourseId] = useState(null);
  const [expandedTab, setExpandedTab] = useState('lessons'); // 'lessons' | 'exercises'
  const [notification, setNotification] = useState('');

  const { courses, addCourse, addLesson, addExercise } = useCourses();

  // Sync submissions to localStorage for independent sessions
  useEffect(() => {
    if (user?.id) {
      localStorage.setItem(`codelearn_instructor_submissions_${user.id}`, JSON.stringify(submissions));
    }
  }, [submissions, user?.id]);

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

  const handleCreateContent = async (e) => {
    e.preventDefault();
    if (!newItemTitle.trim()) return;

    try {
      if (activeModal === 'course') {
        await addCourse(newItemTitle.trim(), newItemDescription.trim(), {
          level: newItemLevel,
        });
        showTempNotification(`Course "${newItemTitle.trim()}" was saved as a draft on the server.`);
      } else {
        const courseIdToUse = selectedCourseId || courses[0]?.id;
        if (!courseIdToUse) throw new Error('Create or select a course first.');
        const content = {
          title: newItemTitle.trim(),
          description: newItemDescription.trim(),
          moduleLabel: newItemModule.trim(),
          expectedResult: newItemExpected.trim(),
          starterCode: newItemCode.trim(),
          activityType: activeModal === 'lab' ? 'lab' : 'exercise',
        };
        if (activeModal === 'lesson') {
          await addLesson(courseIdToUse, content);
        } else if (activeModal === 'exercise' || activeModal === 'lab') {
          await addExercise(courseIdToUse, content);
        } else {
          throw new Error('This content type is not supported by the backend.');
        }
        showTempNotification(`${activeModal} "${newItemTitle.trim()}" was saved on the server.`);
      }
    } catch (error) {
      showTempNotification(error.message || 'Unable to save content.');
      return;
    }

    setNewItemTitle('');
    setNewItemDescription('');
    setNewItemLevel('Beginner');
    setSelectedCourseId('');
    setNewItemModule('');
    setNewItemCode('');
    setNewItemExpected('');
    setActiveModal(null);
  };

  const showTempNotification = (msg) => {
    setNotification(msg);
    setTimeout(() => setNotification(''), 4000);
  };

  const handleLogout = async () => {
    try {
      await logout();
      navigate('/login');
    } catch (error) {
      showTempNotification(`Unable to sign out: ${error.message}`);
    }
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
              <h1 style={{ fontSize: '28px', marginTop: '6px', color: '#ffffff' }}>Instructor Dashboard</h1>
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
            <div className="section-heading" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <div>
                <h2 style={{ fontSize: '20px' }}>Course Performance Overview</h2>
                <p style={{ fontSize: '13px', color: '#94a3b8', margin: '4px 0 0' }}>Real-time student enrollment and cohort completion statistics.</p>
              </div>
              <span className="badge" style={{ background: 'rgba(139, 92, 246, 0.2)', color: '#c084fc', border: '1px solid rgba(139, 92, 246, 0.4)' }}>
                {courses.length} Total Courses
              </span>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              {courses.map((course) => {
                const isExpanded = expandedCourseId === course.id;
                const lessonsCount = course.lessons || course.totalLessons || course.lessonsList?.length || 1;
                const exercisesCount = course.exercises || course.exercisesList?.length || 1;
                return (
                  <div
                    key={course.id}
                    className="card"
                    style={{
                      padding: '20px 24px',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '12px',
                      borderLeft: course.isNew ? '4px solid #8b5cf6' : course.hasNewExercise ? '4px solid #0284c7' : course.hasNewLesson ? '4px solid #10b981' : undefined,
                      transition: 'transform 0.2s ease, border-color 0.2s ease'
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                        <div style={{ fontSize: '26px', background: 'rgba(139, 92, 246, 0.1)', width: '46px', height: '46px', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          {course.thumbnail || '📘'}
                        </div>
                        <div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                            <strong style={{ fontSize: '16px' }}>{course.title}</strong>
                            {course.isNew && (
                              <span className="badge" style={{ background: '#8b5cf6', color: '#fff', fontSize: '11px', padding: '2px 8px' }}>NEW COURSE</span>
                            )}
                            {course.hasNewLesson && (
                              <span className="badge badge-success" style={{ fontSize: '11px', padding: '2px 8px' }}>+ NEW LESSON</span>
                            )}
                            {course.hasNewExercise && (
                              <span className="badge" style={{ background: '#0284c7', color: '#fff', fontSize: '11px', padding: '2px 8px' }}>+ NEW EXERCISE</span>
                            )}
                            <span className="badge" style={{ fontSize: '11px', background: 'rgba(255, 255, 255, 0.05)', color: '#94a3b8' }}>
                              {course.level || 'Beginner'}
                            </span>
                          </div>
                          <span style={{ fontSize: '13px', color: '#94a3b8', display: 'block', marginTop: '3px' }}>
                            {course.students} students enrolled • <strong style={{ color: '#38bdf8' }}>{lessonsCount} lessons</strong> • <strong style={{ color: '#06b6d4' }}>{exercisesCount} exercises</strong>
                            {course.latestExercise && (
                              <span style={{ color: '#0284c7', marginLeft: '8px' }}>• Latest Ex: {course.latestExercise}</span>
                            )}
                          </span>
                        </div>
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', width: '200px' }}>
                          <div style={{ flex: 1, height: '8px', background: '#1e293b', borderRadius: '4px', overflow: 'hidden' }}>
                            <div style={{ width: `${course.progress}%`, height: '100%', background: '#8b5cf6', transition: 'width 0.4s ease' }}></div>
                          </div>
                          <strong style={{ fontSize: '14px', width: '38px', textAlign: 'right' }}>{course.progress}%</strong>
                        </div>

                        <div style={{ display: 'flex', gap: '6px' }}>
                          <button
                            onClick={() => {
                              setSelectedCourseId(course.id);
                              setActiveModal('lesson');
                            }}
                            className="btn btn-small btn-outline"
                            style={{ borderColor: '#8b5cf6', color: '#c084fc', padding: '6px 10px' }}
                            title="Add a new lesson to this course"
                          >
                            + Lesson
                          </button>
                          <button
                            onClick={() => {
                              setSelectedCourseId(course.id);
                              setActiveModal('exercise');
                            }}
                            className="btn btn-small btn-outline"
                            style={{ borderColor: '#0284c7', color: '#38bdf8', padding: '6px 10px' }}
                            title="Add a new coding exercise to this course"
                          >
                            + Exercise
                          </button>
                          <button
                            onClick={() => setExpandedCourseId(isExpanded ? null : course.id)}
                            className="btn btn-small btn-outline"
                            style={{ background: isExpanded ? 'rgba(139, 92, 246, 0.15)' : 'transparent', padding: '6px 10px' }}
                          >
                            {isExpanded ? 'Hide ▲' : 'View Curriculum ▼'}
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* EXPANDED CONTENT DRAWER */}
                    {isExpanded && (
                      <div style={{ marginTop: '8px', paddingTop: '14px', borderTop: '1px solid #1e293b' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px', flexWrap: 'wrap', gap: '8px' }}>
                          <div style={{ display: 'flex', gap: '8px' }}>
                            <button
                              onClick={() => setExpandedTab('lessons')}
                              className={`btn btn-small ${expandedTab === 'lessons' ? 'btn-primary' : 'btn-outline'}`}
                              style={{ padding: '4px 12px', fontSize: '12px' }}
                            >
                              📖 Lessons ({course.lessonsList?.length || 1})
                            </button>
                            <button
                              onClick={() => setExpandedTab('exercises')}
                              className={`btn btn-small ${expandedTab === 'exercises' ? 'btn-primary' : 'btn-outline'}`}
                              style={{ padding: '4px 12px', fontSize: '12px' }}
                            >
                              💻 Exercises ({course.exercisesList?.length || 1})
                            </button>
                          </div>
                          <div style={{ display: 'flex', gap: '10px' }}>
                            <Link
                              to={`/lesson?course=${course.slug}`}
                              style={{ fontSize: '12px', color: '#8b5cf6', textDecoration: 'none' }}
                            >
                              Open Lessons Workspace →
                            </Link>
                            <Link
                              to={`/exercise?course=${course.slug}`}
                              style={{ fontSize: '12px', color: '#38bdf8', textDecoration: 'none' }}
                            >
                              Open Exercises Workspace →
                            </Link>
                          </div>
                        </div>

                        {expandedTab === 'lessons' ? (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                            {(course.lessonsList && course.lessonsList.length > 0 ? course.lessonsList : [
                              {
                                id: 'default-1',
                                lessonNumber: 1,
                                moduleLabel: 'MODULE 1 • LESSON 1',
                                title: `Core Foundations of ${course.title}`,
                                description: course.description
                              }
                            ]).map((lesson, idx) => (
                              <div
                                key={lesson.id || idx}
                                style={{
                                  display: 'flex',
                                  justifyContent: 'space-between',
                                  alignItems: 'center',
                                  padding: '10px 14px',
                                  background: '#090d16',
                                  borderRadius: '8px',
                                  border: '1px solid #1e293b'
                                }}
                              >
                                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                  <span style={{ width: '22px', height: '22px', borderRadius: '50%', background: '#1e293b', color: '#38bdf8', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '11px', fontWeight: 'bold' }}>
                                    {idx + 1}
                                  </span>
                                  <div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                      <strong style={{ fontSize: '14px', color: '#f8fafc' }}>{lesson.title}</strong>
                                      {lesson.isNew && (
                                        <span className="badge" style={{ background: '#10b981', color: '#fff', fontSize: '10px', padding: '1px 6px' }}>NEW</span>
                                      )}
                                    </div>
                                    <span style={{ fontSize: '12px', color: '#64748b' }}>
                                      {lesson.moduleLabel || `Module 1 • Lesson ${idx + 1}`} • {lesson.description?.slice(0, 60)}...
                                    </span>
                                  </div>
                                </div>
                                <Link
                                  to={`/lesson?course=${course.slug}&lesson=${lesson.id}`}
                                  className="btn btn-small btn-outline"
                                  style={{ fontSize: '12px', padding: '4px 10px' }}
                                >
                                  Preview Lesson →
                                </Link>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                            {(course.exercisesList && course.exercisesList.length > 0 ? course.exercisesList : [
                              {
                                id: 'default-ex-1',
                                exerciseNumber: 1,
                                moduleLabel: 'MODULE 1 • CODING EXERCISE',
                                taskTitle: `Practice Challenge for ${course.title}`,
                                taskDescription: `Complete the coding exercise for ${course.title}.`,
                                expectedResult: `Output from ${course.title}`
                              }
                            ]).map((ex, idx) => (
                              <div
                                key={ex.id || idx}
                                style={{
                                  display: 'flex',
                                  justifyContent: 'space-between',
                                  alignItems: 'center',
                                  padding: '10px 14px',
                                  background: '#090d16',
                                  borderRadius: '8px',
                                  border: '1px solid #1e293b'
                                }}
                              >
                                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                  <span style={{ width: '22px', height: '22px', borderRadius: '50%', background: '#0284c7', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '11px', fontWeight: 'bold' }}>
                                    {idx + 1}
                                  </span>
                                  <div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                      <strong style={{ fontSize: '14px', color: '#f8fafc' }}>{ex.taskTitle}</strong>
                                      {ex.isNew && (
                                        <span className="badge" style={{ background: '#0284c7', color: '#fff', fontSize: '10px', padding: '1px 6px' }}>NEW EXERCISE</span>
                                      )}
                                    </div>
                                    <span style={{ fontSize: '12px', color: '#64748b' }}>
                                      {ex.moduleLabel || `Module 1 • Exercise ${idx + 1}`} • Expected: "{ex.expectedResult}"
                                    </span>
                                  </div>
                                </div>
                                <Link
                                  to={`/exercise?course=${course.slug}&exercise=${ex.id}`}
                                  className="btn btn-small btn-outline"
                                  style={{ fontSize: '12px', padding: '4px 10px', borderColor: '#0284c7', color: '#38bdf8' }}
                                >
                                  Preview Exercise →
                                </Link>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
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
              <button
                onClick={() => {
                  setActiveModal(null);
                  setNewItemTitle('');
                  setNewItemDescription('');
                }}
                style={{ background: 'transparent', border: 'none', color: '#94a3b8', fontSize: '20px', cursor: 'pointer' }}
              >
                ✕
              </button>
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
                  autoFocus
                  style={{ background: '#090d16', border: '1px solid #334155', color: '#fff', padding: '10px', borderRadius: '6px', width: '100%' }}
                />
              </div>

              {activeModal === 'course' && (
                <>
                  <div className="form-group" style={{ marginBottom: '16px' }}>
                    <label style={{ display: 'block', fontSize: '13px', color: '#94a3b8', marginBottom: '6px' }}>Description (optional):</label>
                    <textarea
                      className="form-control"
                      rows="3"
                      placeholder="Brief overview of course concepts and student outcomes..."
                      value={newItemDescription}
                      onChange={(e) => setNewItemDescription(e.target.value)}
                      style={{ background: '#090d16', border: '1px solid #334155', color: '#fff', padding: '10px', borderRadius: '6px', width: '100%', resize: 'vertical' }}
                    />
                  </div>

                  <div className="form-group" style={{ marginBottom: '20px' }}>
                    <label style={{ display: 'block', fontSize: '13px', color: '#94a3b8', marginBottom: '6px' }}>Difficulty Level:</label>
                    <select
                      className="form-control"
                      value={newItemLevel}
                      onChange={(e) => setNewItemLevel(e.target.value)}
                      style={{ background: '#090d16', border: '1px solid #334155', color: '#fff', padding: '10px', borderRadius: '6px', width: '100%' }}
                    >
                      <option value="Beginner">Beginner</option>
                      <option value="Intermediate">Intermediate</option>
                      <option value="Advanced">Advanced</option>
                    </select>
                  </div>
                </>
              )}

              {activeModal === 'lesson' && (
                <>
                  <div className="form-group" style={{ marginBottom: '16px' }}>
                    <label style={{ display: 'block', fontSize: '13px', color: '#94a3b8', marginBottom: '6px' }}>Select Course to Add Lesson To:</label>
                    <select
                      className="form-control"
                      value={selectedCourseId || (courses[0]?.id || '')}
                      onChange={(e) => setSelectedCourseId(e.target.value)}
                      style={{ background: '#090d16', border: '1px solid #334155', color: '#fff', padding: '10px', borderRadius: '6px', width: '100%' }}
                    >
                      {courses.map(c => (
                        <option key={c.id} value={c.id}>
                          {c.title} ({c.lessons || c.totalLessons || 1} current lessons)
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="form-group" style={{ marginBottom: '16px' }}>
                    <label style={{ display: 'block', fontSize: '13px', color: '#94a3b8', marginBottom: '6px' }}>Module / Section Label (optional):</label>
                    <input
                      type="text"
                      className="form-control"
                      placeholder="e.g. Module 2 • Lesson 4"
                      value={newItemModule}
                      onChange={(e) => setNewItemModule(e.target.value)}
                      style={{ background: '#090d16', border: '1px solid #334155', color: '#fff', padding: '10px', borderRadius: '6px', width: '100%' }}
                    />
                  </div>

                  <div className="form-group" style={{ marginBottom: '16px' }}>
                    <label style={{ display: 'block', fontSize: '13px', color: '#94a3b8', marginBottom: '6px' }}>Lesson Overview &amp; Learning Goals (optional):</label>
                    <textarea
                      className="form-control"
                      rows="2"
                      placeholder="Explain what the student will learn in this lesson..."
                      value={newItemDescription}
                      onChange={(e) => setNewItemDescription(e.target.value)}
                      style={{ background: '#090d16', border: '1px solid #334155', color: '#fff', padding: '10px', borderRadius: '6px', width: '100%', resize: 'vertical' }}
                    />
                  </div>

                  <div className="form-group" style={{ marginBottom: '20px' }}>
                    <label style={{ display: 'block', fontSize: '13px', color: '#94a3b8', marginBottom: '6px' }}>Starter Code for Student Practice (optional):</label>
                    <textarea
                      className="form-control"
                      rows="3"
                      placeholder="// Starter code for student interactive editor..."
                      value={newItemCode}
                      onChange={(e) => setNewItemCode(e.target.value)}
                      style={{ background: '#090d16', border: '1px solid #334155', color: '#38bdf8', fontFamily: 'monospace', padding: '10px', borderRadius: '6px', width: '100%', resize: 'vertical' }}
                    />
                  </div>
                </>
              )}

              {activeModal === 'exercise' && (
                <>
                  <div className="form-group" style={{ marginBottom: '16px' }}>
                    <label style={{ display: 'block', fontSize: '13px', color: '#94a3b8', marginBottom: '6px' }}>Select Course for Exercise:</label>
                    <select
                      className="form-control"
                      value={selectedCourseId || (courses[0]?.id || '')}
                      onChange={(e) => setSelectedCourseId(e.target.value)}
                      style={{ background: '#090d16', border: '1px solid #334155', color: '#fff', padding: '10px', borderRadius: '6px', width: '100%' }}
                    >
                      {courses.map(c => (
                        <option key={c.id} value={c.id}>
                          {c.title} ({c.exercises || c.exercisesList?.length || 1} exercises)
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="form-group" style={{ marginBottom: '16px' }}>
                    <label style={{ display: 'block', fontSize: '13px', color: '#94a3b8', marginBottom: '6px' }}>Module / Section Label (optional):</label>
                    <input
                      type="text"
                      className="form-control"
                      placeholder="e.g. MODULE 2 • CODING EXERCISE"
                      value={newItemModule}
                      onChange={(e) => setNewItemModule(e.target.value)}
                      style={{ background: '#090d16', border: '1px solid #334155', color: '#fff', padding: '10px', borderRadius: '6px', width: '100%' }}
                    />
                  </div>

                  <div className="form-group" style={{ marginBottom: '16px' }}>
                    <label style={{ display: 'block', fontSize: '13px', color: '#94a3b8', marginBottom: '6px' }}>Task Instructions &amp; Description (optional):</label>
                    <textarea
                      className="form-control"
                      rows="2"
                      placeholder="Specify the coding exercise task, constraints, and instructions..."
                      value={newItemDescription}
                      onChange={(e) => setNewItemDescription(e.target.value)}
                      style={{ background: '#090d16', border: '1px solid #334155', color: '#fff', padding: '10px', borderRadius: '6px', width: '100%', resize: 'vertical' }}
                    />
                  </div>

                  <div className="form-group" style={{ marginBottom: '16px' }}>
                    <label style={{ display: 'block', fontSize: '13px', color: '#94a3b8', marginBottom: '6px' }}>Expected Output / Validation Target (optional):</label>
                    <input
                      type="text"
                      className="form-control"
                      placeholder="e.g. Total: $110 or Valid component output"
                      value={newItemExpected}
                      onChange={(e) => setNewItemExpected(e.target.value)}
                      style={{ background: '#090d16', border: '1px solid #334155', color: '#fff', padding: '10px', borderRadius: '6px', width: '100%' }}
                    />
                  </div>

                  <div className="form-group" style={{ marginBottom: '20px' }}>
                    <label style={{ display: 'block', fontSize: '13px', color: '#94a3b8', marginBottom: '6px' }}>Starter Code for Solution Editor (optional):</label>
                    <textarea
                      className="form-control"
                      rows="3"
                      placeholder="// Starter code for student solution..."
                      value={newItemCode}
                      onChange={(e) => setNewItemCode(e.target.value)}
                      style={{ background: '#090d16', border: '1px solid #334155', color: '#38bdf8', fontFamily: 'monospace', padding: '10px', borderRadius: '6px', width: '100%', resize: 'vertical' }}
                    />
                  </div>
                </>
              )}

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
                <button
                  type="button"
                  onClick={() => {
                    setActiveModal(null);
                    setNewItemTitle('');
                    setNewItemDescription('');
                    setSelectedCourseId('');
                    setNewItemModule('');
                    setNewItemCode('');
                    setNewItemExpected('');
                  }}
                  className="btn btn-outline"
                >
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary" style={{ background: '#8b5cf6' }}>
                  Create {activeModal} →
                </button>
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
