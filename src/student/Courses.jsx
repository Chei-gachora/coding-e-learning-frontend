import { Link } from 'react-router-dom';
import { ImHtmlFive } from "react-icons/im";
import { SiCss } from "react-icons/si";
import { IoLogoJavascript } from "react-icons/io5";
import { GiPadlock } from "react-icons/gi";
import { IoBookSharp } from "react-icons/io5";
import { MdViewModule } from "react-icons/md";
import { FaLaptopCode } from "react-icons/fa6";
import Sidebar from '../components/Sidebar';
import { useCourses } from '../context/CourseContext';

export default function Courses() {
  const { courses } = useCourses();

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
            {courses.map((course) => (
              <div key={course.id} className="learning-course card">
                <div className="learning-course-top">
                  <div className="learning-icon" style={{ fontSize: '32px' }}>
                    {/* Choose an icon based on course slug or title */}
                    {course.slug.includes('html') && <ImHtmlFive />}
                    {course.slug.includes('css') && <SiCss />}
                    {course.slug.includes('javascript') && <IoLogoJavascript />}
                    {course.slug.includes('react') && <SiCss />}
                    {/* Default fallback icon */}
                    {!['html', 'css', 'javascript', 'react'].some(k => course.slug.includes(k)) && <GiPadlock />}
                  </div>
                  <span className="badge badge-success">{course.status === 'in-progress' ? 'In Progress' : 'Not Started'}</span>
                </div>
                <h2>{course.title}</h2>
                <p>{course.description}</p>
                <div className="course-details">
                  <span><MdViewModule /> {course.modules || 0} Modules</span>
                  <span><IoBookSharp /> {course.lessons || 0} Lessons</span>
                  <span><FaLaptopCode /> {course.exercises || 0} Exercises</span>
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
                <Link to={`/lesson?course=${course.slug}`} className="btn btn-primary">
                  {course.progress > 0 ? 'Continue Course' : 'Start Course'}
                </Link>
              </div>
            ))}
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
