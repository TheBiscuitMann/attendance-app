// src/pages/Courses.jsx
import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  fetchCourses,
  createCourse,
  updateCourse,
  deleteCourse,
} from '../api/courses';

const NAVY = '#0B2A59';
const RED = '#D32F2F';

/* ── Small inline icons (no icon library in this project) ────────── */

const PlusIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor"
       strokeWidth="2.5" strokeLinecap="round" aria-hidden="true">
    <path d="M12 5v14M5 12h14" />
  </svg>
);

const PencilIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor"
       strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M12 20h9M16.5 3.5a2.1 2.1 0 013 3L7 19l-4 1 1-4z" />
  </svg>
);

const TrashIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor"
       strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M3 6h18M8 6V4a1 1 0 011-1h6a1 1 0 011 1v2m2 0v14a1 1 0 01-1 1H7a1 1 0 01-1-1V6" />
  </svg>
);

const ChevronIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor"
       strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M9 18l6-6-6-6" />
  </svg>
);

/* ── Loading placeholder ─────────────────────────────────────────── */

function CardSkeleton() {
  return (
    <div className="p-5 border border-slate-200 rounded-xl bg-white">
      <div className="h-5 w-20 bg-slate-200 rounded animate-pulse mb-3" />
      <div className="h-5 w-3/4 bg-slate-200 rounded animate-pulse mb-3" />
      <div className="h-3 w-24 bg-slate-100 rounded animate-pulse" />
    </div>
  );
}

/* ── Page ────────────────────────────────────────────────────────── */

