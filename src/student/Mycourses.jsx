import { useState } from 'react';
import { Link } from 'react-router-dom';
import Sidebar from '../components/Sidebar';

const MyCourses = () => {
  const [activeFilter, setActiveFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');

  // Fake data - replace later with real data from backend
  const courses = [
    {
      id: 1,
      title: 'JavaScript Fundamentals',
      instructor: 'Sarah Chen',
      progress: 65,
      status: 'in-progress',
      totalLessons: 24,
      completedLessons: 16,
      lastAccessed: '2 hours ago',
      thumbnail: '🟨',
      level: 'Beginner',
    },
    {
      id: 2,
      title: 'React for Beginners',
      instructor: 'Alex Rivera',
      progress: 30,
      status: 'in-progress',
      totalLessons: 18,
      completedLessons: 5,
      lastAccessed: 'Yesterday',
      thumbnail: '⚛️',
      level: 'Beginner',
    },
    {
      id: 3,
      title: 'Python Crash Course',
      instructor: 'James Wilson',
      progress: 100,
      status: 'completed',
      totalLessons: 20,
      completedLessons: 20,
      lastAccessed: '3 days ago',
      thumbnail: '🐍',
      level: 'Beginner',
    },
    {
      id: 4,
      title: 'TypeScript Mastery',
      instructor: 'Emily Park',
      progress: 0,
      status: 'not-started',
      totalLessons: 22,
      completedLessons: 0,
      lastAccessed: 'Never',
      thumbnail: '💙',
      level: 'Intermediate',
    },
    {
      id: 5,
      title: 'Full Stack with Node.js',
      instructor: 'David Kim',
      progress: 45,
      status: 'in-progress',
      totalLessons: 30,
      completedLessons: 14,
      lastAccessed: '5 hours ago',
      thumbnail: '🟢',
      level: 'Intermediate',
    },
    {
      id: 6,
      title: 'Data Structures & Algorithms',
      instructor: 'Michael Torres',
      progress: 100,
      status: 'completed',
      totalLessons: 28,
      completedLessons: 28,
      lastAccessed: '1 week ago',
      thumbnail: '🧠',
      level: 'Advanced',
    },
  ];

  // Filter courses
  const filteredCourses = courses.filter((course) => {
    const matchesFilter =
      activeFilter === 'all' || course.status === activeFilter;

    const matchesSearch = course.title
      .toLowerCase()
      .includes(searchTerm.toLowerCase());

    return matchesFilter && matchesSearch;
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
    <div className="mycourses-page">
      {/* Sidebar (same style as Dashboard) */}
      <Sidebar />

      {/* Main Content */}
      <main className="main-content">
        {/* Header */}
        <header className="page-header">
          <div>
            <h1>My Courses</h1>
            <p>Track your progress and continue learning</p>
          </div>
        </header>

        {/* Filters + Search */}
        <div className="controls">
          <div className="filters">
            <button
              className={`filter-btn ${activeFilter === 'all' ? 'active' : ''}`}
              onClick={() => setActiveFilter('all')}
            >
              All Courses
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

          <div className="search-box">
            <input
              type="text"
              placeholder="Search your courses..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>

        {/* Courses List */}
        <div className="courses-list">
          {filteredCourses.length === 0 ? (
            <div className="empty-state">
              <p>No courses found.</p>
            </div>
          ) : (
            filteredCourses.map((course) => (
              <div key={course.id} className="course-item">
                <div className="course-left">
                  <div className="course-thumb">{course.thumbnail}</div>
                  <div className="course-details">
                    <div className="course-top">
                      <h3>{course.title}</h3>
                      <span className={`status-badge ${course.status}`}>
                        {getStatusLabel(course.status)}
                      </span>
                    </div>
                    <p className="instructor">by {course.instructor}</p>
                    <div className="course-meta">
                      <span>{course.level}</span>
                      <span>•</span>
                      <span>
                        {course.completedLessons}/{course.totalLessons} lessons
                      </span>
                      <span>•</span>
                      <span>Last accessed: {course.lastAccessed}</span>
                    </div>

                    {/* Progress bar */}
                    <div className="progress-section">
                      <div className="progress-bar">
                        <div
                          className="progress-fill"
                          style={{ width: `${course.progress}%` }}
                        ></div>
                      </div>
                      <span className="progress-percent">{course.progress}%</span>
                    </div>
                  </div>
                </div>

                <div className="course-actions">
                  {course.status === 'completed' ? (
                    <button className="btn secondary">Review Course</button>
                  ) : course.status === 'not-started' ? (
                    <button className="btn primary">Start Course</button>
                  ) : (
                    <button className="btn primary">Continue</button>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </main>
    </div>
  );
};

export default MyCourses;
