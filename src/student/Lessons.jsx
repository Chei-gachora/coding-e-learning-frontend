import { useState, useEffect } from 'react';
import { Link, useSearchParams, useParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import Sidebar from '../components/Sidebar';
import { getCourseBySlug } from '../data/coursesData';

export default function Lesson() {
  const { user } = useAuth();
  const [searchParams] = useSearchParams();
  const { courseId } = useParams();

  // Dynamically resolve course from query param ?course=... or route param :courseId
  const courseSlug = searchParams.get('course') || courseId || 'html-fundamentals';
  const course = getCourseBySlug(courseSlug);

  const [code, setCode] = useState(() => {
    return (
      localStorage.getItem(`codelearn_code_${user?.id}_${course.slug}`) ||
      course.starterCode
    );
  });

  const [activeTab, setActiveTab] = useState('editor');
  const [quizAnswer, setQuizAnswer] = useState('');
  const [consoleLogs, setConsoleLogs] = useState([]);

  const [quizSubmitted, setQuizSubmitted] = useState(() => {
    return (
      localStorage.getItem(`codelearn_quiz_submitted_${user?.id}_${course.slug}`) === 'true'
    );
  });

  const [quizCorrect, setQuizCorrect] = useState(() => {
    return (
      localStorage.getItem(`codelearn_quiz_correct_${user?.id}_${course.slug}`) === 'true'
    );
  });

  // When course changes, update code and quiz state
  useEffect(() => {
    const savedCode = localStorage.getItem(`codelearn_code_${user?.id}_${course.slug}`);
    setCode(savedCode || course.starterCode);

    const savedQuizSubmitted =
      localStorage.getItem(`codelearn_quiz_submitted_${user?.id}_${course.slug}`) === 'true';
    const savedQuizCorrect =
      localStorage.getItem(`codelearn_quiz_correct_${user?.id}_${course.slug}`) === 'true';

    setQuizSubmitted(savedQuizSubmitted);
    setQuizCorrect(savedQuizCorrect);
    setQuizAnswer('');
    setActiveTab('editor');
    setConsoleLogs([]);
  }, [course.slug, user?.id]);

  useEffect(() => {
    if (user?.id && course?.slug) {
      localStorage.setItem(`codelearn_code_${user.id}_${course.slug}`, code);
    }
  }, [code, user?.id, course.slug]);

  useEffect(() => {
    if (user?.id && course?.slug) {
      localStorage.setItem(
        `codelearn_quiz_submitted_${user.id}_${course.slug}`,
        quizSubmitted
      );
      localStorage.setItem(
        `codelearn_quiz_correct_${user.id}_${course.slug}`,
        quizCorrect
      );
    }
  }, [quizSubmitted, quizCorrect, user?.id, course.slug]);

  const handleRunCode = () => {
    setActiveTab('preview');
    if (course.previewType === 'console') {
      const logs = [];
      const customConsole = {
        log: (...args) =>
          logs.push(
            args
              .map((a) =>
                typeof a === 'object' ? JSON.stringify(a, null, 2) : String(a)
              )
              .join(' ')
          ),
        error: (...args) => logs.push('❌ ' + args.join(' ')),
        warn: (...args) => logs.push('⚠️ ' + args.join(' ')),
        info: (...args) => logs.push('ℹ️ ' + args.join(' '))
      };

      try {
        if (course.codeType === 'javascript' || course.codeType === 'typescript') {
          // Strip basic TS type annotations for browser evaluation
          const cleanCode = code
            .replace(/:\s*(string|number|boolean|any|void|object|string\[\]|number\[\])/g, '')
            .replace(/interface\s+\w+\s*\{[\s\S]*?\}/g, '');
          const runner = new Function('console', cleanCode);
          runner(customConsole);
        } else if (course.codeType === 'python') {
          // Parse Python prints and simple expressions
          const printMatches = [...code.matchAll(/print\((?:f?["'](.*?)["']|(.*?))\)/g)];
          if (printMatches.length > 0) {
            printMatches.forEach((m) => {
              logs.push(m[1] || m[2]);
            });
          } else {
            logs.push('Python script executed with return code 0.');
          }
        }

        if (logs.length === 0) {
          logs.push('Execution completed. (No console.log outputs)');
        }
      } catch (err) {
        logs.push(`Runtime Error: ${err.message}`);
      }

      setConsoleLogs(logs);
    }
  };

  const handleResetCode = () => {
    setCode(course.starterCode);
    setConsoleLogs([]);
    setActiveTab('editor');
  };

  const handleQuizSubmit = () => {
    if (!quizAnswer) return;
    const isCorrect = quizAnswer === course.quiz.correctAnswer;
    setQuizSubmitted(true);
    setQuizCorrect(isCorrect);
  };

  return (
    <div className="dashboard-layout">
      {/* Stationary Sidebar */}
      <Sidebar />

      <div className="main-content" style={{ display: 'flex', flexDirection: 'column' }}>
        <main className="lesson-page" style={{ minHeight: 'unset', padding: '0' }}>
          <div className="container" style={{ maxWidth: '100%', padding: '0' }}>
            {/* BREADCRUMB */}
            <div className="breadcrumb">
              <Link to="/courses">Courses</Link>
              <span>›</span>
              <Link to="/my-courses">My Courses</Link>
              <span>›</span>
              <span>{course.title}</span>
              <span>›</span>
              <strong>{course.lessonTitle}</strong>
            </div>

            {/* LESSON HEADER */}
            <section className="lesson-header">
              <div>
                <span className="lesson-label">{course.moduleLabel}</span>
                <h1>{course.lessonTitle}</h1>
                <p>{course.lessonDescription}</p>
                <div style={{ marginTop: '8px', fontSize: '14px', color: 'var(--text-secondary)' }}>
                  Instructor: <strong style={{ color: 'var(--text-primary)' }}>{course.instructor}</strong> • Level: <strong style={{ color: 'var(--text-primary)' }}>{course.level}</strong>
                </div>
              </div>
              <span className={`badge ${course.status === 'completed' ? 'badge-success' : 'badge-primary'}`}>
                {course.status === 'completed' ? 'Completed' : 'In Progress'}
              </span>
            </section>

            {/* LEARNING OBJECTIVES */}
            <section className="card lesson-objectives">
              <h2>🎯 Learning Objectives</h2>
              <p>By the end of this lesson, you will be able to:</p>
              <ul>
                {course.objectives.map((obj, i) => (
                  <li key={i}>{obj}</li>
                ))}
              </ul>
            </section>

            {/* VIDEO */}
            <section className="card lesson-video">
              <div className="section-title">
                <div>
                  <span className="lesson-label">LEARN</span>
                  <h2>Watch the Lesson</h2>
                </div>
                <span className="video-duration">▶ {course.video.duration}</span>
              </div>

              <div className="video-placeholder" style={{ cursor: 'pointer' }}>
                <div className="play-button">▶</div>
                <h3>{course.video.title}</h3>
                <p>{course.video.description}</p>
              </div>
            </section>

            {/* TUTORIAL */}
            <section className="card tutorial-section">
              <span className="lesson-label">{course.tutorial.label}</span>
              <h2>{course.tutorial.title}</h2>
              <p>{course.tutorial.p1}</p>
              <p>{course.tutorial.p2}</p>

              <h3>Code Example</h3>
              <div className="code-example">
                <pre>
                  <code>{course.tutorial.codeSnippet}</code>
                </pre>
              </div>
            </section>

            {/* PRACTICE WITH INTERACTIVE EDITOR & PREVIEW/CONSOLE */}
            <section className="card practice-section">
              <div className="section-title">
                <div>
                  <span className="lesson-label">PRACTICE</span>
                  <h2>Try It Yourself</h2>
                </div>
                <span className="badge badge-warning">10 Points</span>
              </div>

              <p>
                Type or edit your {course.codeType.toUpperCase()} code below and toggle to{' '}
                <strong>{course.previewType === 'console' ? 'Console Output' : 'Live Preview'}</strong> or click{' '}
                <strong>▶ Run Code &amp; Preview</strong> to see live output!
              </p>

              <div className="editor-container">
                <div
                  className="editor-header"
                  style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
                >
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button
                      className={`btn btn-small ${activeTab === 'editor' ? 'btn-primary' : 'btn-outline'}`}
                      onClick={() => setActiveTab('editor')}
                    >
                      {course.codeType.toUpperCase()} Editor
                    </button>
                    <button
                      className={`btn btn-small ${activeTab === 'preview' ? 'btn-primary' : 'btn-outline'}`}
                      onClick={handleRunCode}
                    >
                      {course.previewType === 'console' ? 'Console Output' : 'Live Preview'}
                    </button>
                  </div>
                  <span className="badge" style={{ background: '#334155', color: '#f8fafc', textTransform: 'uppercase' }}>
                    {course.codeType}
                  </span>
                </div>

                {activeTab === 'editor' ? (
                  <textarea
                    className="code-editor"
                    value={code}
                    onChange={(e) => setCode(e.target.value)}
                    placeholder={`Enter ${course.codeType.toUpperCase()} code here...`}
                    style={{
                      width: '100%',
                      minHeight: '180px',
                      fontFamily: 'monospace',
                      padding: '14px',
                      fontSize: '14px',
                      background: '#090d16',
                      color: '#f8fafc',
                      borderRadius: '8px',
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
                      borderRadius: '8px',
                      border: '1px solid #24344d',
                      fontFamily: 'monospace',
                      fontSize: '14px',
                      overflowX: 'auto'
                    }}
                  >
                    <div
                      style={{
                        color: '#64748b',
                        fontSize: '12px',
                        borderBottom: '1px solid #1e293b',
                        paddingBottom: '6px',
                        marginBottom: '10px'
                      }}
                    >
                      CONSOLE OUTPUT ({course.codeType.toUpperCase()})
                    </div>
                    {consoleLogs.length === 0 ? (
                      <div style={{ color: '#94a3b8' }}>Click &quot;▶ Run Code &amp; Preview&quot; to execute and see output.</div>
                    ) : (
                      consoleLogs.map((log, idx) => (
                        <div
                          key={idx}
                          style={{
                            color: log.startsWith('❌') || log.startsWith('Runtime Error') ? '#f87171' : '#38bdf8',
                            marginBottom: '4px'
                          }}
                        >
                          <span style={{ color: '#64748b', marginRight: '8px' }}>&gt;</span>
                          {log}
                        </div>
                      ))
                    )}
                  </div>
                ) : (
                  <div
                    className="code-preview-output"
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

                <div className="editor-footer" style={{ marginTop: '12px', display: 'flex', gap: '12px' }}>
                  <button className="btn btn-primary" onClick={handleRunCode}>
                    ▶ Run Code &amp; Preview
                  </button>
                  <button className="btn btn-outline" onClick={handleResetCode}>
                    Reset Code
                  </button>
                </div>
              </div>
            </section>

            {/* LESSON EXERCISE / QUICK CHECK */}
            <section className="card exercise-section">
              <span className="lesson-label">EXERCISE</span>
              <h2>Quick Check</h2>
              <p>{course.quiz.question}</p>

              {course.quiz.options.map((opt) => (
                <div key={opt.value} className="answer-option" style={{ marginBottom: '10px' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer' }}>
                    <input
                      type="radio"
                      name="answer"
                      value={opt.value}
                      checked={quizAnswer === opt.value}
                      onChange={(e) => setQuizAnswer(e.target.value)}
                    />
                    <span>{opt.label}</span>
                  </label>
                </div>
              ))}

              <button className="btn btn-primary" onClick={handleQuizSubmit} style={{ marginTop: '12px' }}>
                Submit Answer
              </button>

              {quizSubmitted && (
                <div
                  style={{
                    marginTop: '16px',
                    padding: '14px',
                    borderRadius: '8px',
                    backgroundColor: quizCorrect ? '#064e3b' : '#7f1d1d',
                    color: quizCorrect ? '#a7f3d0' : '#fecaca',
                    border: `1px solid ${quizCorrect ? '#059669' : '#dc2626'}`
                  }}
                >
                  {quizCorrect ? course.quiz.correctFeedback : course.quiz.incorrectFeedback}
                </div>
              )}
            </section>

            {/* LESSON NAVIGATION */}
            <div className="lesson-navigation" style={{ display: 'flex', justifyContent: 'space-between', margin: '32px 0' }}>
              <Link to="/my-courses" className="btn btn-outline">
                ← Back to My Courses
              </Link>
              <Link to={`/exercise?course=${course.slug}`} className="btn btn-primary">
                Continue to Exercise →
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
