import { useState } from 'react';
import { Link } from 'react-router-dom';
import Sidebar from '../components/Sidebar';
import { useCourses } from '../context/CourseContext';

const MyCourses = () => {
  const [activeFilter, setActiveFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');

  // Use the central reactive courses catalog
  const { courses } = useCourses();

  // Filter courses
  const filteredCourses = (courses || []).filter((course) => {
    const status = course.status || 'not-started';
    const matchesFilter =
      activeFilter === 'all' || status === activeFilter;

    const matchesSearch = (course.title || '')
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
        return status || 'Not Started';
    }
  };

  return (
    <div className="mycourses-page">
      {/* Stationary Sidebar */}
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
              <p>No courses found matching your criteria.</p>
            </div>
          ) : (
            filteredCourses.map((course) => (
              <div key={course.id} className="course-item" style={{ borderLeft: course.isNew ? '4px solid #8b5cf6' : undefined }}>
                <div className="course-left">
                  <Link
                    to={`/lesson?course=${course.slug}`}
                    className="course-thumb"
                    style={{ textDecoration: 'none', cursor: 'pointer', fontSize: '28px' }}
                    title={`Go to ${course.title}`}
                  >
                    {course.thumbnail || '📘'}
                  </Link>

                  <div className="course-details">
                    <div className="course-top">
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <Link
                          to={`/lesson?course=${course.slug}`}
                          style={{ textDecoration: 'none', color: 'inherit' }}
                        >
                          <h3 style={{ transition: 'color 0.2s', margin: 0 }}>{course.title}</h3>
                        </Link>
                        {course.isNew && (
                          <span className="badge" style={{ background: '#8b5cf6', color: '#fff', fontSize: '11px', padding: '2px 8px' }}>NEW</span>
                        )}
                      </div>
                      <span className={`status-badge ${course.status || 'not-started'}`}>
                        {getStatusLabel(course.status || 'not-started')}
                      </span>
                    </div>
                    <p className="instructor">by {course.instructor || 'Dr. Sarah Jenkins'}</p>
                    <div className="course-meta">
                      <span>{course.level || 'Beginner'}</span>
                      <span>•</span>
                      <span>
                        {course.completedLessons || 0}/{course.totalLessons || course.lessons || 12} lessons
                      </span>
                      <span>•</span>
                      <span>Last accessed: {course.lastAccessed || 'Recently added'}</span>
                    </div>

                    {/* Progress bar */}
                    <div className="progress-section">
                      <div className="progress-bar">
                        <div
                          className="progress-fill"
                          style={{ width: `${course.progress || 0}%` }}
                        ></div>
                      </div>
                      <span className="progress-percent">{course.progress || 0}%</span>
                    </div>
                  </div>
                </div>

                <div className="course-actions">
                  {course.status === 'completed' ? (
                    <Link
                      to={`/lesson?course=${course.slug}`}
                      className="btn secondary"
                    >
                      Review Course
                    </Link>
                  ) : course.status === 'not-started' ? (
                    <Link
                      to={`/lesson?course=${course.slug}`}
                      className="btn primary"
                    >
                      Start Course
                    </Link>
                  ) : (
                    <Link
                      to={`/lesson?course=${course.slug}`}
                      className="btn primary"
                    >
                      Continue
                    </Link>
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
