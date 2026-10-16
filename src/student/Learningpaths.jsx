import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import Sidebar from '../components/Sidebar';
import { GiPadlock } from 'react-icons/gi';
import { FaCheckCircle, FaLock, FaUnlockAlt, FaRedo } from 'react-icons/fa';
import { IoSparkles } from 'react-icons/io5';

const defaultPaths = [
  {
    id: 1,
    slug: 'frontend',
    title: 'Frontend Developer',
    description:
      'Master HTML, CSS, JavaScript, React and modern frontend tools to build beautiful user interfaces.',
    courses: 8,
    duration: '45 hours',
    level: 'Beginner to Intermediate',
    students: '18.2k',
    progress: 40,
    skills: ['HTML', 'CSS', 'JavaScript', 'React', 'TypeScript'],
    thumbnail: '🎨',
    color: '#3b82f6',
  },
  {
    id: 2,
    slug: 'backend',
    title: 'Backend Developer',
    description:
      'Learn Node.js, Express, databases, authentication and APIs to build powerful server-side applications.',
    courses: 7,
    duration: '38 hours',
    level: 'Intermediate',
    students: '12.7k',
    progress: 0,
    skills: ['Node.js', 'Express', 'MongoDB', 'PostgreSQL', 'REST APIs'],
    thumbnail: '⚙️',
    color: '#10b981',
  },
  {
    id: 3,
    slug: 'fullstack',
    title: 'Full Stack Developer',
    description:
      'Become a complete developer by mastering both frontend and backend technologies.',
    courses: 12,
    duration: '70 hours',
    level: 'Intermediate to Advanced',
    students: '21.4k',
    progress: 0,
    skills: ['React', 'Node.js', 'MongoDB', 'TypeScript', 'Docker'],
    thumbnail: '🚀',
    color: '#8b5cf6',
  },
  {
    id: 4,
    slug: 'python-data',
    title: 'Python & Data Science',
    description:
      'Learn Python programming and essential data science libraries to analyze and visualize data.',
    courses: 9,
    duration: '52 hours',
    level: 'Beginner to Intermediate',
    students: '15.9k',
    progress: 0,
    skills: ['Python', 'Pandas', 'NumPy', 'Matplotlib', 'Machine Learning'],
    thumbnail: '📊',
    color: '#f59e0b',
  },
  {
    id: 5,
    slug: 'mobile',
    title: 'Mobile App Development',
    description:
      'Build cross-platform mobile apps using React Native and modern mobile development practices.',
    courses: 6,
    duration: '34 hours',
    level: 'Intermediate',
    students: '9.3k',
    progress: 0,
    skills: ['React Native', 'JavaScript', 'Expo', 'Firebase'],
    thumbnail: '📱',
    color: '#ec4899',
  },
  {
    id: 6,
    slug: 'devops',
    title: 'DevOps & Cloud',
    description:
      'Learn CI/CD, Docker, Kubernetes and cloud platforms to deploy and scale applications.',
    courses: 8,
    duration: '41 hours',
    level: 'Advanced',
    students: '7.8k',
    progress: 0,
    skills: ['Docker', 'Kubernetes', 'AWS', 'CI/CD', 'Linux'],
    thumbnail: '☁️',
    color: '#06b6d4',
  },
];

