import { useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import Sidebar from '../components/Sidebar';
import { useAuth } from '../context/AuthContext';
import { useCourses } from '../context/CourseContext';
import { api } from '../lib/api';

const EMPTY_LIST = [];

function toList(value) {
  if (Array.isArray(value)) return value;
  if (Array.isArray(value?.results)) return value.results;
  throw new Error('The server returned course content in an unexpected format.');
}

function activityKind(activity) {
  return String(activity?.activity_type || '').toLowerCase();
}

export default function Lessons() {
  const [searchParams] = useSearchParams();
  const { user } = useAuth();
  const { courses, enrolledCourses, loading: coursesLoading } = useCourses();
  const courseKey = searchParams.get('course');
  const course = [...enrolledCourses, ...courses].find(
    (item) => String(item.id) === String(courseKey) || item.slug === courseKey,
  );
  const [modules, setModules] = useState([]);
  const [activeLessonId, setActiveLessonId] = useState(null);
  const [activeActivityId, setActiveActivityId] = useState(null);
  const [code, setCode] = useState('');
  const [quiz, setQuiz] = useState(null);
  const [answers, setAnswers] = useState({});
  const [executionResult, setExecutionResult] = useState(null);
  const [quizResult, setQuizResult] = useState(null);
  const [submissionResult, setSubmissionResult] = useState(null);
  const [pageError, setPageError] = useState('');
  const [actionError, setActionError] = useState('');
  const [loading, setLoading] = useState(false);
  const [working, setWorking] = useState(false);

  useEffect(() => {
    if (!course?.id || !course.isEnrolled || !user) {
      setModules([]);
      setActiveLessonId(null);
      return undefined;
    }

    let cancelled = false;
    setLoading(true);
    setPageError('');
    Promise.resolve()
      .then(async () => {
        const moduleItems = toList(await api.get(
          `/modules/?course=${encodeURIComponent(course.id)}`,
        ));
        const populatedModules = await Promise.all(moduleItems.map(async (module) => ({
          ...module,
          lessons: toList(await api.get(
            `/lessons/?module=${encodeURIComponent(module.id)}`,
          )),
        })));
        if (cancelled) return;
        setModules(populatedModules);
        const firstLesson = populatedModules.flatMap((module) => module.lessons)[0];
        setActiveLessonId((current) => (
          populatedModules.some((module) =>
            module.lessons.some((lesson) => String(lesson.id) === String(current)),
          )
            ? current
            : firstLesson?.id || null
        ));
      })
      .catch((error) => {
        if (!cancelled) setPageError(error.message || 'Unable to load course lessons.');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [course?.id, course?.isEnrolled, user]);

  const lessons = useMemo(
    () => modules.flatMap((module) => module.lessons),
    [modules],
  );
  const activeLesson = lessons.find(
    (lesson) => String(lesson.id) === String(activeLessonId),
  );
  const activities = activeLesson?.activities || EMPTY_LIST;
  const activeActivity = activities.find(
    (activity) => String(activity.id) === String(activeActivityId),
  );
  const kind = activityKind(activeActivity);
  const activeQuiz = quiz?.activityId === activeActivity?.id ? quiz.value : null;

  useEffect(() => {
    setActiveActivityId(activities[0]?.id || null);
  }, [activeLessonId, activities, modules]);

  useEffect(() => {
    setCode(activeActivity?.starter_code || '');
    setExecutionResult(null);
    setQuizResult(null);
    setSubmissionResult(null);
    setActionError('');
    setAnswers({});
    setQuiz(null);
  }, [activeActivityId, activeActivity?.starter_code]);

  useEffect(() => {
    if (kind !== 'quiz' || !activeActivity?.id) {
      return undefined;
    }
    let cancelled = false;
    api.get(`/quizzes/?activity=${encodeURIComponent(activeActivity.id)}`)
      .then((response) => {
        if (!cancelled) {
          const quizItems = toList(response);
          setQuiz({
            activityId: activeActivity.id,
            value: quizItems[0] || response?.quiz || null,
          });
        }
      })
      .catch((error) => {
        if (!cancelled) setActionError(error.message || 'Unable to load this quiz.');
      });
    return () => {
      cancelled = true;
    };
  }, [activeActivity?.id, kind]);

  const runTests = async () => {
    if (!activeActivity) return;
    setWorking(true);
    setActionError('');
    setExecutionResult(null);
    try {
      const result = await api.post('/execute/test/', {
        activity_id: activeActivity.id,
        language: activeActivity.language,
        code,
      });
      setExecutionResult(result);
    } catch (error) {
      setActionError(error.message || 'Code execution failed.');
    } finally {
      setWorking(false);
    }
  };

  const submitWork = async () => {
    if (!activeActivity) return;
    setWorking(true);
    setActionError('');
    try {
      const result = await api.post('/submissions/', {
        activity: activeActivity.id,
        content: code,
      });
      setSubmissionResult(result);
    } catch (error) {
      setActionError(error.message || 'Unable to submit this activity.');
    } finally {
      setWorking(false);
    }
  };

  const submitQuiz = async () => {
    if (!activeQuiz?.id) {
      setActionError('This quiz is not available yet.');
      return;
    }
    if (activeQuiz.questions?.some((question) => answers[String(question.id)] === undefined)) {
      setActionError('Answer each question before submitting so you do not use an attempt accidentally.');
      return;
    }
    setWorking(true);
    setActionError('');
    try {
      const result = await api.post(`/quizzes/${activeQuiz.id}/submit/`, { answers });
      setQuizResult(result);
    } catch (error) {
      setActionError(error.message || 'Unable to submit your quiz.');
    } finally {
      setWorking(false);
    }
  };

  return (
    <div className="dashboard-layout">
      <Sidebar />
      <main className="main-content" style={{ padding: '32px', minWidth: 0 }}>
        <div className="breadcrumb">
          <Link to="/my-courses">My Courses</Link>
          <span>›</span>
          <strong>{course?.title || 'Lessons'}</strong>
        </div>

        {!courseKey && (
          <section className="card">
            <h1>Choose a course</h1>
            <p>Open a course from your enrolled courses to view its lessons.</p>
            <Link className="btn btn-primary" to="/my-courses">My courses</Link>
          </section>
        )}

        {courseKey && coursesLoading && <p role="status">Loading course…</p>}

        {courseKey && !coursesLoading && !course && (
          <section className="card" role="alert">
            <h1>Course unavailable</h1>
            <p>This course could not be found in the server catalog.</p>
            <Link to="/my-courses">Return to my courses</Link>
          </section>
        )}

        {course && !course.isEnrolled && (
          <section className="card">
            <h1>{course.title}</h1>
            <p>Enroll in this course before opening its lessons.</p>
            <Link className="btn btn-primary" to="/courses">Browse courses</Link>
          </section>
        )}

        {course?.isEnrolled && (
          <>
            <header style={{ margin: '16px 0 24px' }}>
              <h1>{course.title}</h1>
              <p>{course.description}</p>
            </header>

            {pageError && <p role="alert">{pageError}</p>}
            {loading && <p role="status">Loading course content…</p>}

            {!loading && !pageError && modules.length === 0 && (
              <section className="card">
                <p>This course does not have published modules yet.</p>
              </section>
            )}

            {!loading && modules.length > 0 && (
              <div style={{ display: 'grid', gridTemplateColumns: 'minmax(220px, 1fr) 3fr', gap: '24px' }}>
                <nav className="card" aria-label="Course curriculum">
                  {modules.map((module) => (
                    <section key={module.id} style={{ marginBottom: '20px' }}>
                      <h2 style={{ fontSize: '1rem' }}>{module.title}</h2>
                      {module.lessons.length === 0 && (
                        <p style={{ opacity: 0.75 }}>
                          No lessons are available in this module yet. It may be locked or unpublished.
                        </p>
                      )}
                      {module.lessons.map((lesson) => (
                        <button
                          key={lesson.id}
                          type="button"
                          className="btn btn-outline"
                          aria-current={String(activeLessonId) === String(lesson.id) ? 'page' : undefined}
                          onClick={() => setActiveLessonId(lesson.id)}
                          style={{ display: 'block', width: '100%', textAlign: 'left', margin: '6px 0' }}
                        >
                          {lesson.title}
                        </button>
                      ))}
                    </section>
                  ))}
                </nav>

                <article className="card" style={{ minWidth: 0 }}>
                  {!activeLesson && <p>Select an available lesson to begin.</p>}
                  {activeLesson && (
                    <>
                      <h2>{activeLesson.title}</h2>
                      {activeLesson.learning_objectives && (
                        <p>{activeLesson.learning_objectives}</p>
                      )}
                      {activeLesson.video_url && (
                        <p>
                          <a href={activeLesson.video_url} target="_blank" rel="noreferrer">
                            Open lesson video
                          </a>
                        </p>
                      )}
                      {activeLesson.video_file_url && (
                        <video
                          controls
                          preload="metadata"
                          src={activeLesson.video_file_url}
                          style={{ display: 'block', width: '100%', maxHeight: '480px', margin: '16px 0' }}
                        >
                          Your browser does not support video playback.
                        </video>
                      )}
                      {activeLesson.tutorial_content && (
                        <pre style={{ whiteSpace: 'pre-wrap', overflowWrap: 'anywhere' }}>
                          {activeLesson.tutorial_content}
                        </pre>
                      )}

                      {activities.length > 0 && (
                        <section style={{ marginTop: '28px' }}>
                          <h3>Activities</h3>
                          <div role="tablist" aria-label="Lesson activities" style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                            {activities.map((activity) => (
                              <button
                                key={activity.id}
                                type="button"
                                role="tab"
                                aria-selected={String(activeActivityId) === String(activity.id)}
                                className="btn btn-outline"
                                onClick={() => setActiveActivityId(activity.id)}
                              >
                                {activity.title}
                              </button>
                            ))}
                          </div>
                          {activeActivity && (
                            <div style={{ marginTop: '16px' }}>
                              <h4>{activeActivity.title}</h4>
                              <p>{activeActivity.instructions}</p>

                              {kind === 'quiz' && (
                                <div>
                                  {!activeQuiz && <p role="status">Loading quiz…</p>}
                                  {activeQuiz?.questions?.map((question) => (
                                    <fieldset key={question.id} style={{ margin: '16px 0' }}>
                                      <legend>{question.text}</legend>
                                      {question.choices?.map((choice, index) => (
                                        <label key={index} style={{ display: 'block', margin: '8px 0' }}>
                                          <input
                                            type="radio"
                                            name={`question-${question.id}`}
                                            checked={answers[String(question.id)] === index}
                                            onChange={() => setAnswers((current) => ({
                                              ...current,
                                              [String(question.id)]: index,
                                            }))}
                                          />
                                          {' '}{choice.text}
                                        </label>
                                      ))}
                                    </fieldset>
                                  ))}
                                  {activeQuiz && (
                                    <button className="btn btn-primary" onClick={submitQuiz} disabled={working}>
                                      {working ? 'Submitting…' : 'Submit quiz'}
                                    </button>
                                  )}
                                  {quizResult && (
                                    <p role="status">
                                      {quizResult.passed ? 'Quiz passed.' : 'Quiz not passed.'}
                                      {' '}Score: {quizResult.score}/{quizResult.total_marks}
                                    </p>
                                  )}
                                </div>
                              )}

                              {kind !== 'quiz' && (
                                <>
                                  <label htmlFor="lesson-code">Your code or written response</label>
                                  <textarea
                                    id="lesson-code"
                                    value={code}
                                    onChange={(event) => setCode(event.target.value)}
                                    rows={12}
                                    spellCheck="false"
                                    style={{ display: 'block', width: '100%', fontFamily: 'monospace', margin: '8px 0 12px' }}
                                  />
                                  <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                                    {['exercise', 'lab'].includes(kind) && (
                                      <button className="btn btn-outline" onClick={runTests} disabled={working}>
                                        {working ? 'Running…' : 'Run activity tests'}
                                      </button>
                                    )}
                                    <button className="btn btn-primary" onClick={submitWork} disabled={working}>
                                      {working ? 'Submitting…' : 'Submit activity'}
                                    </button>
                                  </div>
                                  {executionResult && (
                                    <p role="status">
                                      {executionResult.passed} of {executionResult.total} tests passed
                                      {typeof executionResult.score === 'number'
                                        ? ` (${executionResult.score}%).`
                                        : '.'}
                                    </p>
                                  )}
                                  {submissionResult && (
                                    <p role="status">
                                      Submission received. Attempt {submissionResult.attempt_number}.
                                    </p>
                                  )}
                                </>
                              )}
                              {actionError && <p role="alert">{actionError}</p>}
                            </div>
                          )}
                        </section>
                      )}
                    </>
                  )}
                </article>
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
}
