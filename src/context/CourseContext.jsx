import { createContext, useContext, useState, useEffect } from 'react';

const CourseContext = createContext();

// Global localStorage key shared across all users/roles
const GLOBAL_COURSES_KEY = 'codelearn_global_courses';

const DEFAULT_COURSES = [
  {
    id: 1,
    title: 'HTML Fundamentals',
    slug: 'html-fundamentals',
    description: 'Learn the structure and building blocks of modern websites using HTML5 semantic elements.',
    level: 'Beginner',
    modules: 6,
    lessons: 24,
    totalLessons: 24,
    completedLessons: 11,
    exercises: 30,
    students: 65,
    progress: 45,
    status: 'in-progress',
    lastAccessed: 'Today',
    instructor: 'Dr. Sarah Jenkins',
    thumbnail: '🌐'
  },
  {
    id: 2,
    title: 'CSS Fundamentals',
    slug: 'css-fundamentals',
    description: 'Learn how to style websites and create responsive and attractive interfaces with modern CSS3.',
    level: 'Beginner',
    modules: 5,
    lessons: 20,
    totalLessons: 20,
    completedLessons: 0,
    exercises: 25,
    students: 54,
    progress: 0,
    status: 'not-started',
    lastAccessed: 'Never',
    instructor: 'Dr. Sarah Jenkins',
    thumbnail: '🎨'
  },
  {
    id: 3,
    title: 'JavaScript Fundamentals',
    slug: 'javascript-fundamentals',
    description: 'Add interactivity and functionality to your websites using JavaScript ES6+.',
    level: 'Beginner',
    modules: 8,
    lessons: 24,
    totalLessons: 24,
    completedLessons: 16,
    exercises: 40,
    students: 38,
    progress: 65,
    status: 'in-progress',
    lastAccessed: '2 hours ago',
    instructor: 'Sarah Chen',
    thumbnail: '🟨'
  },
  {
    id: 4,
    title: 'React for Beginners',
    slug: 'react-for-beginners',
    description: 'Build modern interactive user interfaces using React functional components and hooks.',
    level: 'Beginner',
    modules: 6,
    lessons: 18,
    totalLessons: 18,
    completedLessons: 5,
    exercises: 35,
    students: 29,
    progress: 30,
    status: 'in-progress',
    lastAccessed: 'Yesterday',
    instructor: 'Alex Rivera',
    thumbnail: '⚛️'
  },
  {
    id: 5,
    title: 'Python Crash Course',
    slug: 'python-crash-course',
    description: 'Master core Python syntax, list comprehensions, and practical script automation.',
    level: 'Beginner',
    modules: 4,
    lessons: 20,
    totalLessons: 20,
    completedLessons: 20,
    exercises: 20,
    students: 42,
    progress: 100,
    status: 'completed',
    lastAccessed: '3 days ago',
    instructor: 'James Wilson',
    thumbnail: '🐍'
  },
  {
    id: 6,
    title: 'TypeScript Mastery',
    slug: 'typescript-mastery',
    description: 'Start your journey with typed JavaScript! Learn type annotations, interfaces, and generics.',
    level: 'Intermediate',
    modules: 4,
    lessons: 22,
    totalLessons: 22,
    completedLessons: 0,
    exercises: 22,
    students: 20,
    progress: 0,
    status: 'not-started',
    lastAccessed: 'Never',
    instructor: 'Emily Park',
    thumbnail: '💙'
  },
  {
    id: 7,
    title: 'Full Stack with Node.js',
    slug: 'fullstack-nodejs',
    description: 'Build production-ready backend web servers and RESTful APIs using Node.js and Express.',
    level: 'Intermediate',
    modules: 5,
    lessons: 30,
    totalLessons: 30,
    completedLessons: 14,
    exercises: 25,
    students: 35,
    progress: 45,
    status: 'in-progress',
    lastAccessed: '5 hours ago',
    instructor: 'David Kim',
    thumbnail: '🟢'
  },
  {
    id: 8,
    title: 'Data Structures & Algorithms',
    slug: 'data-structures-algorithms',
    description: 'Master computational complexity, hash collision resolution, and Big-O notation.',
    level: 'Advanced',
    modules: 5,
    lessons: 28,
    totalLessons: 28,
    completedLessons: 28,
    exercises: 28,
    students: 18,
    progress: 100,
    status: 'completed',
    lastAccessed: '1 week ago',
    instructor: 'Michael Torres',
    thumbnail: '🧠'
  }
];