const LearningPaths = () => {
  const [activeFilter, setActiveFilter] = useState('all');

  // Load persistent path progress from localStorage or default
  const [paths, setPaths] = useState(() => {
    const saved = localStorage.getItem('codelearn_learning_paths_state');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        console.error('Failed to parse saved paths', e);
      }
    }
    return defaultPaths;
  });

  useEffect(() => {
    localStorage.setItem('codelearn_learning_paths_state', JSON.stringify(paths));
  }, [paths]);

  // Compute sequential unlock rules:
  // Track 0 (Frontend Developer) is always unlocked.
  // Each subsequent track unlocks ONLY WHEN the previous track is 100% completed!
  const evaluatedPaths = paths.map((path, index) => {
    if (index === 0) {
      return {
        ...path,
        isLocked: false,
        prerequisite: null,
        status: path.progress >= 100 ? 'completed' : path.progress > 0 ? 'in-progress' : 'not-started',
      };
    }

    const previousPath = paths[index - 1];
    const isPreviousCompleted = previousPath.progress >= 100;
    const isLocked = !isPreviousCompleted;

    return {
      ...path,
      isLocked,
      prerequisite: previousPath,
      status: isLocked
        ? 'locked'
        : path.progress >= 100
        ? 'completed'
        : path.progress > 0
        ? 'in-progress'
        : 'not-started',
    };
  });

  const filteredPaths = evaluatedPaths.filter((path) => {
    if (activeFilter === 'all') return true;
    if (activeFilter === 'locked') return path.isLocked;
    if (activeFilter === 'unlocked') return !path.isLocked;
    return path.status === activeFilter;
  });

  const getStatusLabel = (path) => {
    if (path.isLocked) return 'Locked';
    switch (path.status) {
      case 'in-progress':
        return 'In Progress';
      case 'completed':
        return 'Completed';
      case 'not-started':
        return 'Not Started';
      default:
        return path.status;
    }
  };

  // Helper functions to simulate progression and testing
  const toggleFrontendCompletion = () => {
    setPaths((prev) => {
      const next = [...prev];
      if (next[0].progress >= 100) {
        next[0].progress = 40;
      } else {
        next[0].progress = 100;
      }
      return next;
    });
  };

  const advanceNextTrack = (trackIndex) => {
    setPaths((prev) => {
      const next = [...prev];
      if (next[trackIndex]) {
        next[trackIndex].progress = next[trackIndex].progress >= 100 ? 50 : 100;
      }
      return next;
    });
  };

  const resetAllTracks = () => {
    setPaths(defaultPaths);
  };

  const frontendCompleted = paths[0].progress >= 100;

  return (
    <div className="learning-paths-page">
      {/* Stationary Sidebar */}
      <Sidebar />

      {/* Main Content */}
      <main className="main-content">
        {/* Header */}
        <header className="page-header" style={{ marginBottom: '24px' }}>
          <div>
            <h1>Learning Paths Roadmap</h1>
            <p>Master skills in guided order. Tracks unlock sequentially as you complete each prerequisite.</p>
          </div>
        </header>

        {/* ROADMAP SEQUENTIAL LOCKING BANNER */}
        <section
          style={{
            background: 'linear-gradient(135deg, #0f172a 0%, #1e1b4b 50%, #172554 100%)',
            border: '1px solid #3b82f644',
            borderRadius: '16px',
            padding: '24px',
            marginBottom: '28px',
            boxShadow: '0 8px 24px rgba(0,0,0,0.3)',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px', marginBottom: '20px' }}>
            <div>
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', background: 'rgba(59, 130, 246, 0.15)', border: '1px solid #3b82f6', color: '#60a5fa', padding: '4px 12px', borderRadius: '9999px', fontSize: '12px', fontWeight: '700', marginBottom: '8px' }}>
                <IoSparkles /> SEQUENTIAL PROGRESSION SYSTEM
              </div>
              <h2 style={{ fontSize: '22px', margin: '4px 0 6px 0', color: '#f8fafc' }}>
                Career Roadmap Progression Order
              </h2>
              <p style={{ color: '#94a3b8', fontSize: '14px', margin: 0, maxWidth: '650px' }}>
                Complete the <strong>Frontend Developer</strong> track (100%) to unlock <strong>Backend Developer</strong>. Each subsequent path unlocks one after the other as you finish its prerequisite.
              </p>
            </div>

            {/* INTERACTIVE TESTING / SIMULATION CONTROLS */}
            <div
              style={{
                background: 'rgba(15, 23, 42, 0.7)',
                border: '1px solid #334155',
                borderRadius: '12px',
                padding: '14px 18px',
                display: 'flex',
                flexDirection: 'column',
                gap: '8px',
              }}
            >
              <span style={{ fontSize: '12px', color: '#94a3b8', fontWeight: '600' }}>
                ⚡ TEST ROADMAP UNLOCKING:
              </span>
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                <button
                  onClick={toggleFrontendCompletion}
                  className="btn btn-primary btn-small"
                  style={{
                    fontSize: '12px',
                    padding: '6px 12px',
                    backgroundColor: frontendCompleted ? '#10b981' : '#3b82f6',
                  }}
                  title="Toggle Frontend completion to test unlocking"
                >
                  {frontendCompleted ? '✓ Frontend Completed (100%)' : '▶ Complete Frontend (100%)'}
                </button>
                <button
                  onClick={resetAllTracks}
                  className="btn btn-outline btn-small"
                  style={{ fontSize: '12px', padding: '6px 12px' }}
                  title="Reset tracks to initial state"
                >
                  <FaRedo /> Reset
                </button>
              </div>
            </div>
          </div>

          {/* VISUAL TRACK ROADMAP STEPPER */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              overflowX: 'auto',
              paddingTop: '16px',
              borderTop: '1px solid rgba(255,255,255,0.08)',
            }}
          >
            {evaluatedPaths.map((p, idx) => (
              <div key={p.id} style={{ display: 'flex', alignItems: 'center', gap: '10px', flexShrink: 0 }}>
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    padding: '8px 14px',
                    borderRadius: '10px',
                    background: p.isLocked
                      ? 'rgba(30, 41, 59, 0.4)'
                      : p.status === 'completed'
                      ? 'rgba(16, 185, 129, 0.15)'
                      : 'rgba(59, 130, 246, 0.15)',
                    border: p.isLocked
                      ? '1px dashed #475569'
                      : p.status === 'completed'
                      ? '1px solid #10b981'
                      : '1px solid #3b82f6',
                    color: p.isLocked ? '#64748b' : p.status === 'completed' ? '#34d399' : '#60a5fa',
                    fontSize: '13px',
                    fontWeight: '600',
                  }}
                >
                  <span>{p.thumbnail}</span>
                  <span>{idx + 1}. {p.title}</span>
                  {p.isLocked ? (
                    <span style={{ color: '#f87171', display: 'flex', alignItems: 'center', gap: '3px', fontSize: '11px', background: 'rgba(239,68,68,0.1)', padding: '2px 6px', borderRadius: '4px' }}>
                      <GiPadlock /> Locked
                    </span>
                  ) : p.status === 'completed' ? (
                    <span style={{ color: '#34d399', display: 'flex', alignItems: 'center', gap: '3px', fontSize: '11px' }}>
                      <FaCheckCircle /> 100%
                    </span>
                  ) : (
                    <span style={{ color: '#38bdf8', fontSize: '11px', background: 'rgba(56,189,248,0.15)', padding: '2px 6px', borderRadius: '4px' }}>
                      {p.progress}%
                    </span>
                  )}
                </div>

                {idx < evaluatedPaths.length - 1 && (
                  <span style={{ color: evaluatedPaths[idx + 1].isLocked ? '#475569' : '#38bdf8', fontSize: '14px' }}>➔</span>
                )}
              </div>
            ))}
          </div>
        </section>

        {/* Filters */}
        <div className="filters">
          <button
            className={`filter-btn ${activeFilter === 'all' ? 'active' : ''}`}
            onClick={() => setActiveFilter('all')}
          >
            All Paths ({evaluatedPaths.length})
          </button>
          <button
            className={`filter-btn ${activeFilter === 'unlocked' ? 'active' : ''}`}
            onClick={() => setActiveFilter('unlocked')}
          >
            Unlocked ({evaluatedPaths.filter((p) => !p.isLocked).length})
          </button>
          <button
            className={`filter-btn ${activeFilter === 'locked' ? 'active' : ''}`}
            onClick={() => setActiveFilter('locked')}
          >
            Locked ({evaluatedPaths.filter((p) => p.isLocked).length})
          </button>
          <button
            className={`filter-btn ${activeFilter === 'in-progress' ? 'active' : ''}`}
            onClick={() => setActiveFilter('in-progress')}
          >
            In Progress
          </button>
          <button
            className={`filter-btn ${activeFilter === 'completed' ? 'active' : ''}`}
            onClick={() => setActiveFilter('completed')}
          >
            Completed
          </button>
        </div>

        {/* Paths Grid */}
        <div className="paths-grid">
          {filteredPaths.map((path) => (
            <div
              key={path.id}
              className={`path-card ${path.isLocked ? 'locked' : ''}`}
              style={{
                position: 'relative',
                border: path.isLocked ? '1px dashed #334155' : undefined,
              }}
            >
              {/* Top colored bar */}
              <div
                className="path-accent"
                style={{
                  backgroundColor: path.isLocked ? '#475569' : path.color,
                }}
              ></div>

              <div className="path-content">
                <div className="path-header">
                  {path.isLocked ? (
                    <div
                      className="path-thumb"
                      style={{
                        backgroundColor: '#1e293b',
                        color: '#64748b',
                        filter: 'grayscale(1)',
                        position: 'relative',
                      }}
                      title="Locked Track"
                    >
                      {path.thumbnail}
                      <span
                        style={{
                          position: 'absolute',
                          bottom: '-4px',
                          right: '-4px',
                          background: '#dc2626',
                          color: '#fff',
                          borderRadius: '50%',
                          width: '18px',
                          height: '18px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: '10px',
                        }}
                      >
                        <GiPadlock />
                      </span>
                    </div>
                  ) : (
                    <Link
                      to={`/learning-paths/${path.slug || 'frontend'}`}
                      className="path-thumb"
                      style={{
                        backgroundColor: `${path.color}22`,
                        textDecoration: 'none',
                      }}
                      title={`Open ${path.title}`}
                    >
                      {path.thumbnail}
                    </Link>
                  )}

                  <span className={`status-badge ${path.status}`}>
                    {path.isLocked ? (
                      <>
                        <GiPadlock style={{ marginRight: '4px' }} /> Locked
                      </>
                    ) : (
                      getStatusLabel(path)
                    )}
                  </span>
                </div>

                {path.isLocked ? (
                  <h3 style={{ color: '#94a3b8' }}>
                    <GiPadlock style={{ marginRight: '6px', color: '#f87171' }} />
                    {path.title}
                  </h3>
                ) : (
                  <Link
                    to={`/learning-paths/${path.slug || 'frontend'}`}
                    style={{ textDecoration: 'none', color: 'inherit' }}
                  >
                    <h3 style={{ transition: 'color 0.2s' }}>{path.title}</h3>
                  </Link>
                )}

                <p className="path-description">{path.description}</p>

                {/* PREREQUISITE WARNING FOR LOCKED PATHS */}
                {path.isLocked && path.prerequisite && (
                  <div
                    style={{
                      background: 'rgba(15, 23, 42, 0.85)',
                      border: '1px dashed #f59e0b55',
                      borderRadius: '8px',
                      padding: '10px 12px',
                      marginBottom: '16px',
                      fontSize: '12px',
                      color: '#fbbf24',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                    }}
                  >
                    <GiPadlock style={{ fontSize: '18px', flexShrink: 0, color: '#f59e0b' }} />
                    <div>
                      <strong>Prerequisite Required:</strong> Complete{' '}
                      <span style={{ color: '#fff' }}>{path.prerequisite.title}</span> (currently{' '}
                      {path.prerequisite.progress}%) to unlock this track.
                    </div>
                  </div>
                )}

                {/* Meta info */}
                <div className="path-meta">
                  <span>📚 {path.courses} courses</span>
                  <span>⏱️ {path.duration}</span>
                  <span>👥 {path.students}</span>
                </div>

                <div className="path-level">{path.level}</div>

                {/* Skills */}
                <div className="skills">
                  {path.skills.map((skill) => (
                    <span key={skill} className="skill-tag">
                      {skill}
                    </span>
                  ))}
                </div>

                {/* Progress (only show if started and unlocked) */}
                {!path.isLocked && path.progress > 0 && (
                  <div className="progress-section">
                    <div className="progress-info">
                      <span>Progress</span>
                      <span>{path.progress}%</span>
                    </div>
                    <div className="progress-bar">
                      <div
                        className="progress-fill"
                        style={{
                          width: `${path.progress}%`,
                          backgroundColor: path.color,
                        }}
                      ></div>
                    </div>
                  </div>
                )}

                {/* Dynamic Action button */}
                {path.isLocked ? (
                  <button
                    className="path-btn locked"
                    disabled
                    title={`Complete ${path.prerequisite?.title} to unlock`}
                  >
                    <GiPadlock /> Locked — Complete Prerequisite
                  </button>
                ) : (
                  <Link
                    to={`/learning-paths/${path.slug || 'frontend'}`}
                    className="path-btn"
                    style={{
                      backgroundColor:
                        path.status === 'completed' ? 'transparent' : path.color,
                      border:
                        path.status === 'completed'
                          ? `1.5px solid ${path.color}`
                          : 'none',
                      color: path.status === 'completed' ? path.color : 'white',
                    }}
                  >
                    {path.status === 'completed'
                      ? 'Review Path'
                      : path.status === 'in-progress'
                      ? 'Continue Path'
                      : 'Start Path'}
                  </Link>
                )}
              </div>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
};

export default LearningPaths;