export default function Courses() {
  const [courses, setCourses] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  // The form panel is shared between "create" and "edit".
  // editingId === null means we're creating.
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [code, setCode] = useState('');
  const [name, setName] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  // Which card is currently asking "are you sure?"
  const [confirmingId, setConfirmingId] = useState(null);

  const codeInputRef = useRef(null);
  const navigate = useNavigate();

  useEffect(() => {
    loadCourses();
  }, []);

  // Focus the first field whenever the panel opens, so a teacher can
  // start typing immediately instead of hunting for the input.
  useEffect(() => {
    if (isFormOpen) codeInputRef.current?.focus();
  }, [isFormOpen]);

  const loadCourses = async () => {
    setIsLoading(true);
    const result = await fetchCourses();
    if (result.success) {
      setCourses(result.data);
      setError('');
    } else {
      setError(result.error || 'Could not load your courses.');
    }
    setIsLoading(false);
  };

  const openCreate = () => {
    setEditingId(null);
    setCode('');
    setName('');
    setError('');
    setIsFormOpen(true);
  };

  const openEdit = (course) => {
    setEditingId(course.id);
    setCode(course.code);
    setName(course.name);
    setError('');
    setIsFormOpen(true);
    setConfirmingId(null);
  };

  const closeForm = () => {
    setIsFormOpen(false);
    setEditingId(null);
    setCode('');
    setName('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (isSaving) return;

    setIsSaving(true);
    const result = editingId
      ? await updateCourse(editingId, code.trim(), name.trim())
      : await createCourse(code.trim(), name.trim());
    setIsSaving(false);

    if (result.success) {
      closeForm();
      loadCourses();
    } else {
      // The server explains duplicates by name — "You already have a
      // course with the code CSE-416" beats a generic failure.
      setError(result.error || 'Could not save the course. Try again.');
    }
  };

  const handleDelete = async (courseId) => {
    const result = await deleteCourse(courseId);
    setConfirmingId(null);
    if (result.success) {
      loadCourses();
    } else {
      setError(result.error || 'Could not delete that course. Try again.');
    }
  };

  // Enter/Space on a card should open it, same as a click.
  const cardKeyDown = (e, courseId) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      navigate(`/courses/${courseId}`);
    }
  };

  return (
    <div className="max-w-6xl mx-auto page-enter">

      {/* ── Header ─────────────────────────────────────────────── */}
      <div className="flex flex-wrap items-end justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-bold text-slate-800 tracking-tight">
            Course Management
          </h1>
          <p className="text-slate-500 mt-1 font-medium">
            Create and manage your academic courses.
          </p>
        </div>

        {!isFormOpen && (
          <button
            onClick={openCreate}
            className="press inline-flex items-center gap-2 text-white font-bold text-sm
                       px-5 py-2.5 rounded-lg shadow-md hover:shadow-lg"
            style={{ backgroundColor: NAVY }}
          >
            <PlusIcon /> New course
          </button>
        )}
      </div>

      {/* ── Error banner (replaces the old alert popups) ───────── */}
      {error && (
        <div className="mb-6 flex items-start justify-between gap-4 rounded-lg border
                        border-red-200 bg-red-50 px-4 py-3 animate-slideDown">
          <p className="text-sm font-semibold text-red-800">{error}</p>
          <button
            onClick={() => setError('')}
            className="text-red-400 hover:text-red-700 font-bold text-sm leading-none"
            aria-label="Dismiss"
          >
            ✕
          </button>
        </div>
      )}

      {/* ── Add / edit panel ───────────────────────────────────── */}
      {isFormOpen && (
        <div
          className="mb-8 bg-white rounded-xl border border-slate-200 shadow-sm
                     overflow-hidden animate-slideDown"
          style={{ borderTop: `4px solid ${editingId ? RED : NAVY}` }}
        >
          <form onSubmit={handleSubmit} className="p-6">
            <h2 className="text-lg font-bold text-slate-800 mb-5">
              {editingId ? 'Edit course' : 'Add a new course'}
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-5 gap-4 items-end">
              <div className="sm:col-span-2">
                <label
                  htmlFor="course-code"
                  className="block text-sm font-bold text-slate-700 mb-1.5"
                >
                  Course code
                </label>
                <input
                  id="course-code"
                  ref={codeInputRef}
                  type="text"
                  required
                  placeholder="CSE-416"
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-lg border border-slate-300
                             text-slate-800 outline-none transition-shadow
                             focus:border-transparent focus:ring-2"
                  style={{ '--tw-ring-color': NAVY }}
                />
              </div>

              <div className="sm:col-span-3">
                <label
                  htmlFor="course-name"
                  className="block text-sm font-bold text-slate-700 mb-1.5"
                >
                  Course name
                </label>
                <input
                  id="course-name"
                  type="text"
                  required
                  placeholder="Compiler Construction"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-lg border border-slate-300
                             text-slate-800 outline-none transition-shadow
                             focus:border-transparent focus:ring-2"
                  style={{ '--tw-ring-color': NAVY }}
                />
              </div>
            </div>

            <div className="flex items-center gap-3 mt-6">
              <button
                type="submit"
                disabled={isSaving}
                className="press text-white font-bold text-sm px-6 py-2.5 rounded-lg
                           shadow-md hover:shadow-lg disabled:opacity-60"
                style={{ backgroundColor: editingId ? RED : NAVY }}
              >
                {isSaving
                  ? 'Saving…'
                  : editingId
                  ? 'Save changes'
                  : 'Create course'}
              </button>
              <button
                type="button"
                onClick={closeForm}
                className="press font-bold text-sm px-5 py-2.5 rounded-lg
                           text-slate-600 hover:bg-slate-100"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ── Course list ──────────────────────────────────────────
          With no courses and the form open, the empty state would be
          telling the teacher to do the thing they're already doing. */}
      {!(isFormOpen && !isLoading && courses.length === 0) && (
      <>
      <div className="flex items-baseline justify-between mb-4">
        <h3 className="text-lg font-bold text-slate-800">Your courses</h3>
        {!isLoading && courses.length > 0 && (
          <span className="text-sm font-semibold text-slate-400">
            {courses.length} {courses.length === 1 ? 'course' : 'courses'}
          </span>
        )}
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <CardSkeleton />
          <CardSkeleton />
          <CardSkeleton />
        </div>
      ) : courses.length === 0 ? (
        <div className="rounded-xl border-2 border-dashed border-slate-200
                        bg-white/60 py-16 px-6 text-center">
          <p className="text-slate-700 font-bold text-lg">No courses yet</p>
          <p className="text-slate-500 font-medium mt-1.5 max-w-sm mx-auto">
            Add your first course, then create batches inside it and start
            taking attendance.
          </p>
          <button
            onClick={openCreate}
            className="press inline-flex items-center gap-2 mt-6 text-white font-bold
                       text-sm px-5 py-2.5 rounded-lg shadow-md hover:shadow-lg"
            style={{ backgroundColor: NAVY }}
          >
            <PlusIcon /> Add your first course
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {courses.map((course) => {
            const batchCount = course.batches ? course.batches.length : 0;
            const isConfirming = confirmingId === course.id;

            return (
              <div
                key={course.id}
                role="button"
                tabIndex={0}
                onClick={() => !isConfirming && navigate(`/courses/${course.id}`)}
                onKeyDown={(e) => !isConfirming && cardKeyDown(e, course.id)}
                className="lift group relative bg-white p-5 border border-slate-200
                           rounded-xl hover:shadow-lg cursor-pointer"
                style={{ '--hover-border': NAVY }}
                onMouseEnter={(e) => (e.currentTarget.style.borderColor = NAVY)}
                onMouseLeave={(e) => (e.currentTarget.style.borderColor = '')}
              >
                {/* Delete confirmation covers the card rather than firing
                    a browser confirm() dialog. */}
                {isConfirming && (
                  <div className="absolute inset-0 z-10 rounded-xl bg-white/97
                                  backdrop-blur-[2px] flex flex-col items-center
                                  justify-center px-5 text-center animate-fadeIn">
                    <p className="font-bold text-slate-800">Delete this course?</p>
                    <p className="text-xs text-slate-500 font-medium mt-1.5 leading-relaxed">
                      Its batches, students and attendance records are deleted too.
                      This can't be undone.
                    </p>
                    <div className="flex gap-2 mt-4">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDelete(course.id);
                        }}
                        className="press text-white text-xs font-bold px-4 py-2 rounded-lg shadow-sm"
                        style={{ backgroundColor: RED }}
                      >
                        Delete
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setConfirmingId(null);
                        }}
                        className="press text-xs font-bold px-4 py-2 rounded-lg
                                   text-slate-600 bg-slate-100 hover:bg-slate-200"
                      >
                        Keep it
                      </button>
                    </div>
                  </div>
                )}

                <div className="flex items-start justify-between gap-2 mb-3">
                  <span className="bg-red-100 text-red-700 text-xs font-black
                                   px-2.5 py-1 rounded-md tracking-wider">
                    {course.code}
                  </span>

                  {/* Always visible on touch devices; the hover state just
                      raises the contrast on desktop. */}
                  <div className="flex gap-1 opacity-60 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        openEdit(course);
                      }}
                      className="press p-1.5 rounded-md text-slate-400
                                 hover:text-slate-700 hover:bg-slate-100"
                      aria-label={`Edit ${course.code}`}
                      title="Edit"
                    >
                      <PencilIcon />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setConfirmingId(course.id);
                      }}
                      className="press p-1.5 rounded-md text-slate-400
                                 hover:text-red-600 hover:bg-red-50"
                      aria-label={`Delete ${course.code}`}
                      title="Delete"
                    >
                      <TrashIcon />
                    </button>
                  </div>
                </div>

                <h4 className="font-bold text-slate-800 text-lg leading-snug transition-colors"
                    onMouseEnter={(e) => (e.currentTarget.style.color = NAVY)}
                    onMouseLeave={(e) => (e.currentTarget.style.color = '')}>
                  {course.name}
                </h4>

                <div className="flex items-center justify-between mt-4 pt-3
                                border-t border-slate-100">
                  <p className="text-sm text-slate-500 font-semibold">
                    {batchCount === 0
                      ? 'No batches yet'
                      : `${batchCount} ${batchCount === 1 ? 'batch' : 'batches'}`}
                  </p>
                  <span
                    className="text-slate-300 group-hover:translate-x-0.5 transition-transform"
                    aria-hidden="true"
                  >
                    <ChevronIcon />
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}
      </>
      )}
    </div>
  );
}