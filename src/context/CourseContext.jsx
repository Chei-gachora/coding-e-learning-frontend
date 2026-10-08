import { createContext, useContext, useState, useEffect } from 'react';

const CourseContext = createContext();

// Global localStorage key shared across all users/roles
const GLOBAL_COURSES_KEY = 'codelearn_global_courses';

const DEFAULT_COURSES = [
  { id: 1, title: 'HTML Fundamentals', students: 65, progress: 72, slug: 'html-fundamentals', description: 'Learn the structure and building blocks of modern websites using HTML.', level: 'Beginner', modules: 6, lessons: 24, exercises: 30, status: 'not-started', thumbnail: '🌐' },
  { id: 2, title: 'CSS Fundamentals', students: 54, progress: 48, slug: 'css-fundamentals', description: 'Learn how to style websites and create responsive and attractive interfaces.', level: 'Beginner', modules: 5, lessons: 20, exercises: 25, status: 'not-started', thumbnail: '🎨' },
  { id: 3, title: 'JavaScript Essentials', students: 38, progress: 31, slug: 'javascript-fundamentals', description: 'Add interactivity and functionality to your websites using JavaScript.', level: 'Beginner', modules: 8, lessons: 32, exercises: 40, status: 'in-progress', thumbnail: '🟨' },
  { id: 4, title: 'React Web Development', students: 29, progress: 15, slug: 'react-for-beginners', description: 'Build modern interactive user interfaces using React.', level: 'Intermediate', modules: 6, lessons: 28, exercises: 35, status: 'not-started', thumbnail: '⚛️' },
];

export function CourseProvider({ children }) {
  const [courses, setCourses] = useState(() => {
    const saved = localStorage.getItem(GLOBAL_COURSES_KEY);
    return saved ? JSON.parse(saved) : DEFAULT_COURSES;
  });

  useEffect(() => {
    localStorage.setItem(GLOBAL_COURSES_KEY, JSON.stringify(courses));
  }, [courses]);

  const addCourse = (title, description = '') => {
    const newCourse = {
      id: Date.now(),
      title,
      description: description || `A new course on ${title}.`,
      students: 0,
      progress: 0,
      slug: title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, ''),
      level: 'Beginner',
      modules: 1,
      lessons: 0,
      exercises: 0,
      status: 'not-started',
      thumbnail: '📘',
      isNew: true,
    };
    setCourses(prev => [...prev, newCourse]);
    return newCourse;
  };

  return (
    <CourseContext.Provider value={{ courses, setCourses, addCourse }}>
      {children}
    </CourseContext.Provider>
  );
}

export function useCourses() {
  return useContext(CourseContext);
}
