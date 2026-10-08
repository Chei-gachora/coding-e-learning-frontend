import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import Sidebar from '../components/Sidebar';
import { FaArrowRight, FaCode, FaCheckCircle, FaBookOpen } from 'react-icons/fa';
import { IoSparkles } from 'react-icons/io5';

export default function LearningPathDashboard() {
  const { pathId } = useParams();

  // Define frontend languages and technologies available in the track
  const frontendLanguages = [
    {
      id: 'html',
      slug: 'html-fundamentals',
      name: 'HTML5',
      badge: 'Structure & Semantics',
      icon: '🌐',
      color: '#f97316',
      level: 'Beginner',
      modulesCount: 6,
      lessonsCount: 24,
      exercisesCount: 30,
      progress: 45,
      status: 'in-progress',
      currentLesson: 'Introduction to HTML & Semantic Tags',
      description: 'Master document outlines, semantic HTML5 elements, accessible forms, tables, and web standards.',
      keySkills: ['Semantic Markup', 'Accessible Forms', 'SEO Metadata', 'Media & Canvas'],
      estimatedTime: '8 Hours'
    },
    {
      id: 'css',
      slug: 'css-fundamentals',
      name: 'CSS3',
      badge: 'Styles & Layouts',
      icon: '🎨',
      color: '#38bdf8',
      level: 'Beginner',
      modulesCount: 5,
      lessonsCount: 20,
      exercisesCount: 25,
      progress: 15,
      status: 'in-progress',
      currentLesson: 'CSS Box Model & Flexbox Mastery',
      description: 'Learn modern responsive layouts with Flexbox, CSS Grid, custom properties, animations, and media queries.',
      keySkills: ['Box Model', 'Flexbox & Grid', 'Responsive Queries', 'CSS Variables', 'Animations'],
      estimatedTime: '10 Hours'
    },
    {
      id: 'javascript',
      slug: 'javascript-fundamentals',
      name: 'JavaScript (ES6+)',
      badge: 'Core Logic & Web APIs',
      icon: '🟨',
      color: '#eab308',
      level: 'Beginner - Intermediate',
      modulesCount: 8,
      lessonsCount: 32,
      exercisesCount: 40,
      progress: 65,
      status: 'in-progress',
      currentLesson: 'Variables, Functions & Scope',
      description: 'Add dynamic interactivity. Master modern ES6+ syntax, functions, closures, promises, async/await, and DOM events.',
      keySkills: ['ES6+ Syntax', 'Arrow Functions', 'DOM Manipulation', 'Async / Await', 'Array Methods'],
      estimatedTime: '14 Hours'
    },
    {
      id: 'react',
      slug: 'react-for-beginners',
      name: 'React.js',
      badge: 'Component Architecture',
      icon: '⚛️',
      color: '#06b6d4',
      level: 'Intermediate',
      modulesCount: 6,
      lessonsCount: 28,
      exercisesCount: 35,
      progress: 30,
      status: 'in-progress',
      currentLesson: 'Components, Props & JSX',
      description: 'Build single-page web applications using reusable functional components, JSX, props, and reactive hooks.',
      keySkills: ['Component Design', 'JSX Expressions', 'useState & useEffect', 'Custom Hooks', 'Props Drilling'],
      estimatedTime: '12 Hours'
    },
    {
      id: 'typescript',
      slug: 'typescript-mastery',
      name: 'TypeScript',
      badge: 'Type Safety & Scale',
      icon: '💙',
      color: '#3b82f6',
      level: 'Intermediate',
      modulesCount: 5,
      lessonsCount: 22,
      exercisesCount: 28,
      progress: 0,
      status: 'not-started',
      currentLesson: 'Static Types, Interfaces & Generics',
      description: 'Scale modern frontend codebases with robust type annotations, interfaces, union types, and compile-time safety.',
      keySkills: ['Type Annotations', 'Interfaces', 'Generics', 'Union Types', 'Compiler Config'],
      estimatedTime: '11 Hours'
    }
  ];

  // Selected language state (default to JavaScript or HTML)
  const [selectedLanguage, setSelectedLanguage] = useState(frontendLanguages[2]); // JavaScript
  const [filterLevel, setFilterLevel] = useState('all');

  const filteredLanguages = frontendLanguages.filter((lang) => {
    if (filterLevel === 'all') return true;
    if (filterLevel === 'in-progress') return lang.status === 'in-progress';
    if (filterLevel === 'not-started') return lang.status === 'not-started';
    return true;
  });

  const savedPaths = (() => {
    try {
      const data = localStorage.getItem('codelearn_learning_paths_state');
      return data ? JSON.parse(data) : null;
    } catch (e) {
      return null;
    }
  })();

  const frontendCompleted = savedPaths && savedPaths[0] ? savedPaths[0].progress >= 100 : false;
  const isNonFrontendAndLocked = pathId && pathId !== 'frontend' && !frontendCompleted;

  if (isNonFrontendAndLocked) {
    return (
      <div className="dashboard-layout">
        <Sidebar />
        <div className="main-content" style={{ display: 'flex', flexDirection: 'column' }}>
          <main style={{ minHeight: 'unset', padding: '0' }}>
            <div className="container" style={{ maxWidth: '100%', padding: '0' }}>
              <div className="breadcrumb" style={{ marginBottom: '20px' }}>
                <Link to="/courses">Courses</Link>
                <span>›</span>
                <Link to="/learning-paths">Learning Paths</Link>
                <span>›</span>
                <strong>Track Locked</strong>
              </div>

              <div
                style={{
                  background: 'linear-gradient(135deg, #1e1b4b 0%, #0f172a 100%)',
                  border: '1px solid #ef4444',
                  borderRadius: '16px',
                  padding: '48px 32px',
                  textAlign: 'center',
                  maxWidth: '640px',
                  margin: '40px auto',
                  boxShadow: '0 10px 30px rgba(0,0,0,0.4)',
                }}
              >
                <div style={{ fontSize: '48px', marginBottom: '16px' }}>🔒</div>
                <h1 style={{ fontSize: '26px', color: '#f87171', marginBottom: '12px' }}>
                  This Learning Track is Locked
                </h1>
                <p style={{ color: '#cbd5e1', fontSize: '15px', lineHeight: '1.6', marginBottom: '28px' }}>
                  You must complete the <strong>Frontend Developer</strong> track (100%) before unlocking subsequent career paths. Tracks unlock sequentially one after the other.
                </p>
                <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
                  <Link to="/learning-paths/frontend" className="btn btn-primary">
                    Go to Frontend Developer Track →
                  </Link>
                  <Link to="/learning-paths" className="btn btn-outline">
                    Back to Learning Paths
                  </Link>
                </div>
              </div>
            </div>
          </main>
        </div>
      </div>
    );
  }

  return (
    <div className="dashboard-layout">
      {/* Stationary Sidebar */}
      <Sidebar />

      <div className="main-content" style={{ display: 'flex', flexDirection: 'column' }}>
        <main style={{ minHeight: 'unset', padding: '0' }}>
          <div className="container" style={{ maxWidth: '100%', padding: '0' }}>
            {/* BREADCRUMB */}
            <div className="breadcrumb" style={{ marginBottom: '20px' }}>
              <Link to="/courses">Courses</Link>
              <span>›</span>
              <Link to="/learning-paths">Learning Paths</Link>
              <span>›</span>
              <strong>Frontend Developer Track</strong>
            </div>

            {/* TRACK HERO BANNER */}
            <section
              style={{
                background: 'linear-gradient(135deg, #0f172a 0%, #1e1b4b 60%, #172554 100%)',
                padding: '32px',
                borderRadius: '16px',
                border: '1px solid #3b82f644',
                boxShadow: '0 10px 30px rgba(0,0,0,0.3)',
                marginBottom: '32px'
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '20px' }}>
                <div style={{ maxWidth: '680px' }}>
                  <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', background: 'rgba(59, 130, 246, 0.15)', border: '1px solid #3b82f6', color: '#60a5fa', padding: '6px 14px', borderRadius: '9999px', fontSize: '13px', fontWeight: '700', marginBottom: '14px' }}>
                    <IoSparkles /> FRONTEND DEVELOPER ROADMAP
                  </div>
                  <h1 style={{ fontSize: '32px', fontWeight: '800', margin: '0 0 10px 0', letterSpacing: '-0.5px' }}>
                    Select Your Frontend Language
                  </h1>
                  <p style={{ color: '#cbd5e1', fontSize: '16px', lineHeight: '1.6', margin: 0 }}>
                    Choose the language or technology you want to learn right now. Each language provides dedicated interactive lessons, live in-browser code execution, and hands-on exercises.
                  </p>
                </div>

                <div
                  style={{
                    background: 'rgba(15, 23, 42, 0.75)',
                    border: '1px solid #334155',
                    borderRadius: '14px',
                    padding: '20px',
                    minWidth: '240px'
                  }}
                >
                  <div style={{ fontSize: '13px', color: '#94a3b8', marginBottom: '6px' }}>Overall Track Progress</div>
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px', marginBottom: '8px' }}>
                    <span style={{ fontSize: '28px', fontWeight: '800', color: '#38bdf8' }}>42%</span>
                    <span style={{ fontSize: '13px', color: '#94a3b8' }}>Completed</span>
                  </div>
                  <div style={{ width: '100%', height: '8px', background: '#334155', borderRadius: '4px', overflow: 'hidden' }}>
                    <div style={{ width: '42%', height: '100%', background: 'linear-gradient(90deg, #38bdf8, #3b82f6)' }}></div>
                  </div>
                  <div style={{ fontSize: '12px', color: '#94a3b8', marginTop: '10px' }}>
                    ✅ 4 Active Technologies • 1 Upcoming
                  </div>
                </div>
              </div>

              {/* RECOMMENDED LEARNING PATHWAY STEPPER */}
              <div style={{ marginTop: '28px', paddingTop: '24px', borderTop: '1px solid rgba(255,255,255,0.08)' }}>
                <div style={{ fontSize: '13px', fontWeight: '700', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.8px', marginBottom: '14px' }}>
                  Recommended Progression Order:
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                  {frontendLanguages.map((lang, index) => {
                    const isSelected = selectedLanguage.id === lang.id;
                    return (
                      <div
                        key={lang.id}
                        onClick={() => setSelectedLanguage(lang)}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '8px',
                          padding: '8px 14px',
                          borderRadius: '10px',
                          cursor: 'pointer',
                          background: isSelected ? 'rgba(59, 130, 246, 0.25)' : 'rgba(30, 41, 59, 0.7)',
                          border: isSelected ? `2px solid ${lang.color}` : '1px solid #334155',
                          transition: 'all 0.2s ease'
                        }}
                      >
                        <span style={{ fontSize: '16px' }}>{lang.icon}</span>
                        <span style={{ fontWeight: isSelected ? '700' : '500', fontSize: '14px', color: isSelected ? '#ffffff' : '#cbd5e1' }}>
                          {index + 1}. {lang.name}
                        </span>
                        {lang.status === 'in-progress' && (
                          <span style={{ fontSize: '11px', background: '#0284c7', color: '#fff', padding: '2px 6px', borderRadius: '4px' }}>
                            {lang.progress}%
                          </span>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </section>

            {/* QUICK SELECTION SPOTLIGHT PANEL */}
            <section
              style={{
                background: 'linear-gradient(135deg, #131c2e 0%, #1e293b 100%)',
                border: `2px solid ${selectedLanguage.color}`,
                borderRadius: '16px',
                padding: '24px 28px',
                marginBottom: '36px',
                boxShadow: '0 8px 24px rgba(0,0,0,0.25)'
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '20px' }}>
                <div style={{ display: 'flex', gap: '18px', alignItems: 'center' }}>
                  <div
                    style={{
                      width: '64px',
                      height: '64px',
                      borderRadius: '14px',
                      background: `${selectedLanguage.color}22`,
                      border: `1px solid ${selectedLanguage.color}66`,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '32px'
                    }}
                  >
                    {selectedLanguage.icon}
                  </div>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <span style={{ fontSize: '12px', fontWeight: '700', color: selectedLanguage.color, textTransform: 'uppercase', letterSpacing: '0.6px' }}>
                        READY TO LEARN
                      </span>
                      <span className={`status-badge ${selectedLanguage.status}`}>
                        {selectedLanguage.status === 'in-progress' ? `In Progress (${selectedLanguage.progress}%)` : 'Not Started'}
                      </span>
                    </div>
                    <h2 style={{ fontSize: '24px', margin: '4px 0 6px 0', color: '#f8fafc' }}>
                      {selectedLanguage.name} • {selectedLanguage.currentLesson}
                    </h2>
                    <p style={{ color: '#94a3b8', margin: 0, fontSize: '14px', maxWidth: '600px' }}>
                      {selectedLanguage.description}
                    </p>
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                  <Link
                    to={`/lesson?course=${selectedLanguage.slug}`}
                    className="btn btn-primary"
                    style={{
                      padding: '12px 24px',
                      fontSize: '15px',
                      fontWeight: '700',
                      boxShadow: `0 4px 14px ${selectedLanguage.color}44`,
                      backgroundColor: selectedLanguage.color
                    }}
                  >
                    Launch {selectedLanguage.name} Lesson Dashboard <FaArrowRight />
                  </Link>

                  <Link
                    to={`/exercise?course=${selectedLanguage.slug}`}
                    className="btn btn-outline"
                    style={{ padding: '12px 20px', fontSize: '15px', fontWeight: '600' }}
                  >
                    Practice Exercise
                  </Link>
                </div>
              </div>
            </section>

            {/* ALL FRONTEND LANGUAGES GRID */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '12px' }}>
              <div>
                <h2 style={{ fontSize: '22px', margin: 0 }}>Available Frontend Languages</h2>
                <p style={{ color: '#94a3b8', fontSize: '14px', margin: '4px 0 0 0' }}>
                  Click any language card to preview modules and start learning immediately.
                </p>
              </div>

              {/* FILTER BUTTONS */}
              <div style={{ display: 'flex', gap: '8px' }}>
                <button
                  className={`filter-btn ${filterLevel === 'all' ? 'active' : ''}`}
                  onClick={() => setFilterLevel('all')}
                >
                  All (5)
                </button>
                <button
                  className={`filter-btn ${filterLevel === 'in-progress' ? 'active' : ''}`}
                  onClick={() => setFilterLevel('in-progress')}
                >
                  In Progress (4)
                </button>
                <button
                  className={`filter-btn ${filterLevel === 'not-started' ? 'active' : ''}`}
                  onClick={() => setFilterLevel('not-started')}
                >
                  Not Started (1)
                </button>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '22px', marginBottom: '40px' }}>
              {filteredLanguages.map((lang) => {
                const isSelected = selectedLanguage.id === lang.id;
                return (
                  <div
                    key={lang.id}
                    onClick={() => setSelectedLanguage(lang)}
                    style={{
                      background: 'var(--bg-card)',
                      border: isSelected ? `2px solid ${lang.color}` : '1px solid var(--border-color)',
                      borderRadius: '14px',
                      overflow: 'hidden',
                      display: 'flex',
                      flexDirection: 'column',
                      cursor: 'pointer',
                      transition: 'all 0.2s ease',
                      boxShadow: isSelected ? `0 8px 20px ${lang.color}22` : 'none',
                      transform: isSelected ? 'translateY(-2px)' : 'none'
                    }}
                  >
                    {/* Top colored strip */}
                    <div style={{ height: '4px', background: lang.color, width: '100%' }}></div>

                    <div style={{ padding: '22px', display: 'flex', flexDirection: 'column', flex: 1 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '14px' }}>
                        <div
                          style={{
                            width: '52px',
                            height: '52px',
                            borderRadius: '12px',
                            background: `${lang.color}20`,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: '26px'
                          }}
                        >
                          {lang.icon}
                        </div>
                        <span className={`status-badge ${lang.status}`}>
                          {lang.status === 'in-progress' ? 'In Progress' : 'Not Started'}
                        </span>
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                        <h3 style={{ fontSize: '20px', margin: 0, fontWeight: '700' }}>{lang.name}</h3>
                        <span style={{ fontSize: '11px', color: '#94a3b8', background: 'rgba(255,255,255,0.06)', padding: '2px 8px', borderRadius: '4px' }}>
                          {lang.level}
                        </span>
                      </div>
                      <div style={{ fontSize: '13px', color: lang.color, fontWeight: '600', marginBottom: '12px' }}>
                        {lang.badge}
                      </div>

                      <p style={{ color: '#94a3b8', fontSize: '14px', lineHeight: '1.5', margin: '0 0 16px 0', flex: 1 }}>
                        {lang.description}
                      </p>

                      {/* Course Meta Info */}
                      <div style={{ display: 'flex', gap: '14px', fontSize: '13px', color: '#94a3b8', marginBottom: '16px' }}>
                        <span>📚 {lang.modulesCount} Modules</span>
                        <span>📖 {lang.lessonsCount} Lessons</span>
                        <span>⏱️ {lang.estimatedTime}</span>
                      </div>

                      {/* Skills Tags */}
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginBottom: '18px' }}>
                        {lang.keySkills.map((skill) => (
                          <span
                            key={skill}
                            style={{
                              background: 'rgba(15, 23, 42, 0.7)',
                              border: '1px solid var(--border-color)',
                              color: '#cbd5e1',
                              fontSize: '11px',
                              padding: '2px 8px',
                              borderRadius: '6px'
                            }}
                          >
                            {skill}
                          </span>
                        ))}
                      </div>

                      {/* Progress Bar */}
                      <div style={{ marginBottom: '18px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', marginBottom: '6px' }}>
                          <span style={{ color: '#94a3b8' }}>Progress</span>
                          <strong style={{ color: lang.color }}>{lang.progress}%</strong>
                        </div>
                        <div style={{ width: '100%', height: '6px', background: '#1e293b', borderRadius: '3px', overflow: 'hidden' }}>
                          <div style={{ width: `${lang.progress}%`, height: '100%', background: lang.color }}></div>
                        </div>
                      </div>

                      {/* Action Button */}
                      <Link
                        to={`/lesson?course=${lang.slug}`}
                        className="btn btn-primary"
                        style={{
                          width: '100%',
                          textAlign: 'center',
                          backgroundColor: lang.color,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: '8px',
                          textDecoration: 'none'
                        }}
                      >
                        {lang.progress > 0 ? `Continue ${lang.name}` : `Start ${lang.name}`} <FaArrowRight />
                      </Link>
                    </div>
                  </div>
                );
              })}
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
