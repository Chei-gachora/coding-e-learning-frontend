import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { useAuth } from './AuthContext';
import { api } from '../lib/api';

const CourseContext = createContext(null);

function toList(value) {
  if (Array.isArray(value)) return value;
  if (Array.isArray(value?.results)) return value.results;
  return [];
}

function mapCourse(course, enrollment) {
  const progress = Number(enrollment?.progress_percentage || 0);
  return {
    ...course,
    id: course.id,
    slug: course.slug || String(course.id),
    level: course.difficulty || course.level || 'Beginner',
    modules: course.module_count || course.modules_count || 0,
    lessons: course.lesson_count || course.lessons_count || 0,
    totalLessons: course.lesson_count || course.lessons_count || 0,
    exercises: course.exercise_count || course.exercises_count || 0,
    progress,
    status: enrollment
      ? progress >= 100 ? 'completed' : progress > 0 ? 'in-progress' : 'not-started'
      : 'not-started',
    isEnrolled: Boolean(enrollment),
    instructor: course.instructor_name || 'Course instructor',
    thumbnail: course.thumbnail_url || course.thumbnail || '📘',
  };
}

function itemList(value) {
  return toList(value);
}

export function CourseProvider({ children }) {
  const { user, loading: authLoading } = useAuth();
  const [courses, setCourses] = useState([]);
  const [enrolledCourses, setEnrolledCourses] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const refreshCourses = useCallback(async () => {
    if (!user) {
      setCourses([]);
      setEnrolledCourses([]);
      return;
    }
    setLoading(true);
    setError('');
    try {
      const [catalogResponse, enrollmentResponse] = await Promise.all([
        api.get('/courses/'),
        user.role === 'student' ? api.get('/enrollments/') : Promise.resolve([]),
      ]);
      const enrollments = itemList(enrollmentResponse);
      const enrollmentByCourse = new Map(
        enrollments.map((enrollment) => [String(enrollment.course), enrollment]),
      );
      const catalog = itemList(catalogResponse).map((course) =>
        mapCourse(course, enrollmentByCourse.get(String(course.id))),
      );
      setCourses(catalog);
      setEnrolledCourses(enrollments
        .filter((enrollment) => enrollment.course_detail)
        .map((enrollment) => mapCourse(enrollment.course_detail, enrollment)));
    } catch (loadError) {
      setError(loadError.message || 'Unable to load courses from the server.');
      throw loadError;
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      setCourses([]);
      setEnrolledCourses([]);
      setError('');
      return;
    }
    refreshCourses().catch((loadError) => {
      console.error('Course loading failed:', loadError);
    });
  }, [authLoading, refreshCourses, user]);

  const enroll = useCallback(async (courseId) => {
    await api.post('/enrollments/', { course: courseId });
    await refreshCourses();
  }, [refreshCourses]);

  const addCourse = useCallback(async (title, description = '', extraData = {}) => {
    const response = await api.post('/courses/', {
      title: title.trim(),
      description: description.trim(),
      difficulty: String(extraData.level || 'Beginner').toLowerCase(),
    });
    await refreshCourses();
    return response;
  }, [refreshCourses]);

  const getOrCreateModule = useCallback(async (courseId, moduleTitle) => {
    const modules = itemList(await api.get(`/modules/?course=${encodeURIComponent(courseId)}`));
    const matchingModule = modules.find((module) =>
      module.title?.toLowerCase() === moduleTitle.trim().toLowerCase(),
    );
    if (matchingModule) return matchingModule;
    return api.post('/modules/', {
      course: courseId,
      title: moduleTitle.trim() || `Module ${modules.length + 1}`,
      order: modules.reduce((maxOrder, module) => Math.max(maxOrder, module.order || 0), 0) + 1,
    });
  }, []);

  const addLesson = useCallback(async (courseId, lessonData) => {
    const course = courses.find((item) => String(item.id) === String(courseId)
      || item.slug === String(courseId));
    if (!course) throw new Error('Select a course owned by your instructor account.');
    const module = await getOrCreateModule(
      course.id,
      lessonData.moduleLabel || 'Module 1',
    );
    const lessons = itemList(await api.get(`/lessons/?module=${encodeURIComponent(module.id)}`));
    const lesson = await api.post('/lessons/', {
      module: module.id,
      title: lessonData.title.trim(),
      order: lessons.length + 1,
      learning_objectives: lessonData.description || '',
      tutorial_content: lessonData.description || '',
    });
    await refreshCourses();
    return lesson;
  }, [courses, getOrCreateModule, refreshCourses]);

  const addExercise = useCallback(async (courseId, exerciseData) => {
    const course = courses.find((item) => String(item.id) === String(courseId)
      || item.slug === String(courseId));
    if (!course) throw new Error('Select a course owned by your instructor account.');
    const module = await getOrCreateModule(
      course.id,
      exerciseData.moduleLabel || 'Module 1',
    );
    const lessons = itemList(await api.get(`/lessons/?module=${encodeURIComponent(module.id)}`));
    let lesson = lessons[0];
    if (!lesson) {
      lesson = await api.post('/lessons/', {
        module: module.id,
        title: 'Practice',
        order: 1,
      });
    }
    const activity = await api.post('/activities/', {
      lesson: lesson.id,
      activity_type: exerciseData.activityType || 'exercise',
      title: exerciseData.title.trim(),
      instructions: exerciseData.description || '',
      language: 'javascript',
      starter_code: exerciseData.starterCode || '',
      is_required: true,
    });
    await refreshCourses();
    return activity;
  }, [courses, getOrCreateModule, refreshCourses]);

  return (
    <CourseContext.Provider value={{
      courses,
      enrolledCourses,
      loading,
      error,
      refreshCourses,
      enroll,
      addCourse,
      addLesson,
      addExercise,
    }}>
      {children}
    </CourseContext.Provider>
  );
}

export function useCourses() {
  return useContext(CourseContext);
}
