import { useState } from 'react';
import { Link } from 'react-router-dom';
import Sidebar from './components/Sidebar';

export default function Exercise() {
  const initialCode = `<!DOCTYPE html>
<html>
<body>

<h1>Hello, Developer!</h1>

</body>
</html>`;

  const [code, setCode] = useState(initialCode);
  const [activeTab, setActiveTab] = useState('editor');
  const [testPassed, setTestPassed] = useState(null);
  const [submitted, setSubmitted] = useState(false);

  const runTest = () => {
    // Check if code contains <h1>Hello, Developer!</h1> (case insensitive, allowing whitespace)
    const normalized = code.toLowerCase().replace(/\s+/g, ' ');
    const passes = normalized.includes('<h1>hello, developer!</h1>') || normalized.includes('<h1> hello, developer! </h1>');
    setTestPassed(passes);
    setActiveTab('preview');
  };

  const handleSubmit = () => {
    runTest();
    setSubmitted(true);
  };

  const handleReset = () => {
    setCode(initialCode);
    setTestPassed(null);
    setSubmitted(false);
    setActiveTab('editor');
  };

  return (
    <div className="dashboard-layout">
      <Sidebar />
      <div className="main-content" style={{ display: 'flex', flexDirection: 'column' }}>

      <main className="exercise-page" style={{ minHeight: 'unset', padding: '0' }}>
        <div className="container" style={{ maxWidth: '100%', padding: '0' }}>
          {/* BREADCRUMB */}
          <div className="breadcrumb">
            <Link to="/courses">Courses</Link>
            <span>›</span>
            <Link to="/lesson">HTML Fundamentals</Link>
            <span>›</span>
            <strong>Coding Exercise</strong>
          </div>

          {/* EXERCISE HEADER */}
          <section className="exercise-header">
            <div>
              <span className="lesson-label">MODULE 1 • CODING EXERCISE</span>
              <h1>Create Your First Heading</h1>
              <p>
                Test your understanding of HTML headings by completing the coding task below.
              </p>
            </div>
            <div className="exercise-score">
              <strong>{submitted && testPassed ? '10/10' : '10'}</strong>
              <span>Points</span>
            </div>
          </section>

          {/* INSTRUCTIONS */}
          <section className="card exercise-instructions">
            <span className="lesson-label">INSTRUCTIONS</span>
            <h2>Your Task</h2>
            <p>Create an HTML heading that displays:</p>
            <div className="expected-result">Hello, Developer!</div>
            <h3>Requirements</h3>
            <ul>
              <li>Use the correct HTML heading element (&lt;h1&gt;).</li>
              <li>The heading must display "Hello, Developer!"</li>
              <li>Write valid HTML code.</li>
            </ul>
          </section>

          {/* CODE EDITOR & PREVIEW */}
          <section className="card coding-exercise">
            <div className="section-title">
              <div>
                <span className="lesson-label">PRACTICE</span>
                <h2>Write Your Code</h2>
              </div>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button
                  className={`btn btn-small ${activeTab === 'editor' ? 'btn-primary' : 'btn-outline'}`}
                  onClick={() => setActiveTab('editor')}
                >
                  Editor
                </button>
                <button
                  className={`btn btn-small ${activeTab === 'preview' ? 'btn-primary' : 'btn-outline'}`}
                  onClick={() => setActiveTab('preview')}
                >
                  Preview
                </button>
              </div>
            </div>

            <div className="exercise-editor">
              <div className="editor-top">
                <span>index.html</span>
                <span>HTML Starter</span>
              </div>

              {activeTab === 'editor' ? (
                <textarea
                  className="exercise-code"
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  style={{ width: '100%', minHeight: '180px', fontFamily: 'monospace', padding: '12px', fontSize: '14px' }}
                />
              ) : (
                <div
                  className="exercise-preview-box"
                  style={{
                    minHeight: '180px',
                    padding: '16px',
                    background: '#ffffff',
                    color: '#0f172a',
                    borderRadius: '8px',
                    border: '1px solid #cbd5e1'
                  }}
                  dangerouslySetInnerHTML={{ __html: code }}
                />
              )}

              <div className="editor-actions" style={{ marginTop: '12px', display: 'flex', gap: '12px' }}>
                <button className="btn btn-primary" onClick={runTest}>
                  ▶ Run Code
                </button>
                <button className="btn btn-outline" onClick={handleReset}>
                  Reset
                </button>
              </div>
            </div>
          </section>

          {/* EXPECTED RESULT */}
          <section className="card test-section">
            <div className="section-title">
              <div>
                <span className="lesson-label">TEST CASE</span>
                <h2>Expected Result</h2>
              </div>
              <span className={`badge ${testPassed === true ? 'badge-success' : testPassed === false ? 'badge-danger' : 'badge-warning'}`}>
                {testPassed === true ? 'PASSED' : testPassed === false ? 'FAILED' : 'NOT TESTED'}
              </span>
            </div>

            <div className="test-case">
              <div>
                <strong>Test 1</strong>
                <p>
                  The page should contain an &lt;h1&gt; heading with the exact text "Hello, Developer!"
                </p>
              </div>
              <span className="test-status">
                {testPassed === true ? '✅ Passed' : testPassed === false ? '❌ Failed' : '○ Pending'}
              </span>
            </div>
          </section>

          {/* SUBMISSION */}
          <section className="card submission-section">
            <span className="lesson-label">SUBMISSION</span>
            <h2>Submit Your Exercise</h2>
            <p>
              Run your code and submit it when you are satisfied with your solution.
            </p>

            <div className="submission-info">
              <div>
                <span>Maximum Score</span>
                <strong>10 points</strong>
              </div>
              <div>
                <span>Status</span>
                <strong>{submitted ? (testPassed ? 'Passed (10/10)' : 'Needs Revision (0/10)') : 'Not Submitted'}</strong>
              </div>
            </div>

            <button
              className="btn btn-primary submit-button"
              onClick={handleSubmit}
            >
              Submit Exercise
            </button>

            {submitted && (
              <div style={{ marginTop: '16px', padding: '12px', borderRadius: '6px', backgroundColor: testPassed ? '#dcfce7' : '#fee2e2', color: testPassed ? '#166534' : '#991b1b' }}>
                {testPassed ? '🎉 Exercise Completed! 10 Points Awarded!' : '❌ Test failed. Please make sure your code includes <h1>Hello, Developer!</h1>.'}
              </div>
            )}
          </section>

          {/* NAVIGATION */}
          <div className="lesson-navigation">
            <Link to="/lesson" className="btn btn-outline">
              ← Back to Lesson
            </Link>
            <Link to="/labs" className="btn btn-primary">
              Continue to Lab →
            </Link>
          </div>
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
