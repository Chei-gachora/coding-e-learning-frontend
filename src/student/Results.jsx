import { Link } from 'react-router-dom';
import Sidebar from '../components/Sidebar';

export default function Results() {
  return (
    <div className="dashboard-layout">
      <Sidebar />
      <div className="main-content" style={{ display: 'flex', flexDirection: 'column' }}>

      <main className="results-page" style={{ minHeight: 'unset', padding: '0' }}>
        <div className="container" style={{ maxWidth: '100%', padding: '0' }}>
          <div className="page-header" style={{ marginBottom: '32px' }}>
            <span className="section-label">PERFORMANCE &amp; GRADES</span>
            <h1>Assessment &amp; Lab Results</h1>
            <p>View your scores, instructor feedback, and grade details.</p>
          </div>

          <div className="results-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '20px', marginBottom: '40px' }}>
            <div className="card" style={{ padding: '24px', borderRadius: '12px', background: '#1e293b', border: '1px solid #334155' }}>
              <span style={{ fontSize: '14px', color: '#cbd5e1' }}>Overall Average</span>
              <h2 style={{ fontSize: '32px', color: '#38bdf8', margin: '8px 0' }}>82%</h2>
              <span className="badge badge-success">Passed All Core Modules</span>
            </div>

            <div className="card" style={{ padding: '24px', borderRadius: '12px', background: '#1e293b', border: '1px solid #334155' }}>
              <span style={{ fontSize: '14px', color: '#cbd5e1' }}>Completed Assessments</span>
              <h2 style={{ fontSize: '32px', color: '#4ade80', margin: '8px 0' }}>6 / 7</h2>
              <span className="badge badge-warning">1 Pending Review</span>
            </div>

            <div className="card" style={{ padding: '24px', borderRadius: '12px', background: '#1e293b', border: '1px solid #334155' }}>
              <span style={{ fontSize: '14px', color: '#cbd5e1' }}>Total Points Earned</span>
              <h2 style={{ fontSize: '32px', color: '#f59e0b', margin: '8px 0' }}>145 pts</h2>
              <span className="badge badge-success">Rank #4 in Class</span>
            </div>
          </div>

          <section className="card" style={{ padding: '28px', borderRadius: '12px', background: '#1e293b', border: '1px solid #334155', marginBottom: '32px' }}>
            <h2 style={{ marginBottom: '20px', fontSize: '20px', color: '#ffffff' }}>Recent Submissions &amp; Grades</h2>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', minWidth: '600px', color: '#ffffff' }}>
                <thead>
                  <tr style={{ borderBottom: '2px solid #334155', color: '#cbd5e1', fontSize: '14px' }}>
                    <th style={{ padding: '12px' }}>Activity</th>
                    <th style={{ padding: '12px' }}>Category</th>
                    <th style={{ padding: '12px' }}>Submitted Date</th>
                    <th style={{ padding: '12px' }}>Score</th>
                    <th style={{ padding: '12px' }}>Status</th>
                  </tr>
                </thead>
                <tbody>
                  <tr style={{ borderBottom: '1px solid #334155', color: '#ffffff' }}>
                    <td style={{ padding: '16px 12px' }}><strong style={{ color: '#ffffff' }}>Build a Personal Profile Page</strong></td>
                    <td style={{ padding: '16px 12px', color: '#e2e8f0' }}>Daily Lab 01</td>
                    <td style={{ padding: '16px 12px', color: '#94a3b8' }}>05 Sep 2026</td>
                    <td style={{ padding: '16px 12px', color: '#4ade80', fontWeight: 'bold' }}>20 / 20</td>
                    <td style={{ padding: '16px 12px' }}><span className="badge badge-success">Graded</span></td>
                  </tr>
                  <tr style={{ borderBottom: '1px solid #334155', color: '#ffffff' }}>
                    <td style={{ padding: '16px 12px' }}><strong style={{ color: '#ffffff' }}>HTML Fundamentals Quiz</strong></td>
                    <td style={{ padding: '16px 12px', color: '#e2e8f0' }}>Quiz Assessment</td>
                    <td style={{ padding: '16px 12px', color: '#94a3b8' }}>04 Sep 2026</td>
                    <td style={{ padding: '16px 12px', color: '#38bdf8', fontWeight: 'bold' }}>18 / 20</td>
                    <td style={{ padding: '16px 12px' }}><span className="badge badge-success">Graded</span></td>
                  </tr>
                  <tr style={{ borderBottom: '1px solid #334155', color: '#ffffff' }}>
                    <td style={{ padding: '16px 12px' }}><strong style={{ color: '#ffffff' }}>Create Your First Heading</strong></td>
                    <td style={{ padding: '16px 12px', color: '#e2e8f0' }}>Coding Exercise</td>
                    <td style={{ padding: '16px 12px', color: '#94a3b8' }}>02 Sep 2026</td>
                    <td style={{ padding: '16px 12px', color: '#4ade80', fontWeight: 'bold' }}>10 / 10</td>
                    <td style={{ padding: '16px 12px' }}><span className="badge badge-success">Graded</span></td>
                  </tr>
                  <tr style={{ color: '#ffffff' }}>
                    <td style={{ padding: '16px 12px' }}><strong style={{ color: '#ffffff' }}>Design a Styled Web Page</strong></td>
                    <td style={{ padding: '16px 12px', color: '#e2e8f0' }}>Daily Lab 02</td>
                    <td style={{ padding: '16px 12px', color: '#94a3b8' }}>09 Sep 2026</td>
                    <td style={{ padding: '16px 12px', color: '#f59e0b', fontWeight: 'bold' }}>Pending</td>
                    <td style={{ padding: '16px 12px' }}><span className="badge badge-warning">Under Review</span></td>
                  </tr>
                </tbody>
              </table>
            </div>
          </section>

          <section className="card" style={{ padding: '28px', borderRadius: '12px', background: '#1e293b', border: '1px solid #334155' }}>
            <h2 style={{ marginBottom: '16px', fontSize: '20px', color: '#ffffff' }}>💬 Instructor Feedback</h2>
            <div style={{ background: '#0f172a', padding: '20px', borderRadius: '8px', borderLeft: '4px solid #38bdf8' }}>
              <h3 style={{ fontSize: '16px', marginBottom: '8px', color: '#ffffff' }}>HTML Personal Profile Lab</h3>
              <p style={{ color: '#cbd5e1', lineHeight: '1.6', fontSize: '14px' }}>
                “Great work, Pricilla! Your semantic markup is clean, correctly structured, and easy to read. Keep up the good work as we move on to CSS layout and styling!”
              </p>
              <div style={{ marginTop: '12px', fontSize: '12px', color: '#94a3b8' }}>
                — Sarah Chen, Lead Instructor • Sept 6, 2026
              </div>
            </div>
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