export function CourseProvider({ children }) {
  const [courses, setCourses] = useState(() => {
    try {
      const saved = localStorage.getItem(GLOBAL_COURSES_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          // Keep existing courses, ensuring newly introduced default courses are also available
          const existingSlugs = new Set(parsed.map(c => c.slug));
          const missingDefaults = DEFAULT_COURSES.filter(d => !existingSlugs.has(d.slug));
          return [...parsed, ...missingDefaults];
        }
      }
    } catch (e) {
      console.error('Failed to parse courses from localStorage:', e);
    }
    return DEFAULT_COURSES;
  });

  useEffect(() => {
    localStorage.setItem(GLOBAL_COURSES_KEY, JSON.stringify(courses));
  }, [courses]);

  const addCourse = (title, description = '', extraData = {}) => {
    const cleanTitle = title.trim();
    const slug = cleanTitle
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '') || `course-${Date.now()}`;

    const newCourse = {
      id: Date.now(),
      title: cleanTitle,
      description: description.trim() || `Master ${cleanTitle} through structured modules, interactive lessons, and real-time coding exercises.`,
      students: 0,
      progress: 0,
      slug,
      level: extraData.level || 'Beginner',
      modules: extraData.modules || 4,
      lessons: extraData.lessons || 1,
      totalLessons: extraData.totalLessons || extraData.lessons || 1,
      completedLessons: 0,
      exercises: extraData.exercises || 8,
      status: 'not-started',
      lastAccessed: 'Just created',
      thumbnail: extraData.thumbnail || '📘',
      instructor: extraData.instructor || 'Dr. Sarah Jenkins',
      isNew: true,
      lessonsList: [
        {
          id: `${slug}-lesson-1`,
          lessonNumber: 1,
          title: `Introduction to ${cleanTitle}`,
          moduleLabel: 'MODULE 1 • LESSON 1',
          description: description.trim() || `Fundamental concepts and environment setup for ${cleanTitle}.`,
          duration: '12 min',
          codeSnippet: `// 🚀 Welcome to ${cleanTitle}\nconsole.log("Welcome to ${cleanTitle}!");`,
          starterCode: `// ${cleanTitle} Starter Code\nconsole.log("Ready to practice ${cleanTitle}!");`,
          isNew: true,
          createdAt: new Date().toISOString()
        }
      ],
      ...extraData,
    };

    // Prepend new course so it appears at the very top of lists
    setCourses(prev => [newCourse, ...prev]);
    return newCourse;
  };

  const addLesson = (courseIdOrSlug, lessonData) => {
    const lessonTitle = (lessonData.title || '').trim();
    if (!lessonTitle) return null;

    let targetCourse = null;
    let createdLesson = null;

    setCourses(prevCourses => {
      return prevCourses.map(course => {
        const isMatch =
          String(course.id) === String(courseIdOrSlug) ||
          course.slug?.toLowerCase() === String(courseIdOrSlug).toLowerCase();

        if (isMatch) {
          targetCourse = course;
          const existingLessons = Array.isArray(course.lessonsList) && course.lessonsList.length > 0
            ? course.lessonsList
            : [
                {
                  id: `${course.slug}-lesson-1`,
                  lessonNumber: 1,
                  title: `Core Foundations of ${course.title}`,
                  moduleLabel: 'MODULE 1 • LESSON 1',
                  description: course.description || `Master the essentials of ${course.title}.`,
                  duration: '15 min',
                  codeSnippet: `// Intro to ${course.title}\nconsole.log("Learning ${course.title}!");`,
                  starterCode: `// ${course.title}\nconsole.log("Ready to code!");`
                }
              ];

          const nextNum = existingLessons.length + 1;
          const moduleNum = Math.ceil(nextNum / 4);
          const lessonInModule = ((nextNum - 1) % 4) + 1;

          createdLesson = {
            id: `lesson-${Date.now()}`,
            lessonNumber: nextNum,
            title: lessonTitle,
            moduleLabel: lessonData.moduleLabel?.trim() || `MODULE ${moduleNum} • LESSON ${lessonInModule}`,
            description: lessonData.description?.trim() || `Learn ${lessonTitle} with interactive code examples and practice tasks.`,
            duration: lessonData.duration || '15 min',
            codeSnippet: lessonData.starterCode?.trim() || `// ${lessonTitle}\nconsole.log("Practicing ${lessonTitle}!");`,
            starterCode: lessonData.starterCode?.trim() || `// ${lessonTitle}\nconsole.log("Practicing ${lessonTitle}!");`,
            quizQuestion: lessonData.quizQuestion || `What is the primary concept behind ${lessonTitle}?`,
            isNew: true,
            createdAt: new Date().toISOString()
          };

          const newCount = (course.lessons || existingLessons.length) + 1;
          const newTotal = (course.totalLessons || existingLessons.length) + 1;

          return {
            ...course,
            lessons: newCount,
            totalLessons: newTotal,
            latestLesson: lessonTitle,
            hasNewLesson: true,
            lastAccessed: 'Just now',
            lessonsList: [...existingLessons, createdLesson]
          };
        }
        return course;
      });
    });

    return { course: targetCourse, lesson: createdLesson };
  };

  const addExercise = (courseIdOrSlug, exerciseData) => {
    const exerciseTitle = (exerciseData.title || '').trim();
    if (!exerciseTitle) return null;

    let targetCourse = null;
    let createdExercise = null;

    setCourses(prevCourses => {
      return prevCourses.map(course => {
        const isMatch =
          String(course.id) === String(courseIdOrSlug) ||
          course.slug?.toLowerCase() === String(courseIdOrSlug).toLowerCase();

        if (isMatch) {
          targetCourse = course;
          const existingExercises = Array.isArray(course.exercisesList) && course.exercisesList.length > 0
            ? course.exercisesList
            : [
                {
                  id: `${course.slug}-exercise-1`,
                  exerciseNumber: 1,
                  moduleLabel: 'MODULE 1 • CODING EXERCISE',
                  taskTitle: `First ${course.title} Coding Task`,
                  taskDescription: `Run your first code snippet in ${course.title} using console output.`,
                  expectedResult: `Verified execution of ${course.title}`,
                  requirements: [
                    'Write valid code in the editor.',
                    'Execute code using Run Code.',
                    'Verify output in the console panel.'
                  ],
                  starterCode: course.slug.includes('html')
                    ? `<!DOCTYPE html>\n<html>\n  <body>\n    <h1>Hello from ${course.title}!</h1>\n  </body>\n</html>`
                    : `// ${course.title} Exercise\nconsole.log("Ready to solve ${course.title} challenge!");`,
                  createdAt: new Date().toISOString()
                }
              ];

          const nextNum = existingExercises.length + 1;
          const moduleNum = Math.ceil(nextNum / 3);
          const exInModule = ((nextNum - 1) % 3) + 1;

          const defaultStarter = course.slug.includes('html')
            ? `<!DOCTYPE html>\n<html>\n  <body>\n    <!-- Write ${exerciseTitle} markup here -->\n  </body>\n</html>`
            : course.slug.includes('python')
            ? `# ${exerciseTitle}\n# Write your solution here\nprint("Executing ${exerciseTitle}")`
            : `// ${exerciseTitle}\nfunction solve() {\n  return "${exerciseTitle} completed";\n}\nconsole.log(solve());`;

          createdExercise = {
            id: `exercise-${Date.now()}`,
            exerciseNumber: nextNum,
            moduleLabel: exerciseData.moduleLabel?.trim() || `MODULE ${moduleNum} • EXERCISE ${exInModule}`,
            taskTitle: exerciseTitle,
            taskDescription: exerciseData.description?.trim() || `Complete the ${exerciseTitle} practical coding challenge.`,
            expectedResult: exerciseData.expectedResult?.trim() || `Expected output from ${exerciseTitle}`,
            requirements: exerciseData.requirements && exerciseData.requirements.length > 0
              ? exerciseData.requirements
              : [
                  `Implement the required function or markup for ${exerciseTitle}.`,
                  'Test execution with the Run Code button.',
                  'Verify test cases before submitting.'
                ],
            starterCode: exerciseData.starterCode?.trim() || defaultStarter,
            isNew: true,
            createdAt: new Date().toISOString()
          };

          const newExCount = (course.exercises || existingExercises.length) + 1;

          return {
            ...course,
            exercises: newExCount,
            latestExercise: exerciseTitle,
            hasNewExercise: true,
            lastAccessed: 'Just now',
            exercisesList: [...existingExercises, createdExercise]
          };
        }
        return course;
      });
    });

    return { course: targetCourse, exercise: createdExercise };
  };

  return (
    <CourseContext.Provider value={{ courses, setCourses, addCourse, addLesson, addExercise }}>
      {children}
    </CourseContext.Provider>
  );
}

export function useCourses() {
  return useContext(CourseContext);
}

