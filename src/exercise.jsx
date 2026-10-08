import { useState, useEffect } from 'react';
import { Link, useSearchParams, useParams } from 'react-router-dom';
import Sidebar from './components/Sidebar';
import { getCourseBySlug } from './data/coursesData';

export default function Exercise() {
  const [searchParams] = useSearchParams();
  const { courseId } = useParams();

  const courseSlug = searchParams.get('course') || courseId || 'html-fundamentals';
  const course = getCourseBySlug(courseSlug);

  const [code, setCode] = useState(course.exercise.starterCode);
  const [activeTab, setActiveTab] = useState('editor');
  const [testPassed, setTestPassed] = useState(null);
  const [submitted, setSubmitted] = useState(false);
  const [consoleLogs, setConsoleLogs] = useState([]);

  useEffect(() => {
    setCode(course.exercise.starterCode);
    setTestPassed(null);
    setSubmitted(false);
    setActiveTab('editor');
    setConsoleLogs([]);
  }, [course.slug]);

  const runTest = () => {
    const passed = course.exercise.validator(code);
    setTestPassed(passed);
    setActiveTab('preview');

    if (course.previewType === 'console') {
      const logs = [];
      const customConsole = {
        log: (...args) => logs.push(args.map(a => typeof a === 'object' ? JSON.stringify(a) : String(a)).join(' ')),
        error: (...args) => logs.push('❌ ' + args.join(' ')),
        warn: (...args) => logs.push('⚠️ ' + args.join(' '))
      };
      try {
        if (course.codeType === 'javascript' || course.codeType === 'typescript') {
          const cleanCode = code
            .replace(/:\s*(string|number|boolean|any|void|object|string\[\]|number\[\])/g, '')
            .replace(/interface\s+\w+\s*\{[\s\S]*?\}/g, '');
          const runner = new Function('console', cleanCode);
          runner(customConsole);
        } else if (course.codeType === 'python') {
          const printMatches = [...code.matchAll(/print\((?:f?["'](.*?)["']|(.*?))\)/g)];
          if (printMatches.length > 0) {
            printMatches.forEach(m => logs.push(m[1] || m[2]));
          } else {
            logs.push('Python test executed.');
          }
        }
        if (logs.length === 0) {
          logs.push('Code executed successfully.');
        }
      } catch (err) {
        logs.push(`Runtime Error: ${err.message}`);
      }
      setConsoleLogs(logs);
    }
  };

  const handleSubmit = () => {
    runTest();
    setSubmitted(true);
  };

  const handleReset = () => {
    setCode(course.exercise.starterCode);
    setTestPassed(null);
    setSubmitted(false);
    setActiveTab('editor');
    setConsoleLogs([]);
  };

  return (
    <div className="dashboard-layout">
      {/* Stationary Sidebar */}
      <Sidebar />

      <div className="main-content" style={{ display: 'flex', flexDirection: 'column' }}>
        <main className="exercise-page" style={{ minHeight: 'unset', padding: '0' }}>
          <div className="container" style={{ maxWidth: '100%', padding: '0' }}>
            {/* BREADCRUMB */}
            <div className="breadcrumb">
              <Link to="/courses">Courses</Link>
              <span>›</span>
              <Link to={`/lesson?course=${course.slug}`}>{course.title}</Link>
              <span>›</span>
              <strong>Coding Exercise</strong>
            </div>

            {/* EXERCISE HEADER */}
            <section className="exercise-header">
              <div>
                <span className="lesson-label">{course.exercise.moduleLabel}</span>
                <h1>{course.exercise.taskTitle}</h1>
                <p>{course.exercise.taskDescription}</p>
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
              <p>Meet the task requirements and generate expected output:</p>
              <div className="expected-result">{course.exercise.expectedResult}</div>
              <h3>Requirements</h3>
              <ul>
                {course.exercise.requirements.map((req, i) => (
                  <li key={i}>{req}</li>
                ))}
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
                    {course.previewType === 'console' ? 'Console Output' : 'Preview'}
                  </button>
                </div>
              </div>

              <div className="exercise-editor">
                <div className="editor-top" style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 12px', background: '#1e293b', borderTopLeftRadius: '8px', borderTopRightRadius: '8px' }}>
                  <span style={{ fontSize: '13px', color: '#94a3b8' }}>solution.{course.codeType === 'html' ? 'html' : course.codeType === 'python' ? 'py' : 'js'}</span>
                  <span style={{ fontSize: '12px', textTransform: 'uppercase', color: '#38bdf8' }}>{course.codeType}</span>
                </div>

                {activeTab === 'editor' ? (
                  <textarea
                    className="exercise-code"
                    value={code}
                    onChange={(e) => setCode(e.target.value)}
                    style={{
                      width: '100%',
                      minHeight: '180px',
                      fontFamily: 'monospace',
                      padding: '14px',
                      fontSize: '14px',
                      background: '#090d16',
                      color: '#f8fafc',
                      borderBottomLeftRadius: '8px',
                      borderBottomRightRadius: '8px',
                      border: '1px solid #24344d',
                      resize: 'vertical'
                    }}
                  />
                ) : course.previewType === 'console' ? (
                  <div
                    style={{
                      minHeight: '180px',
                      padding: '16px',
                      background: '#090d16',
                      borderBottomLeftRadius: '8px',
                      borderBottomRightRadius: '8px',
                      border: '1px solid #24344d',
                      fontFamily: 'monospace',
                      fontSize: '14px'
                    }}
                  >
                    <div style={{ color: '#64748b', fontSize: '12px', borderBottom: '1px solid #1e293b', paddingBottom: '6px', marginBottom: '8px' }}>
                      OUTPUT CONSOLE
                    </div>
                    {consoleLogs.length === 0 ? (
                      <div style={{ color: '#94a3b8' }}>Click &quot;▶ Run Code&quot; to test your solution.</div>
                    ) : (
                      consoleLogs.map((log, i) => (
                        <div key={i} style={{ color: log.startsWith('Runtime Error') ? '#f87171' : '#38bdf8', marginBottom: '4px' }}>
                          &gt; {log}
                        </div>
                      ))
                    )}
                  </div>
                ) : (
                  <div
                    className="exercise-preview-box"
                    style={{
                      minHeight: '180px',
                      padding: '16px',
                      background: '#ffffff',
                      color: '#0f172a',
                      borderBottomLeftRadius: '8px',
                      borderBottomRightRadius: '8px',
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
                  <h2>Validation Check</h2>
                </div>
                <span className={`badge ${testPassed === true ? 'badge-success' : testPassed === false ? 'badge-danger' : 'badge-warning'}`}>
                  {testPassed === true ? 'PASSED' : testPassed === false ? 'FAILED' : 'NOT TESTED'}
                </span>
              </div>

              <div className="test-case">
                <div>
                  <strong>Requirement Check</strong>
                  <p>Check if solution satisfies: "{course.exercise.expectedResult}"</p>
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
              <p>Run your code and submit it when you are satisfied with your solution.</p>

              <div className="submission-info">
                <div>
                  <span>Maximum Score</span>
                  <strong>10 points</strong>
                </div>
                <div>
                  <span>Status</span>
                  <strong>
                    {submitted
                      ? testPassed
                        ? 'Passed (10/10)'
                        : 'Needs Revision (0/10)'
                      : 'Not Submitted'}
                  </strong>
                </div>
              </div>

              <button className="btn btn-primary submit-button" onClick={handleSubmit}>
                Submit Exercise
              </button>

              {submitted && (
                <div
                  style={{
                    marginTop: '16px',
                    padding: '14px',
                    borderRadius: '8px',
                    backgroundColor: testPassed ? '#064e3b' : '#7f1d1d',
                    color: testPassed ? '#a7f3d0' : '#fecaca',
                    border: `1px solid ${testPassed ? '#059669' : '#dc2626'}`
                  }}
                >
                  {testPassed
                    ? '🎉 Exercise Completed! 10 Points Awarded!'
                    : '❌ Test criteria not met. Review the instructions and requirements.'}
                </div>
              )}
            </section>

            {/* NAVIGATION */}
            <div className="lesson-navigation" style={{ display: 'flex', justifyContent: 'space-between', margin: '32px 0' }}>
              <Link to={`/lesson?course=${course.slug}`} className="btn btn-outline">
                ← Back to Lesson
              </Link>
              <Link to="/labs" className="btn btn-primary">
                Continue to Labs →
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
