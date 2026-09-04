// src/pages/Batches.jsx
import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { fetchCourses } from '../api/courses';
import {
  fetchBatches,
  createBatch,
  updateBatch,
  deleteBatch,
} from '../api/batches';

const NAVY = '#0B2A59';
const RED = '#D32F2F';

/* ── Icons ───────────────────────────────────────────────────────── */

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

function CardSkeleton() {
  return (
    <div className="p-5 border border-slate-200 rounded-xl bg-white">
      <div className="h-5 w-28 bg-slate-200 rounded animate-pulse mb-3" />
      <div className="h-4 w-2/3 bg-slate-200 rounded animate-pulse mb-3" />
      <div className="h-3 w-20 bg-slate-100 rounded animate-pulse" />
    </div>
  );
}

/* ── Page ────────────────────────────────────────────────────────── */

export default function Batches() {
  const [courses, setCourses] = useState([]);
  const [batches, setBatches] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [selectedCourse, setSelectedCourse] = useState('');
  const [batchName, setBatchName] = useState('');
  const [section, setSection] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const [confirmingId, setConfirmingId] = useState(null);

  const courseSelectRef = useRef(null);
  const navigate = useNavigate();

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    if (isFormOpen) courseSelectRef.current?.focus();
  }, [isFormOpen]);

  const loadData = async () => {
    setIsLoading(true);
    const [coursesResult, batchesResult] = await Promise.all([
      fetchCourses(),
      fetchBatches(),
    ]);

    if (coursesResult.success) setCourses(coursesResult.data);
    if (batchesResult.success) {
      setBatches(batchesResult.data);
      setError('');
    } else {
      setError(result.error || 'Could not load your batches.');
    }
    setIsLoading(false);
  };

  // Turn a course id into something a teacher recognises.
  // The old version printed the raw database id.
  const courseLabel = (courseId) => {
    const course = courses.find((c) => c.id === courseId);
    return course ? `${course.code} · ${course.name}` : 'Unknown course';
  };

  const courseCode = (courseId) => {
    const course = courses.find((c) => c.id === courseId);
    return course ? course.code : '—';
  };

  const openCreate = () => {
    setEditingId(null);
    setSelectedCourse('');
    setBatchName('');
    setSection('');
    setError('');
    setIsFormOpen(true);
  };

  const openEdit = (batch) => {
    setEditingId(batch.id);
    setSelectedCourse(String(batch.course));
    setBatchName(batch.name);
    setSection(batch.section || '');
    setError('');
    setIsFormOpen(true);
    setConfirmingId(null);
  };

  const closeForm = () => {
    setIsFormOpen(false);
    setEditingId(null);
    setSelectedCourse('');
    setBatchName('');
    setSection('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (isSaving) return;

    if (!selectedCourse) {
      setError('Pick a course for this batch first.');
      return;
    }

    setIsSaving(true);
    const result = editingId
      ? await updateBatch(editingId, selectedCourse, batchName.trim(), section.trim())
      : await createBatch(selectedCourse, batchName.trim(), section.trim());
    setIsSaving(false);

    if (result.success) {
      closeForm();
      loadData();
    } else {
      setError(result.error || 'Could not save the batch. Try again.');
    }
  };

  const handleDelete = async (batchId) => {
    const result = await deleteBatch(batchId);
    setConfirmingId(null);
    if (result.success) {
      loadData();
    } else {
      setError(result.error || 'Could not delete that batch. Try again.');
    }
  };

  const cardKeyDown = (e, batchId) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      navigate(`/batches/${batchId}`);
    }
  };

  const noCourses = !isLoading && courses.length === 0;

  return (
    <div className="max-w-6xl mx-auto page-enter">

      {/* ── Header ─────────────────────────────────────────────── */}
      <div className="flex flex-wrap items-end justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-bold text-slate-800 tracking-tight">
            Batch Management
          </h1>
          <p className="text-slate-500 mt-1 font-medium">
            Organise your courses into sections and batches.
          </p>
        </div>

        {!isFormOpen && (
          <button
            onClick={openCreate}
            disabled={noCourses}
            className="press inline-flex items-center gap-2 text-white font-bold text-sm
                       px-5 py-2.5 rounded-lg shadow-md hover:shadow-lg disabled:opacity-50
                       disabled:shadow-none"
            style={{ backgroundColor: NAVY }}
            title={noCourses ? 'Create a course first' : undefined}
          >
            <PlusIcon /> New batch
          </button>
        )}
      </div>

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
              {editingId ? 'Edit batch' : 'Create a new batch'}
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-6 gap-4 items-end">
              <div className="sm:col-span-2">
                <label
                  htmlFor="batch-course"
                  className="block text-sm font-bold text-slate-700 mb-1.5"
                >
                  Course
                </label>
                <select
                  id="batch-course"
                  ref={courseSelectRef}
                  required
                  value={selectedCourse}
                  onChange={(e) => setSelectedCourse(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-lg border border-slate-300 bg-white
                             text-slate-800 outline-none transition-shadow
                             focus:border-transparent focus:ring-2"
                  style={{ '--tw-ring-color': NAVY }}
                >
                  <option value="" disabled>Choose a course</option>
                  {courses.map((course) => (
                    <option key={course.id} value={course.id}>
                      {course.code} — {course.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="sm:col-span-2">
                <label
                  htmlFor="batch-name"
                  className="block text-sm font-bold text-slate-700 mb-1.5"
                >
                  Batch name
                </label>
                <input
                  id="batch-name"
                  type="text"
                  required
                  placeholder="53rd Batch"
                  value={batchName}
                  onChange={(e) => setBatchName(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-lg border border-slate-300
                             text-slate-800 outline-none transition-shadow
                             focus:border-transparent focus:ring-2"
                  style={{ '--tw-ring-color': NAVY }}
                />
              </div>

              <div className="sm:col-span-2">
                <label
                  htmlFor="batch-section"
                  className="block text-sm font-bold text-slate-700 mb-1.5"
                >
                  Section <span className="font-medium text-slate-400">(optional)</span>
                </label>
                <input
                  id="batch-section"
                  type="text"
                  placeholder="Section A"
                  value={section}
                  onChange={(e) => setSection(e.target.value)}
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
                {isSaving ? 'Saving…' : editingId ? 'Save changes' : 'Create batch'}
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

      {/* ── Batch list ───────────────────────────────────────────
          Hidden while the create form is open on an empty list, so the
          empty state isn't prompting for what's already in progress. */}
      {!(isFormOpen && !isLoading && batches.length === 0) && (
      <>
      <div className="flex items-baseline justify-between mb-4">
        <h3 className="text-lg font-bold text-slate-800">Your batches</h3>
        {!isLoading && batches.length > 0 && (
          <span className="text-sm font-semibold text-slate-400">
            {batches.length} {batches.length === 1 ? 'batch' : 'batches'}
          </span>
        )}
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <CardSkeleton />
          <CardSkeleton />
          <CardSkeleton />
        </div>
      ) : noCourses ? (
        <div className="rounded-xl border-2 border-dashed border-slate-200
                        bg-white/60 py-16 px-6 text-center">
          <p className="text-slate-700 font-bold text-lg">Create a course first</p>
          <p className="text-slate-500 font-medium mt-1.5 max-w-sm mx-auto">
            Batches live inside courses, so you'll need at least one course
            before you can add a batch.
          </p>
          <button
            onClick={() => navigate('/courses')}
            className="press inline-flex items-center gap-2 mt-6 text-white font-bold
                       text-sm px-5 py-2.5 rounded-lg shadow-md hover:shadow-lg"
            style={{ backgroundColor: NAVY }}
          >
            Go to Course Management
          </button>
        </div>
      ) : batches.length === 0 ? (
        <div className="rounded-xl border-2 border-dashed border-slate-200
                        bg-white/60 py-16 px-6 text-center">
          <p className="text-slate-700 font-bold text-lg">No batches yet</p>
          <p className="text-slate-500 font-medium mt-1.5 max-w-sm mx-auto">
            Add a batch to one of your courses, then import the student list
            and start taking attendance.
          </p>
          <button
            onClick={openCreate}
            className="press inline-flex items-center gap-2 mt-6 text-white font-bold
                       text-sm px-5 py-2.5 rounded-lg shadow-md hover:shadow-lg"
            style={{ backgroundColor: NAVY }}
          >
            <PlusIcon /> Add your first batch
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {batches.map((batch) => {
            const isConfirming = confirmingId === batch.id;
            const count = batch.student_count || 0;

            return (
              <div
                key={batch.id}
                role="button"
                tabIndex={0}
                onClick={() => !isConfirming && navigate(`/batches/${batch.id}`)}
                onKeyDown={(e) => !isConfirming && cardKeyDown(e, batch.id)}
                className="lift group relative bg-white p-5 border border-slate-200
                           rounded-xl hover:shadow-lg cursor-pointer"
                onMouseEnter={(e) => (e.currentTarget.style.borderColor = NAVY)}
                onMouseLeave={(e) => (e.currentTarget.style.borderColor = '')}
              >
                {isConfirming && (
                  <div className="absolute inset-0 z-10 rounded-xl bg-white/97
                                  backdrop-blur-[2px] flex flex-col items-center
                                  justify-center px-5 text-center animate-fadeIn">
                    <p className="font-bold text-slate-800">Delete this batch?</p>
                    <p className="text-xs text-slate-500 font-medium mt-1.5 leading-relaxed">
                      Its students and every attendance record are deleted too.
                      This can't be undone.
                    </p>
                    <div className="flex gap-2 mt-4">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDelete(batch.id);
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
                  <span
                    className="text-xs font-black px-2.5 py-1 rounded-md tracking-wider"
                    style={{ backgroundColor: '#e0e7ff', color: NAVY }}
                  >
                    {courseCode(batch.course)}
                  </span>

                  <div className="flex gap-1 opacity-60 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        openEdit(batch);
                      }}
                      className="press p-1.5 rounded-md text-slate-400
                                 hover:text-slate-700 hover:bg-slate-100"
                      aria-label={`Edit ${batch.name}`}
                      title="Edit"
                    >
                      <PencilIcon />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setConfirmingId(batch.id);
                      }}
                      className="press p-1.5 rounded-md text-slate-400
                                 hover:text-red-600 hover:bg-red-50"
                      aria-label={`Delete ${batch.name}`}
                      title="Delete"
                    >
                      <TrashIcon />
                    </button>
                  </div>
                </div>

                <h4 className="font-bold text-slate-800 text-lg leading-snug">
                  {batch.name}
                  {batch.section && (
                    <span className="text-slate-400 font-semibold"> · {batch.section}</span>
                  )}
                </h4>

                <p className="text-xs text-slate-500 font-medium mt-1 truncate">
                  {courseLabel(batch.course)}
                </p>

                <div className="flex items-center justify-between mt-4 pt-3
                                border-t border-slate-100">
                  <p className="text-sm text-slate-500 font-semibold">
                    {count === 0
                      ? 'No students yet'
                      : `${count} ${count === 1 ? 'student' : 'students'}`}
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