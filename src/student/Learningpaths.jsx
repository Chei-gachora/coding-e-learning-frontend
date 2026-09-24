import { useState } from 'react';
import { Link } from 'react-router-dom';

const LearningPaths = () => {
  const [activeFilter, setActiveFilter] = useState('all');

  const paths = [
    {
      id: 1,
      title: 'Frontend Developer',
      description:
        'Master HTML, CSS, JavaScript, React and modern frontend tools to build beautiful user interfaces.',
      courses: 8,
      duration: '45 hours',
      level: 'Beginner to Intermediate',
      students: '18.2k',
      progress: 40,
      status: 'in-progress',
      skills: ['HTML', 'CSS', 'JavaScript', 'React', 'TypeScript'],
      thumbnail: '🎨',
      color: '#3b82f6',
    },
    {
      id: 2,
      title: 'Backend Developer',
      description:
        'Learn Node.js, Express, databases, authentication and APIs to build powerful server-side applications.',
      courses: 7,
      duration: '38 hours',
      level: 'Intermediate',
      students: '12.7k',
      progress: 0,
      status: 'not-started',
      skills: ['Node.js', 'Express', 'MongoDB', 'PostgreSQL', 'REST APIs'],
      thumbnail: '⚙️',
      color: '#10b981',
    },
    {
      id: 3,
      title: 'Full Stack Developer',
      description:
        'Become a complete developer by mastering both frontend and backend technologies.',
      courses: 12,
      duration: '70 hours',
      level: 'Intermediate to Advanced',
      students: '21.4k',
      progress: 15,
      status: 'in-progress',
      skills: ['React', 'Node.js', 'MongoDB', 'TypeScript', 'Docker'],
      thumbnail: '🚀',
      color: '#8b5cf6',
    },
    {
      id: 4,
      title: 'Python & Data Science',
      description:
        'Learn Python programming and essential data science libraries to analyze and visualize data.',
      courses: 9,
      duration: '52 hours',
      level: 'Beginner to Intermediate',
      students: '15.9k',
      progress: 100,
      status: 'completed',
      skills: ['Python', 'Pandas', 'NumPy', 'Matplotlib', 'Machine Learning'],
      thumbnail: '📊',
      color: '#f59e0b',
    },
    {
      id: 5,
      title: 'Mobile App Development',
      description:
        'Build cross-platform mobile apps using React Native and modern mobile development practices.',
      courses: 6,
      duration: '34 hours',
      level: 'Intermediate',
      students: '9.3k',
      progress: 0,
      status: 'not-started',
      skills: ['React Native', 'JavaScript', 'Expo', 'Firebase'],
      thumbnail: '📱',
      color: '#ec4899',
    },
    {
      id: 6,
      title: 'DevOps & Cloud',
      description:
        'Learn CI/CD, Docker, Kubernetes and cloud platforms to deploy and scale applications.',
      courses: 8,
      duration: '41 hours',
      level: 'Advanced',
      students: '7.8k',
      progress: 0,
      status: 'not-started',
      skills: ['Docker', 'Kubernetes', 'AWS', 'CI/CD', 'Linux'],
      thumbnail: '☁️',
      color: '#06b6d4',
    },
  ];

  const filteredPaths = paths.filter((path) => {
    if (activeFilter === 'all') return true;
    return path.status === activeFilter;
  });

  const getStatusLabel = (status) => {
    switch (status) {
      case 'in-progress':
        return 'In Progress';
      case 'completed':
        return 'Completed';
      case 'not-started':
        return 'Not Started';
      default:
        return status;
    }
  };

  return (
    <div className="learning-paths-page">
      {/* Sidebar */}
      <aside className="sidebar">
        <div className="logo">
          <Link to="/" style={{ textDecoration: 'none', color: 'inherit', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span className="logo-icon">💻</span>
            <span className="logo-text">CodeLearn</span>
          </Link>
        </div>

        <nav className="nav">
          <Link to="/dashboard" className="nav-item">
            <span>🏠</span> Dashboard
          </Link>
          <Link to="/my-courses" className="nav-item">
            <span>📚</span> My Courses
          </Link>
          <Link to="/learning-paths" className="nav-item active">
            <span>🔥</span> Learning Paths
          </Link>
          <Link to="/certificates" className="nav-item">
            <span>🏆</span> Certificates
          </Link>
          <Link to="/dashboard" className="nav-item">
            <span>⚙️</span> Settings
          </Link>
        </nav>

        <div className="sidebar-footer">
          <Link to="/login" className="logout-btn" style={{ textAlign: 'center', textDecoration: 'none', display: 'block' }}>Log Out</Link>
        </div>
      </aside>

      {/* Main Content */}
      <main className="main-content">
        {/* Header */}
        <header className="page-header">
          <div>
            <h1>Learning Paths</h1>
            <p>Structured roadmaps to help you become job-ready</p>
          </div>
        </header>

        {/* Filters */}
        <div className="filters">
          <button
            className={`filter-btn ${activeFilter === 'all' ? 'active' : ''}`}
            onClick={() => setActiveFilter('all')}
          >
            All Paths
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
          <button
            className={`filter-btn ${activeFilter === 'not-started' ? 'active' : ''}`}
            onClick={() => setActiveFilter('not-started')}
          >
            Not Started
          </button>
        </div>

        {/* Paths Grid */}
        <div className="paths-grid">
          {filteredPaths.map((path) => (
            <div key={path.id} className="path-card">
              {/* Top colored bar */}
              <div
                className="path-accent"
                style={{ backgroundColor: path.color }}
              ></div>

              <div className="path-content">
                <div className="path-header">
                  <div
                    className="path-thumb"
                    style={{ backgroundColor: `${path.color}22` }}
                  >
                    {path.thumbnail}
                  </div>
                  <span className={`status-badge ${path.status}`}>
                    {getStatusLabel(path.status)}
                  </span>
                </div>

                <h3>{path.title}</h3>
                <p className="path-description">{path.description}</p>

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

                {/* Progress (only show if started) */}
                {path.progress > 0 && (
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

                {/* Action button */}
                <button
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
                </button>
              </div>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
};

export default LearningPaths;
