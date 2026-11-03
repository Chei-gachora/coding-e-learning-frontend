import { Link } from 'react-router-dom';
import { useTheme } from './context/ThemeContext';
import { ImHtmlFive } from "react-icons/im";
import { SiCss } from "react-icons/si";
import { IoLogoJavascript } from "react-icons/io5";
import { DiReact } from "react-icons/di";
import { ImRocket } from "react-icons/im";
import { IoBookSharp } from "react-icons/io5";
import { FaLaptopCode } from "react-icons/fa6";
import { SiProgress } from "react-icons/si";
import { BsSunFill, BsMoonStarsFill } from "react-icons/bs";


export default function Home() {
  const { theme, toggleTheme } = useTheme();

  return (
    <>
      {/* NAVIGATION */}
      <header className="navbar">
        <div className="container nav-content">
          <div className="nav-logo-group">
            <Link to="/" className="logo">
              Code<span>Learn</span>
            </Link>
            <button
              className="theme-toggle-btn"
              onClick={toggleTheme}
              aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
              title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
            >
              <span className="theme-toggle-icon">
                {theme === 'dark' ? <BsSunFill /> : <BsMoonStarsFill />}
              </span>
            </button>
          </div>

          <nav className="nav-links">
            <a href="#home">Home</a>
            <a href="#courses">Courses</a>
            <a href="#about">About</a>
            <a href="#contact">Contact</a>
          </nav>

          <div className="nav-buttons">
            <Link to="/login" className="btn btn-outline">Login</Link>
           
          </div>
        </div>
      </header>

      {/* HERO SECTION */}
      <section className="hero" id="home">
        <div className="container hero-content">
          <div className="hero-text">
            <span className="hero-badge"><ImRocket /> Learn. Practice. Build.</span>
            <h1>
              Learn to Code. <span>Build Your Future.</span>
            </h1>
            <p>
              Master coding through structured lessons, practical exercises, daily labs and real-world projects.
            </p>

            <div className="hero-buttons">
              <Link to="/register" className="btn btn-primary">
                Start Learning
              </Link>
              <a href="#courses" className="btn btn-outline">
                Explore Courses
              </a>
            </div>

            <div className="hero-stats">
              <div>
                <strong>10+</strong>
                <span>Courses</span>
              </div>
              <div>
                <strong>50+</strong>
                <span>Lessons</span>
              </div>
              <div>
                <strong>100+</strong>
                <span>Exercises</span>
              </div>
            </div>
          </div>

          {/* CODE PREVIEW */}
          <div className="code-preview">
            <div className="code-header">
              <div className="code-dots">
                <span></span>
                <span></span>
                <span></span>
              </div>
              <span>index.html</span>
            </div>

            <div className="code-body">
              <p><span>&lt;html&gt;</span></p>
              <p>&nbsp;&nbsp;<span>&lt;body&gt;</span></p>
              <p>&nbsp;&nbsp;&nbsp;&nbsp;<span>&lt;h1&gt;</span></p>
              <p>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;Hello, Developer!</p>
              <p>&nbsp;&nbsp;&nbsp;&nbsp;<span>&lt;/h1&gt;</span></p>
              <p>&nbsp;&nbsp;<span>&lt;/body&gt;</span></p>
              <p><span>&lt;/html&gt;</span></p>
            </div>
          </div>
        </div>
      </section>

      {/* COURSES SECTION */}
      <section className="courses-section" id="courses">
        <div className="container">
          <div className="section-heading">
            <span>LEARNING PATH</span>
            <h2>Build Your Coding Skills</h2>
            <p>
              Learn the technologies you need through practical, step-by-step learning.
            </p>
          </div>

          <div className="course-grid">
            <Link to="/courses" className="course-card">
              <div className="course-icon"><ImHtmlFive /></div>
              <h3>HTML</h3>
              <p>Learn how to structure modern websites using HTML.</p>
              <span className="course-level">Beginner</span>
            </Link>

            <Link to="/courses" className="course-card">
              <div className="course-icon"><SiCss /></div>
              <h3>CSS</h3>
              <p>Create beautiful and responsive website designs.</p>
              <span className="course-level">Beginner</span>
            </Link>

            <Link to="/courses" className="course-card">
              <div className="course-icon"><IoLogoJavascript /></div>
              <h3>JavaScript</h3>
              <p>Add interactivity and functionality to your websites.</p>
              <span className="course-level">Intermediate</span>
            </Link>

            <Link to="/courses" className="course-card">
              <div className="course-icon"><DiReact /></div>
              <h3>React</h3>
              <p>Build modern interactive interfaces using React.</p>
              <span className="course-level">Advanced</span>
            </Link>
          </div>
        </div>
      </section>

      {/* WHY CODELEARN */}
      <section className="features-section" id="about">
        <div className="container">
          <div className="section-heading">
            <span>WHY CODELEARN?</span>
            <h2>Learning That Goes Beyond Theory</h2>
          </div>

          <div className="features-grid">
            <div className="feature">
              <div className="feature-icon"><IoBookSharp /></div>
              <h3>Structured Lessons</h3>
              <p>
                Follow organized modules and lessons designed for progressive learning.
              </p>
            </div>

            <div className="feature">
              <div className="feature-icon"><FaLaptopCode /></div>
              <h3>Practice Coding</h3>
              <p>
                Practice your skills through coding exercises and practical labs.
              </p>
            </div>

            <div className="feature">
              <div className="feature-icon"><SiProgress /></div>
              <h3>Track Progress</h3>
              <p>
                Monitor your learning progress, grades and completed activities.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer id="contact">
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
