import { Link } from 'react-router-dom';
import { ImHtmlFive } from "react-icons/im";
import { SiCss } from "react-icons/si";
import { IoLogoJavascript } from "react-icons/io5";
import { GiPadlock } from "react-icons/gi";
import { IoBookSharp } from "react-icons/io5";
import { MdViewModule } from "react-icons/md";
import { FaLaptopCode } from "react-icons/fa6";
import Sidebar from '../components/Sidebar';

export default function Courses() {
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
            {/* HTML */}
            <div className="learning-course card">
              <div className="learning-course-top">
                <div className="learning-icon html-icon"><ImHtmlFive /></div>
                <span className="badge badge-success">In Progress</span>
              </div>
              <h2>HTML Fundamentals</h2>
              <p>
                Learn the structure and building blocks of modern websites using HTML.
              </p>
              <div className="course-details">
                <span><MdViewModule />6 Modules</span>
                <span><IoBookSharp /> 24 Lessons</span>
                <span><FaLaptopCode /> 30 Exercises</span>
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
                <div className="learning-icon css-icon"><SiCss /></div>
                <span className="badge badge-warning">Not Started</span>
              </div>
              <h2>CSS Fundamentals</h2>
              <p>
                Learn how to style websites and create responsive and attractive interfaces.
              </p>
              <div className="course-details">
                <span><MdViewModule /> 5 Modules</span>
                <span><IoBookSharp /> 20 Lessons</span>
                <span><FaLaptopCode /> 25 Exercises</span>
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
                <div className="learning-icon js-icon"><IoLogoJavascript /></div>
                <span className="badge badge-danger"><GiPadlock /> Locked</span>
              </div>
              <h2>JavaScript</h2>
              <p>
                Add interactivity and functionality to your websites using JavaScript.
              </p>
              <div className="course-details">
                <span><MdViewModule /> 8 Modules</span>
                <span><IoBookSharp /> 32 Lessons</span>
                <span><FaLaptopCode /> 40 Exercises</span>
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
                <GiPadlock /> Locked
              </button>
            </div>

            {/* REACT */}
            <div className="learning-course card">
              <div className="learning-course-top">
                <div className="learning-icon react-icon"><SiCss /></div>
                <span className="badge badge-danger"><GiPadlock /> Locked</span>
              </div>
              <h2>React</h2>
              <p>
                Build modern interactive user interfaces using React.
              </p>
              <div className="course-details">
                <span><MdViewModule /> 6 Modules</span>
                <span><IoBookSharp /> 28 Lessons</span>
                <span><FaLaptopCode /> 35 Exercises</span>
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
                <GiPadlock /> Locked
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
      </div>
    </div>
  );
}
