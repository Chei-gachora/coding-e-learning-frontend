import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ImHtmlFive } from "react-icons/im";
import { SiCss } from "react-icons/si";
import { IoLogoJavascript } from "react-icons/io5";
import { IoBookSharp } from "react-icons/io5";
import { MdViewModule } from "react-icons/md";
import { FaLaptopCode } from "react-icons/fa6";
import Sidebar from '../components/Sidebar';
import { useCourses } from '../context/CourseContext';
import { useAuth } from '../context/AuthContext';

export default function Courses() {
  const { user } = useAuth();
  const { courses, enroll, loading, error } = useCourses();
  const [enrollingId, setEnrollingId] = useState(null);
  const [enrollmentError, setEnrollmentError] = useState('');

  const handleEnroll = async (courseId) => {
    setEnrollingId(courseId);
    setEnrollmentError('');
    try {
      await enroll(courseId);
    } catch (enrollError) {
      setEnrollmentError(enrollError.message || 'Unable to enroll in this course.');
    } finally {
      setEnrollingId(null);
    }
  };

  return (
    <div className="dashboard-layout">
      <Sidebar />
      <div className="main-content" style={{ display: 'flex', flexDirection: 'column' }}>

      <main className="courses-page" style={{ minHeight: 'unset', padding: '0' }}>
        <div className="container" style={{ maxWidth: '100%', padding: '0' }}>
          <section className="page-header">
            <span>LEARNING PATH</span>
            <h1>Explore Courses</h1>
            <p>
              Build your coding skills through structured, practical learning.
            </p>
          </section>

          <section className="course-list">
            {!user ? (
              <div className="empty-state">
                <p>Sign in to browse and enroll in courses.</p>
                <Link to="/login" className="btn btn-primary">Sign in</Link>
              </div>
            ) : (
              <>
                {(error || enrollmentError) && (
                  <div role="alert" style={{ color: '#f87171', marginBottom: '16px' }}>
                    {enrollmentError || error}
                  </div>
                )}
                {loading ? (
                  <div role="status">Loading courses…</div>
                ) : courses.length === 0 ? (
                  <div className="empty-state">No published courses are available yet.</div>
                ) : courses.map((course) => (
                  <div key={course.id} className="learning-course card">
                <div className="learning-course-top">
                  <div className="learning-icon" style={{ fontSize: '32px' }}>
                    {/* Choose an icon based on course slug or title, or thumbnail emoji */}
                    {course.slug?.includes('html') ? <ImHtmlFive /> :
                     course.slug?.includes('css') ? <SiCss /> :
                     course.slug?.includes('javascript') ? <IoLogoJavascript /> :
                     course.slug?.includes('react') ? <SiCss /> :
                     (course.thumbnail || <IoBookSharp />)}
                  </div>
                  <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                    {course.isNew && (
                      <span className="badge" style={{ background: '#8b5cf6', color: '#fff', fontSize: '11px', padding: '2px 8px' }}>NEW</span>
                    )}
                    <span className={`badge ${course.status === 'in-progress' ? 'badge-success' : course.status === 'completed' ? 'badge-success' : 'badge-outline'}`}>
                      {course.status === 'in-progress' ? 'In Progress' : course.status === 'completed' ? 'Completed' : 'Not Started'}
                    </span>
                  </div>
                </div>
                <h2>{course.title}</h2>
                <p>{course.description}</p>
                <div className="course-details">
                  <span><MdViewModule /> {course.modules} Modules</span>
                  <span><IoBookSharp /> {course.lessons} Lessons</span>
                  <span><FaLaptopCode /> {course.exercises} Exercises</span>
                </div>
                <div className="course-progress">
                  <div className="progress-info">
                    <span>Progress</span>
                    <strong>{course.progress}%</strong>
                  </div>
                  <div className="progress-bar">
                    <div className="progress-fill" style={{ width: `${course.progress}%` }}></div>
                  </div>
                </div>
                {course.isEnrolled ? (
                  <Link to={`/lesson?course=${course.slug}`} className="btn btn-primary">
                    {course.progress > 0 ? 'Continue Course' : 'Start Course'}
                  </Link>
                ) : (
                  <button
                    type="button"
                    className="btn btn-primary"
                    onClick={() => handleEnroll(course.id)}
                    disabled={enrollingId === course.id}
                  >
                    {enrollingId === course.id ? 'Enrolling…' : 'Enroll'}
                  </button>
                )}
                  </div>
                ))}
              </>
            )}
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
      </div>
    </div>
  );
}
