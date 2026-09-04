// src/pages/CourseDetail.jsx
//
// One card: the course's batches, with "+ Add Batch" in its header.
// Creating a batch happens in a modal, so the list — the thing a
// teacher actually comes here for — owns the page.
import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { fetchCourse } from '../api/courses';
import { createBatch } from '../api/batches';

const NAVY = '#0B2A59';

export default function CourseDetail() {
  const { courseId } = useParams();
  const navigate = useNavigate();

  const [course, setCourse] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  // Add-batch modal
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [batchName, setBatchName] = useState('');
  const [section, setSection] = useState('');
  const [formError, setFormError] = useState('');
  const [isCreating, setIsCreating] = useState(false);

  useEffect(() => {
    loadCourseDetails();
  }, [courseId]);

  const loadCourseDetails = async () => {
    setIsLoading(true);
    const result = await fetchCourse(courseId);
    if (result.success) {
      setCourse(result.data);
    }
    setIsLoading(false);
  };

  const openAddModal = () => {
    setBatchName('');
    setSection('');
    setFormError('');
    setIsAddOpen(true);
  };

  const handleCreateBatch = async (e) => {
    e.preventDefault();
    if (!batchName.trim() || !section.trim()) {
      setFormError('Both the batch name and the section are required.');
      return;
    }

    setIsCreating(true);
    const result = await createBatch(courseId, batchName.trim(), section.trim());
    setIsCreating(false);

    if (result.success) {
      setIsAddOpen(false);
      loadCourseDetails();
    } else {
      setFormError(result.error || 'Could not create the batch.');
    }
  };

  if (isLoading) {
    return <div className="p-8 text-slate-500 font-medium">Loading course data...</div>;
  }
  if (!course) {
    return <div className="p-8 text-red-500 font-bold">Course not found.</div>;
  }

  return (
    <div className="max-w-6xl mx-auto page-enter">
      {/* ── Header ──────────────────────────────────────────────── */}
      <div className="mb-6 sm:mb-8 flex items-start gap-3 sm:gap-4">
        <button
          onClick={() => navigate('/courses')}
          className="press bg-slate-200 hover:bg-slate-300 text-slate-700 px-3 py-1.5
                     rounded-lg font-bold transition-all flex-shrink-0"
        >
          ← Back
        </button>
        <div className="min-w-0">
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-800">
            {course.code}: {course.name}
          </h1>
          <p className="text-slate-500 mt-1 font-medium text-sm sm:text-base">
            Manage batches and sections for this course.
          </p>
        </div>
      </div>

      {/* ── Batches ─────────────────────────────────────────────── */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-4 sm:p-6 border-b border-slate-100 bg-slate-50 flex items-center
                        justify-between gap-3 flex-wrap">
          <div>
            <h3 className="text-lg font-bold text-slate-800">Batches in this Course</h3>
            <p className="text-xs text-slate-400 font-bold mt-0.5">
              {course.batches.length} batch{course.batches.length === 1 ? '' : 'es'}
            </p>
          </div>
          <button
            onClick={openAddModal}
            className="press text-white font-bold text-sm px-4 py-2.5 rounded-lg shadow-md
                       uppercase tracking-wide"
            style={{ backgroundColor: NAVY }}
          >
            + Add Batch
          </button>
        </div>

        <div className="p-4 sm:p-6">
          {course.batches.length === 0 ? (
            <div className="border-2 border-dashed border-slate-200 rounded-xl py-12 px-6
                            text-center">
              <p className="font-bold text-slate-600">No batches yet</p>
              <p className="text-sm text-slate-400 font-medium mt-1 mb-5">
                Create the first batch for {course.code} — for example "58" with
                section "G".
              </p>
              <button
                onClick={openAddModal}
                className="press text-white font-bold text-sm px-5 py-2.5 rounded-lg
                           shadow-md uppercase tracking-wide"
                style={{ backgroundColor: NAVY }}
              >
                + Add Batch
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {course.batches.map((batch) => (
                <div
                  key={batch.id}
                  onClick={() => navigate(`/batches/${batch.id}`)}
                  className="p-5 border border-slate-200 rounded-lg hover:border-blue-500
                             hover:shadow-md transition-all group cursor-pointer"
                >
                  <h4 className="font-bold text-slate-800 text-lg group-hover:text-blue-600
                                 transition-colors">
                    {batch.name} {batch.section && `(${batch.section})`}
                  </h4>
                  <p className="text-sm text-slate-500 mt-2 font-medium">
                    Students: {batch.student_count || 0}
                  </p>
                  <div className="mt-3 text-xs font-bold text-blue-500 uppercase
                                  tracking-wider">
                    Enter Batch →
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ── Add Batch modal ─────────────────────────────────────── */}
      {isAddOpen && (
        <div
          className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center
                     justify-center p-4"
          onClick={() => !isCreating && setIsAddOpen(false)}
        >
          <div
            className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 animate-fadeIn"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-lg font-bold text-slate-900">
              Add Batch to {course.code}
            </h3>
            <p className="text-sm text-slate-500 font-medium mt-1 mb-5">
              Every batch needs both a name and a section.
            </p>

            <form onSubmit={handleCreateBatch} className="space-y-4">
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1">
                  Batch Name
                </label>
                <input
                  type="text"
                  required
                  autoFocus
                  placeholder='e.g., "58" or "53rd Batch"'
                  value={batchName}
                  onChange={(e) => setBatchName(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-lg border border-slate-300
                             focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1">
                  Section
                </label>
                <input
                  type="text"
                  required
                  placeholder='e.g., "G"'
                  value={section}
                  onChange={(e) => setSection(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-lg border border-slate-300
                             focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </div>

              {formError && (
                <p className="text-sm font-bold text-rose-600 bg-rose-50 border
                              border-rose-200 rounded-lg px-3 py-2">
                  {formError}
                </p>
              )}

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsAddOpen(false)}
                  disabled={isCreating}
                  className="press font-bold text-sm px-5 py-2.5 rounded-lg text-slate-600
                             hover:bg-slate-100 disabled:opacity-60"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isCreating}
                  className="press text-white font-bold text-sm px-6 py-2.5 rounded-lg
                             shadow-md uppercase tracking-wide disabled:opacity-60"
                  style={{ backgroundColor: NAVY }}
                >
                  {isCreating ? 'Creating…' : 'Create Batch'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}