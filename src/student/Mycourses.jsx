import { useState } from 'react';
import { Link } from 'react-router-dom';
import Sidebar from '../components/Sidebar';
import { coursesData } from '../data/coursesData';

const MyCourses = () => {
  const [activeFilter, setActiveFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');

  // Use the central courses catalog data
  const courses = coursesData;

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
              <div key={course.id} className="course-item">
                <div className="course-left">
                  <Link
                    to={`/lesson?course=${course.slug}`}
                    className="course-thumb"
                    style={{ textDecoration: 'none', cursor: 'pointer' }}
                    title={`Go to ${course.title}`}
                  >
                    {course.thumbnail}
                  </Link>

                  <div className="course-details">
                    <div className="course-top">
                      <Link
                        to={`/lesson?course=${course.slug}`}
                        style={{ textDecoration: 'none', color: 'inherit' }}
                      >
                        <h3 style={{ transition: 'color 0.2s' }}>{course.title}</h3>
                      </Link>
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
