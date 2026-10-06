import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import Sidebar from '../components/Sidebar';

export default function Lesson() {
  const { user } = useAuth();

  const [code, setCode] = useState(() => {
    return localStorage.getItem(`codelearn_code_${user?.id}`) || '<h1>Hello, Developer!</h1>\n<p>This is my first live HTML code preview!</p>';
  });
  const [activeTab, setActiveTab] = useState('editor');
  const [quizAnswer, setQuizAnswer] = useState('');
  
  const [quizSubmitted, setQuizSubmitted] = useState(() => {
    return localStorage.getItem(`codelearn_quiz_submitted_${user?.id}`) === 'true';
  });
  
  const [quizCorrect, setQuizCorrect] = useState(() => {
    return localStorage.getItem(`codelearn_quiz_correct_${user?.id}`) === 'true';
  });

  useEffect(() => {
    if (user?.id) {
      localStorage.setItem(`codelearn_code_${user.id}`, code);
    }
  }, [code, user?.id]);

  useEffect(() => {
    if (user?.id) {
      localStorage.setItem(`codelearn_quiz_submitted_${user.id}`, quizSubmitted);
      localStorage.setItem(`codelearn_quiz_correct_${user.id}`, quizCorrect);
    }
  }, [quizSubmitted, quizCorrect, user?.id]);

  const handleQuizSubmit = () => {
    if (!quizAnswer) return;
    setQuizSubmitted(true);
    setQuizCorrect(quizAnswer === 'h1');
  };

  return (
    <div className="dashboard-layout">
      <Sidebar />
      <div className="main-content" style={{ display: 'flex', flexDirection: 'column' }}>

      <main className="lesson-page" style={{ minHeight: 'unset', padding: '0' }}>
        <div className="container" style={{ maxWidth: '100%', padding: '0' }}>
          {/* BREADCRUMB */}
          <div className="breadcrumb">
            <Link to="/courses">Courses</Link>
            <span>›</span>
            <span>HTML Fundamentals</span>
            <span>›</span>
            <strong>Introduction to HTML</strong>
          </div>

          {/* LESSON HEADER */}
          <section className="lesson-header">
            <div>
              <span className="lesson-label">MODULE 1 • LESSON 1</span>
              <h1>Introduction to HTML</h1>
              <p>
                Learn the basics of HTML and understand how web pages are structured.
              </p>
            </div>
            <span className="badge badge-success">In Progress</span>
          </section>

          {/* LEARNING OBJECTIVES */}
          <section className="card lesson-objectives">
            <h2>🎯 Learning Objectives</h2>
            <p>By the end of this lesson, you will be able to:</p>
            <ul>
              <li>Understand what HTML is.</li>
              <li>Explain the basic structure of an HTML document.</li>
              <li>Use common HTML elements and tags.</li>
              <li>Create a simple HTML webpage.</li>
            </ul>
          </section>

          {/* VIDEO */}
          <section className="card lesson-video">
            <div className="section-title">
              <div>
                <span className="lesson-label">LEARN</span>
                <h2>Watch the Lesson</h2>
              </div>
              <span className="video-duration">▶ 12 min</span>
            </div>

            <div className="video-placeholder" style={{ cursor: 'pointer' }}>
              <div className="play-button">▶</div>
              <h3>Introduction to HTML</h3>
              <p>Click play to start learning the fundamentals of HTML structure and syntax.</p>
            </div>
          </section>

          {/* TUTORIAL */}
          <section className="card tutorial-section">
            <span className="lesson-label">TUTORIAL</span>
            <h2>What is HTML?</h2>
            <p>
              HTML stands for HyperText Markup Language. It is used to create and structure content on web pages.
            </p>
            <p>
              HTML uses elements called tags to tell the browser how different parts of a webpage should be displayed.
            </p>

            <h3>Basic HTML Structure</h3>
            <div className="code-example">
              <pre>
                <code>{`<!DOCTYPE html>
<html>
<head>
    <title>My First Page</title>
</head>

<body>
    <h1>Hello, Developer!</h1>
    <p>Welcome to HTML.</p>
</body>

</html>`}</code>
              </pre>
            </div>
          </section>

          {/* PRACTICE WITH INTERACTIVE EDITOR & PREVIEW */}
          <section className="card practice-section">
            <div className="section-title">
              <div>
                <span className="lesson-label">PRACTICE</span>
                <h2>Try It Yourself</h2>
              </div>
              <span className="badge badge-warning">10 Points</span>
            </div>

            <p>
              Type or edit your HTML below and toggle to <strong>Preview</strong> or click <strong>▶ Run Code</strong> to see live output!
            </p>

            <div className="editor-container">
              <div className="editor-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button
                    className={`btn btn-small ${activeTab === 'editor' ? 'btn-primary' : 'btn-outline'}`}
                    onClick={() => setActiveTab('editor')}
                  >
                    HTML Editor
                  </button>
                  <button
                    className={`btn btn-small ${activeTab === 'preview' ? 'btn-primary' : 'btn-outline'}`}
                    onClick={() => setActiveTab('preview')}
                  >
                    Live Preview
                  </button>
                </div>
                <span className="badge" style={{ background: '#334155', color: '#f8fafc' }}>HTML5</span>
              </div>

              {activeTab === 'editor' ? (
                <textarea
                  className="code-editor"
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  placeholder="Enter HTML code here..."
                  style={{ width: '100%', minHeight: '160px', fontFamily: 'monospace', padding: '12px', fontSize: '14px' }}
                />
              ) : (
                <div
                  className="code-preview-output"
                  style={{
                    minHeight: '160px',
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
                <button
                  className="btn btn-primary"
                  onClick={() => setActiveTab('preview')}
                >
                  ▶ Run Code &amp; Preview
                </button>
                <button
                  className="btn btn-outline"
                  onClick={() => setCode('<h1>Hello, Developer!</h1>\n<p>This is my first live HTML code preview!</p>')}
                >
                  Reset
                </button>
              </div>
            </div>
          </section>

          {/* LESSON EXERCISE */}
          <section className="card exercise-section">
            <span className="lesson-label">EXERCISE</span>
            <h2>Quick Check</h2>
            <p>Which HTML tag is used to create the largest heading?</p>

            <div className="answer-option">
              <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                <input
                  type="radio"
                  name="answer"
                  value="h1"
                  checked={quizAnswer === 'h1'}
                  onChange={(e) => setQuizAnswer(e.target.value)}
                />
                &lt;h1&gt;
              </label>
            </div>

            <div className="answer-option">
              <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                <input
                  type="radio"
                  name="answer"
                  value="heading"
                  checked={quizAnswer === 'heading'}
                  onChange={(e) => setQuizAnswer(e.target.value)}
                />
                &lt;heading&gt;
              </label>
            </div>

            <div className="answer-option">
              <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                <input
                  type="radio"
                  name="answer"
                  value="head"
                  checked={quizAnswer === 'head'}
                  onChange={(e) => setQuizAnswer(e.target.value)}
                />
                &lt;head&gt;
              </label>
            </div>

            <button
              className="btn btn-primary"
              onClick={handleQuizSubmit}
              style={{ marginTop: '12px' }}
            >
              Submit Answer
            </button>

            {quizSubmitted && (
              <div style={{ marginTop: '16px', padding: '12px', borderRadius: '6px', backgroundColor: quizCorrect ? '#dcfce7' : '#fee2e2', color: quizCorrect ? '#166534' : '#991b1b' }}>
                {quizCorrect ? '🎉 Correct! <h1> defines the highest level heading.' : '❌ Incorrect. Hint: Heading tags range from <h1> (largest) to <h6> (smallest).'}
              </div>
            )}
          </section>

          {/* LESSON NAVIGATION */}
          <div className="lesson-navigation">
            <Link to="/courses" className="btn btn-outline">
              ← Back to Courses
            </Link>
            <Link to="/exercise" className="btn btn-primary">
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
