import { Link } from 'react-router-dom';
import { IoBookSharp } from "react-icons/io5";
import { SiCss } from "react-icons/si";
import { IoLogoJavascript } from "react-icons/io5";
import { FaLaptopCode } from "react-icons/fa6";
import { FaSyringe } from "react-icons/fa";
import { TiTick } from "react-icons/ti";
import { FaHourglassHalf } from "react-icons/fa";

import { AiFillWarning } from "react-icons/ai";

import { GiPadlock } from "react-icons/gi";
import { TiStarFullOutline } from "react-icons/ti";
import Sidebar from '../components/Sidebar';

export default function Labs() {
  return (
    <div className="dashboard-layout">
      <Sidebar />
      <div className="main-content" style={{ display: 'flex', flexDirection: 'column' }}>

      <main className="labs-page" style={{ minHeight: 'unset', padding: '0' }}>
        <div className="container" style={{ maxWidth: '100%', padding: '0' }}>
          <div className="page-header">
            <div>
              <span className="section-label">PRACTICAL LEARNING</span>
              <h1>Daily Labs</h1>
              <p>
                Put your coding skills into practice by completing practical projects and submitting your work.
              </p>
            </div>
          </div>

          <section className="lab-summary">
            <div className="lab-summary-card">
              <span className="summary-icon"><FaSyringe /></span>
              <div>
                <strong>4</strong>
                <span>Total Labs</span>
              </div>
            </div>

            <div className="lab-summary-card">
              <span className="summary-icon"><TiTick /></span>
              <div>
                <strong>1</strong>
                <span>Completed</span>
              </div>
            </div>

            <div className="lab-summary-card">
              <span className="summary-icon"><FaHourglassHalf /></span>
              <div>
                <strong>2</strong>
                <span>Pending</span>
              </div>
            </div>

            <div className="lab-summary-card">
              <span className="summary-icon"><AiFillWarning /></span>
              <div>
                <strong>1</strong>
                <span>Missed</span>
              </div>
            </div>
          </section>

          <section className="labs-list">
            {/* Completed Lab */}
            <article className="lab-card">
              <div className="lab-card-top">
                <div>
                  <span className="lab-number">LAB 01</span>
                  <h2>Build a Personal Profile Page</h2>
                </div>
                <span className="lab-status completed">Completed</span>
              </div>
              <p className="lab-description">
                Create a simple personal profile webpage using basic HTML elements such as headings, paragraphs, images and links.
              </p>
              <div className="lab-details">
                <span><IoBookSharp /> HTML Fundamentals</span>
                <span><TiStarFullOutline /> 20 Points</span>
                <span>📅 Due: Sept 5</span>
              </div>
              <div className="lab-progress">
                <div className="progress-label">
                  <span>Progress</span>
                  <strong>100%</strong>
                </div>
                <div className="progress-bar">
                  <div className="progress-fill" style={{ width: '100%' }}></div>
                </div>
              </div>
              <Link to="/results" className="btn btn-outline">
                View Result
              </Link>
            </article>

            {/* Pending Lab */}
            <article className="lab-card">
              <div className="lab-card-top">
                <div>
                  <span className="lab-number">LAB 02</span>
                  <h2>Design a Styled Web Page</h2>
                </div>
                <span className="lab-status pending">Pending</span>
              </div>
              <p className="lab-description">
                Build a webpage and use CSS to control colors, spacing, typography, borders and layout.
              </p>
              <div className="lab-details">
                <span><SiCss /> CSS Fundamentals</span>
                <span><TiStarFullOutline /> 20 Points</span>
                <span>📅 Due: Sept 12</span>
              </div>
              <div className="lab-progress">
                <div className="progress-label">
                  <span>Progress</span>
                  <strong>0%</strong>
                </div>
                <div className="progress-bar">
                  <div className="progress-fill" style={{ width: '0%' }}></div>
                </div>
              </div>
              <Link to="/lesson" className="btn btn-primary">
                Start Lab
              </Link>
            </article>

            {/* Upcoming Lab */}
            <article className="lab-card">
              <div className="lab-card-top">
                <div>
                  <span className="lab-number">LAB 03</span>
                  <h2>Interactive JavaScript Page</h2>
                </div>
                <span className="lab-status upcoming">Upcoming</span>
              </div>
              <p className="lab-description">
                Create an interactive webpage using JavaScript variables, functions, events and DOM manipulation.
              </p>
              <div className="lab-details">
                <span><IoLogoJavascript /> JavaScript</span>
                <span><TiStarFullOutline /> 25 Points</span>
                <span>📅 Due: Sept 19</span>
              </div>
              <div className="lab-progress">
                <div className="progress-label">
                  <span>Progress</span>
                  <strong>Locked</strong>
                </div>
                <div className="progress-bar">
                  <div className="progress-fill" style={{ width: '0%' }}></div>
                </div>
              </div>
              <button className="btn btn-disabled" disabled>
                <GiPadlock /> Locked
              </button>
            </article>

            {/* Missed Lab */}
            <article className="lab-card missed-lab">
              <div className="lab-card-top">
                <div>
                  <span className="lab-number">LAB 04</span>
                  <h2>Responsive Landing Page</h2>
                </div>
                <span className="lab-status missed">Not Completed</span>
              </div>
              <p className="lab-description">
                Create a responsive landing page that adapts to different screen sizes using HTML and CSS.
              </p>
              <div className="lab-details">
                <span><FaLaptopCode /> HTML &amp; CSS</span>
                <span><TiStarFullOutline /> 25 Points</span>
                <span>📅 Due: Sept 3</span>
              </div>
              <div className="lab-progress">
                <div className="progress-label">
                  <span>Status</span>
                  <strong>Deadline Passed</strong>
                </div>
                <div className="progress-bar">
                  <div className="progress-fill" style={{ width: '0%' }}></div>
                </div>
              </div>
              <button className="btn btn-disabled" disabled>
                Not Available
              </button>
            </article>
          </section>
        </div>
      </main>

      <footer className="site-footer">
        <div className="container">
          <p>© 2026 CodeLearn. Learn. Practice. Build.</p>
        </div>
      </footer>
      </div>
    </div>
  );
}
