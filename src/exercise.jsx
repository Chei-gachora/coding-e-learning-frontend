import { useState } from 'react';
import { Link, useSearchParams, useParams } from 'react-router-dom';
import Sidebar from './components/Sidebar';
import { getCourseBySlug } from './data/coursesData';
import { api } from './lib/api';

export default function Exercise() {
  const [searchParams] = useSearchParams();
  const { courseId } = useParams();

  const courseSlug = searchParams.get('course') || courseId || 'html-fundamentals';
  const course = getCourseBySlug(courseSlug);

  return <ExercisePage key={course.slug} course={course} />;
}

function ExercisePage({ course }) {
  const [code, setCode] = useState(course.exercise.starterCode);
  const [activeTab, setActiveTab] = useState('editor');
  const [consoleLogs, setConsoleLogs] = useState([]);
  const [executionError, setExecutionError] = useState('');
  const [isRunning, setIsRunning] = useState(false);

  const runTest = async () => {
    setActiveTab('preview');
    setExecutionError('');
    if (course.previewType !== 'console') return;
    const language = course.codeType;
    if (!['javascript', 'python', 'c', 'cpp', 'java'].includes(language)) {
      setExecutionError(`The isolated runner does not support ${language}.`);
      return;
    }

    setIsRunning(true);
    try {
      const result = await api.post('/execute/run/', { language, code, stdin: '' });
      const logs = [result?.stdout, result?.stderr].filter(Boolean);
      if (result?.timed_out) logs.push('Execution timed out.');
      else if (result?.exit_code !== 0) logs.push(`Process exited with code ${result?.exit_code}.`);
      setConsoleLogs(logs.length ? logs : ['Execution completed with no output.']);
    } catch (error) {
      setConsoleLogs([]);
      setExecutionError(error.message || 'Code execution failed.');
    } finally {
      setIsRunning(false);
    }
  };

  const handleReset = () => {
    setCode(course.exercise.starterCode);
    setActiveTab('editor');
    setConsoleLogs([]);
    setExecutionError('');
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
                <strong>Practice</strong>
                <span>Run code; grading requires a published activity.</span>
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
                  <iframe
                    className="exercise-preview-box"
                    title="HTML exercise preview"
                    sandbox="allow-scripts"
                    srcDoc={code}
                    style={{
                      width: '100%',
                      minHeight: '180px',
                      padding: '16px',
                      background: '#ffffff',
                      color: '#0f172a',
                      borderBottomLeftRadius: '8px',
                      borderBottomRightRadius: '8px',
                      border: '1px solid #cbd5e1'
                    }}
                  />
                )}

                <div className="editor-actions" style={{ marginTop: '12px', display: 'flex', gap: '12px' }}>
                  <button className="btn btn-primary" onClick={runTest} disabled={isRunning}>
                    {isRunning ? 'Running in isolated runner…' : '▶ Run Code'}
                  </button>
                  <button className="btn btn-outline" onClick={handleReset}>
                    Reset
                  </button>
                </div>
                {executionError && (
                  <div role="alert" style={{ color: '#f87171', marginTop: '12px' }}>
                    {executionError}
                  </div>
                )}
              </div>
            </section>

            <section className="card test-section">
              <div className="section-title">
                <div>
                  <span className="lesson-label">ASSESSMENT</span>
                  <h2>Server-graded activities</h2>
                </div>
              </div>
              <div className="test-case">
                <div>
                  <strong>Code execution</strong>
                  <p>Code runs in the backend sandbox and does not award points by itself.</p>
                </div>
                <span className="test-status">{consoleLogs.length ? 'Executed' : 'Not run'}</span>
              </div>
            </section>

            <section className="card submission-section">
              <h2>Submission</h2>
              <p>
                This practice page is not connected to a published backend activity.
                It cannot record a submission, grade, or course completion.
              </p>
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
