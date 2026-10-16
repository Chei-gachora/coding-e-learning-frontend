import { useState, useEffect } from 'react';
import { Link, useSearchParams, useParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useCourses } from '../context/CourseContext';
import Sidebar from '../components/Sidebar';
import { getCourseBySlug } from '../data/coursesData';

export default function Lesson() {
  const { user } = useAuth();
  const { courses } = useCourses();
  const [searchParams] = useSearchParams();
  const { courseId } = useParams();

  // Dynamically resolve course from query param ?course=... or route param :courseId
  const courseSlug = searchParams.get('course') || courseId || 'html-fundamentals';
  const matchedContextCourse = courses.find(
    c => c.slug?.toLowerCase() === courseSlug.toLowerCase() || String(c.id) === String(courseSlug)
  );
  const baseCourse = getCourseBySlug(courseSlug);
  const course = {
    ...baseCourse,
    ...(matchedContextCourse || {}),
  };

  // Build full lessons list from context or base course
  const lessonsList = (matchedContextCourse?.lessonsList && matchedContextCourse.lessonsList.length > 0)
    ? matchedContextCourse.lessonsList
    : [
        {
          id: `${course.slug}-lesson-1`,
          lessonNumber: 1,
          title: course.lessonTitle || `Core Foundations of ${course.title}`,
          moduleLabel: course.moduleLabel || 'MODULE 1 • LESSON 1',
          description: course.lessonDescription || course.description,
          duration: course.video?.duration || '15 min',
          codeSnippet: course.tutorial?.codeSnippet || course.starterCode,
          starterCode: course.starterCode,
          quiz: course.quiz
        }
      ];

  const lessonParam = searchParams.get('lesson');
  const [activeLessonId, setActiveLessonId] = useState(() => {
    return lessonParam || lessonsList[0]?.id;
  });

  // Keep activeLessonId in sync if lessonsList changes or query param arrives
  useEffect(() => {
    if (lessonParam && lessonsList.some(l => String(l.id) === String(lessonParam))) {
      setActiveLessonId(lessonParam);
    } else if (lessonsList.length > 0 && !lessonsList.some(l => String(l.id) === String(activeLessonId))) {
      setActiveLessonId(lessonsList[0].id);
    }
  }, [lessonParam, lessonsList, activeLessonId]);

  const activeLesson = lessonsList.find(l => String(l.id) === String(activeLessonId)) || lessonsList[0];

  const [code, setCode] = useState(() => {
    const key = `codelearn_code_${user?.id}_${course.slug}_${activeLesson?.id}`;
    return localStorage.getItem(key) || activeLesson?.starterCode || course.starterCode;
  });

  const [activeTab, setActiveTab] = useState('editor');
  const [quizAnswer, setQuizAnswer] = useState('');
  const [consoleLogs, setConsoleLogs] = useState([]);

  const [quizSubmitted, setQuizSubmitted] = useState(() => {
    return (
      localStorage.getItem(`codelearn_quiz_submitted_${user?.id}_${course.slug}_${activeLesson?.id}`) === 'true'
    );
  });

  const [quizCorrect, setQuizCorrect] = useState(() => {
    return (
      localStorage.getItem(`codelearn_quiz_correct_${user?.id}_${course.slug}_${activeLesson?.id}`) === 'true'
    );
  });

  // When active lesson changes, update code and quiz state
  useEffect(() => {
    if (!activeLesson) return;
    const lessonCodeKey = `codelearn_code_${user?.id}_${course.slug}_${activeLesson.id}`;
    const savedCode = localStorage.getItem(lessonCodeKey);
    setCode(savedCode || activeLesson.starterCode || course.starterCode);

    const savedQuizSubmitted =
      localStorage.getItem(`codelearn_quiz_submitted_${user?.id}_${course.slug}_${activeLesson.id}`) === 'true';
    const savedQuizCorrect =
      localStorage.getItem(`codelearn_quiz_correct_${user?.id}_${course.slug}_${activeLesson.id}`) === 'true';

    setQuizSubmitted(savedQuizSubmitted);
    setQuizCorrect(savedQuizCorrect);
    setQuizAnswer('');
    setActiveTab('editor');
    setConsoleLogs([]);
  }, [course.slug, activeLesson?.id, user?.id]);

  useEffect(() => {
    if (user?.id && course?.slug && activeLesson?.id) {
      localStorage.setItem(`codelearn_code_${user.id}_${course.slug}_${activeLesson.id}`, code);
    }
  }, [code, user?.id, course.slug, activeLesson?.id]);

  useEffect(() => {
    if (user?.id && course?.slug && activeLesson?.id) {
      localStorage.setItem(
        `codelearn_quiz_submitted_${user.id}_${course.slug}_${activeLesson.id}`,
        quizSubmitted
      );
      localStorage.setItem(
        `codelearn_quiz_correct_${user.id}_${course.slug}_${activeLesson.id}`,
        quizCorrect
      );
    }
  }, [quizSubmitted, quizCorrect, user?.id, course.slug, activeLesson?.id]);

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
    setCode(activeLesson.starterCode || course.starterCode);
    setConsoleLogs([]);
    setActiveTab('editor');
  };

  const handleQuizSubmit = () => {
    if (!quizAnswer) return;
    const currentQuiz = activeLesson.quiz || course.quiz;
    const isCorrect = quizAnswer === currentQuiz?.correctAnswer || quizAnswer === 'a';
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
              <Link to={`/lesson?course=${course.slug}`}>{course.title}</Link>
              <span>›</span>
              <strong>{activeLesson.title}</strong>
            </div>

            {/* COURSE LESSONS SYLLABUS / SELECTOR */}
            <section className="card" style={{ marginBottom: '24px', padding: '16px 20px', background: '#0e1626', border: '1px solid #1e293b', borderRadius: '12px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px', flexWrap: 'wrap', gap: '8px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <span style={{ fontSize: '20px' }}>📖</span>
                  <div>
                    <h3 style={{ margin: 0, fontSize: '15px', color: '#f8fafc' }}>
                      Course Curriculum ({lessonsList.length} Lessons Available)
                    </h3>
                    <span style={{ fontSize: '12px', color: '#94a3b8' }}>
                      Click any lesson below to view tutorial, interactive editor, and quick quiz.
                    </span>
                  </div>
                </div>
                <span className="badge" style={{ background: 'rgba(139, 92, 246, 0.2)', color: '#c084fc', border: '1px solid rgba(139, 92, 246, 0.4)' }}>
                  Active: Lesson {activeLesson.lessonNumber || 1} of {lessonsList.length}
                </span>
              </div>

              <div style={{ display: 'flex', gap: '10px', overflowX: 'auto', paddingBottom: '6px' }}>
                {lessonsList.map((les, idx) => {
                  const isCurrent = String(les.id) === String(activeLesson.id);
                  return (
                    <button
                      key={les.id || idx}
                      onClick={() => setActiveLessonId(les.id)}
                      className={`btn btn-small ${isCurrent ? 'btn-primary' : 'btn-outline'}`}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        whiteSpace: 'nowrap',
                        padding: '8px 14px',
                        borderRadius: '8px',
                        background: isCurrent ? 'linear-gradient(135deg, #8b5cf6 0%, #6d28d9 100%)' : '#090d16',
                        borderColor: isCurrent ? '#8b5cf6' : '#24344d',
                        color: isCurrent ? '#fff' : '#cbd5e1',
                        cursor: 'pointer'
                      }}
                    >
                      <span style={{ opacity: 0.7, fontSize: '11px', fontWeight: 'bold' }}>#{idx + 1}</span>
                      <span>{les.title}</span>
                      {les.isNew && (
                        <span className="badge" style={{ background: '#10b981', color: '#fff', fontSize: '10px', padding: '1px 6px' }}>NEW</span>
                      )}
                    </button>
                  );
                })}
              </div>
            </section>

            {/* LESSON HEADER */}
            <section className="lesson-header">
              <div>
                <span className="lesson-label">{activeLesson.moduleLabel || course.moduleLabel || 'MODULE 1 • LESSON 1'}</span>
                <h1>{activeLesson.title}</h1>
                <p>{activeLesson.description || course.lessonDescription}</p>
                <div style={{ marginTop: '8px', fontSize: '14px', color: 'var(--text-secondary)' }}>
                  Instructor: <strong style={{ color: 'var(--text-primary)' }}>{course.instructor}</strong> • Level: <strong style={{ color: 'var(--text-primary)' }}>{course.level}</strong>
                </div>
              </div>
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                {activeLesson.isNew && (
                  <span className="badge" style={{ background: '#10b981', color: '#fff' }}>NEW LESSON</span>
                )}
                <span className={`badge ${course.status === 'completed' ? 'badge-success' : 'badge-primary'}`}>
                  {course.status === 'completed' ? 'Completed' : 'In Progress'}
                </span>
              </div>
            </section>

            {/* LEARNING OBJECTIVES */}
            <section className="card lesson-objectives">
              <h2>🎯 Learning Objectives</h2>
              <p>By the end of this lesson, you will be able to:</p>
              <ul>
                {(course.objectives || [
                  `Understand core principles and syntax of ${activeLesson.title}.`,
                  'Write, run, and inspect working code in real-time.',
                  'Complete hands-on exercise with instant evaluation.'
                ]).map((obj, i) => (
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
                <span className="video-duration">▶ {activeLesson.duration || course.video?.duration || '15 min'}</span>
              </div>

              <div className="video-placeholder" style={{ cursor: 'pointer' }}>
                <div className="play-button">▶</div>
                <h3>{activeLesson.title}</h3>
                <p>{activeLesson.description || course.video?.description}</p>
              </div>
            </section>

            {/* TUTORIAL */}
            <section className="card tutorial-section">
              <span className="lesson-label">{activeLesson.moduleLabel || course.tutorial?.label || 'TUTORIAL'}</span>
              <h2>{activeLesson.title}</h2>
              <p>{activeLesson.description || course.tutorial?.p1}</p>
              {course.tutorial?.p2 && <p>{course.tutorial.p2}</p>}

              <h3>Code Example</h3>
              <div className="code-example">
                <pre>
                  <code>{activeLesson.codeSnippet || course.tutorial?.codeSnippet}</code>
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
              {(() => {
                const currentQuiz = activeLesson?.quiz || course.quiz || {
                  question: `What is the key learning objective of ${activeLesson?.title || 'this lesson'}?`,
                  options: [
                    { value: 'a', label: `Mastering ${activeLesson?.title || 'the core concepts'} through code practice` },
                    { value: 'b', label: 'Skipping testing and debugging' },
                    { value: 'c', label: 'None of the above' }
                  ],
                  correctAnswer: 'a',
                  correctFeedback: '🎉 Correct! Practical understanding is the primary objective.',
                  incorrectFeedback: '❌ Incorrect. Hint: Choose the active coding takeaway.'
                };
                return (
                  <>
                    <p>{currentQuiz.question}</p>

                    {(currentQuiz.options || []).map((opt) => (
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
                        {quizCorrect ? currentQuiz.correctFeedback : currentQuiz.incorrectFeedback}
                      </div>
                    )}
                  </>
                );
              })()}
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
