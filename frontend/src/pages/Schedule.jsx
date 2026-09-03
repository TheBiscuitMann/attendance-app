// src/pages/Schedule.jsx
import { useState, useEffect, useRef } from 'react';
import { fetchCourses } from '../api/courses';
import {
  DAYS,
  TIME_SLOTS,
  emptyWeek,
  formatTime,
  newEntryId,
  loadWeek,
  saveWeek,
  todayKey,
} from '../utils/schedule';

const NAVY = '#0B2A59';
const RED = '#D32F2F';

export default function Schedule() {
  const [week, setWeek] = useState(emptyWeek());
  const [courses, setCourses] = useState([]);
  const [activeDay, setActiveDay] = useState('Sun');
  const [isLoading, setIsLoading] = useState(true);
  const [saveNotice, setSaveNotice] = useState('');

  const baselineRef = useRef('{}');

  useEffect(() => {
    const stored = loadWeek();
    setWeek(stored);
    baselineRef.current = JSON.stringify(stored);

    fetchCourses().then((result) => {
      if (result.success) setCourses(result.data);
      setIsLoading(false);
    });
  }, []);

  /* ── Entry editing ─────────────────────────────────────────────── */

  const addEntry = () => {
    setWeek((prev) => ({
      ...prev,
      [activeDay]: [
        ...prev[activeDay],
        { id: newEntryId(), courseId: '', customTitle: '', room: '', start: '', end: '' },
      ],
    }));
  };

  const updateEntry = (id, field, value) => {
    setWeek((prev) => ({
      ...prev,
      [activeDay]: prev[activeDay].map((entry) =>
        entry.id === id ? { ...entry, [field]: value } : entry
      ),
    }));
  };

  const removeEntry = (id) => {
    setWeek((prev) => ({
      ...prev,
      [activeDay]: prev[activeDay].filter((entry) => entry.id !== id),
    }));
  };

  const titleFor = (entry) => {
    if (entry.courseId === 'custom') return entry.customTitle.trim();
    const course = courses.find((c) => String(c.id) === String(entry.courseId));
    return course ? `${course.code}: ${course.name}` : entry.title || '';
  };

  const handleSave = () => {
    // Resolve each display title once, at save time, so the header
    // itinerary doesn't have to re-fetch courses to render.
    const cleaned = {};
    DAYS.forEach(({ key }) => {
      cleaned[key] = (week[key] || [])
        .map((entry) => ({ ...entry, title: titleFor(entry) }))
        .filter((entry) => entry.title)
        .sort((a, b) => (a.start || '99:99').localeCompare(b.start || '99:99'));
    });

    saveWeek(cleaned);
    setWeek(cleaned);
    baselineRef.current = JSON.stringify(cleaned);
    setSaveNotice(`Schedule saved for ${activeDayLabel}.`);
    setTimeout(() => setSaveNotice(''), 3200);
  };

  const isDirty = () => JSON.stringify(week) !== baselineRef.current;

  const handleDiscard = () => {
    const stored = loadWeek();
    setWeek(stored);
    baselineRef.current = JSON.stringify(stored);
  };

  const activeDayLabel = DAYS.find((d) => d.key === activeDay)?.label || '';
  const dayEntries = week[activeDay] || [];
  const today = todayKey();

  // Two classes on the same day at overlapping times is almost always a
  // mistake, so surface it while it's still easy to fix.
  const clashingIds = (() => {
    const timed = dayEntries.filter((e) => e.start && e.end && e.end > e.start);
    const ids = new Set();
    for (let i = 0; i < timed.length; i++) {
      for (let j = i + 1; j < timed.length; j++) {
        if (timed[i].start < timed[j].end && timed[j].start < timed[i].end) {
          ids.add(timed[i].id);
          ids.add(timed[j].id);
        }
      }
    }
    return ids;
  })();

  const totalClasses = DAYS.reduce(
    (sum, d) => sum + (week[d.key] || []).length,
    0
  );

  return (
    <div className="max-w-6xl mx-auto pb-28 page-enter">

      {/* ── Header ─────────────────────────────────────────────── */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-slate-800 tracking-tight">
          Schedule Manager
        </h1>
        <p className="text-slate-500 mt-1 font-medium">
          Build your weekly routine — pick a day, then add the classes you teach.
        </p>
      </div>

      {/* ── Week at a glance ───────────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2 mb-8">
        {DAYS.map((day) => {
          const count = (week[day.key] || []).length;
          const isActive = day.key === activeDay;
          return (
            <button
              key={day.key}
              onClick={() => setActiveDay(day.key)}
              className={`press rounded-xl border p-3 text-left transition-all ${
                isActive
                  ? 'text-white shadow-md border-transparent'
                  : 'bg-white border-slate-200 hover:border-slate-300 hover:shadow-sm'
              }`}
              style={isActive ? { backgroundColor: NAVY } : undefined}
            >
              <p className={`text-xs font-black uppercase tracking-wider ${
                isActive ? 'text-blue-200' : 'text-slate-400'
              }`}>
                {day.key}
                {day.key === today && ' • today'}
              </p>
              <p className={`text-lg font-bold mt-0.5 ${
                isActive ? 'text-white' : 'text-slate-800'
              }`}>
                {count}
              </p>
              <p className={`text-[11px] font-semibold ${
                isActive ? 'text-blue-200' : 'text-slate-400'
              }`}>
                {count === 1 ? 'class' : 'classes'}
              </p>
            </button>
          );
        })}
      </div>

      {/* ── Day picker ─────────────────────────────────────────── */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5 mb-6
                      flex flex-wrap items-end gap-4">
        <div>
          <label
            htmlFor="schedule-day"
            className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5"
          >
            📅 Select day
          </label>
          <select
            id="schedule-day"
            value={activeDay}
            onChange={(e) => setActiveDay(e.target.value)}
            className="px-4 py-2.5 rounded-lg border border-slate-300 bg-white
                       font-bold text-slate-800 outline-none focus:ring-2 min-w-[190px]"
            style={{ '--tw-ring-color': NAVY }}
          >
            {DAYS.map((day) => (
              <option key={day.key} value={day.key}>
                {day.label}
              </option>
            ))}
          </select>
        </div>

        <p className="text-sm font-semibold text-slate-500 pb-3">
          {dayEntries.length === 0
            ? `Nothing scheduled for ${activeDayLabel} yet.`
            : `${dayEntries.length} ${dayEntries.length === 1 ? 'class' : 'classes'} on ${activeDayLabel}.`}
        </p>

        <p className="ml-auto text-sm font-semibold text-slate-400 pb-3">
          {totalClasses} {totalClasses === 1 ? 'class' : 'classes'} this week
        </p>
      </div>

      {/* ── Entries ────────────────────────────────────────────── */}
      {isLoading ? (
        <div className="bg-white rounded-xl border border-slate-200 p-8">
          <div className="h-5 w-40 bg-slate-200 rounded animate-pulse mb-3" />
          <div className="h-5 w-3/4 bg-slate-100 rounded animate-pulse" />
        </div>
      ) : dayEntries.length === 0 ? (
        <div className="rounded-xl border-2 border-dashed border-slate-200
                        bg-white/60 py-16 px-6 text-center">
          <p className="text-slate-700 font-bold text-lg">
            No classes on {activeDayLabel}
          </p>
          <p className="text-slate-500 font-medium mt-1.5 max-w-sm mx-auto">
            Add a class to build this day's routine. Pick one of your courses,
            or write in anything else you teach.
          </p>
          <button
            onClick={addEntry}
            className="press mt-6 text-white font-bold text-sm px-5 py-2.5
                       rounded-lg shadow-md"
            style={{ backgroundColor: NAVY }}
          >
            + Add class
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {dayEntries.map((entry, index) => {
            const invalidRange = entry.start && entry.end && entry.end <= entry.start;
            const clashes = clashingIds.has(entry.id);
            return (
              <div
                key={entry.id}
                className={`bg-white rounded-xl p-5 shadow-sm border ${
                  clashes ? 'border-amber-300' : 'border-slate-200'
                }`}
              >
                {clashes && (
                  <p className="mb-3 text-xs font-bold text-amber-700 bg-amber-50
                                border border-amber-200 rounded-md px-3 py-2">
                    ⚠️ This overlaps another class on {activeDayLabel}.
                  </p>
                )}

                <div className="flex items-center justify-between mb-4">
                  <span className="text-xs font-black text-slate-400 uppercase tracking-wider">
                    Class {index + 1}
                  </span>
                  <button
                    onClick={() => removeEntry(entry.id)}
                    className="press text-xs font-bold text-slate-400 hover:text-red-600
                               hover:bg-red-50 px-2.5 py-1 rounded-md"
                  >
                    Remove
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="md:col-span-2">
                    <label className="block text-xs font-bold text-slate-400
                                      uppercase tracking-wider mb-1.5">
                      📚 Course
                    </label>
                    <select
                      value={entry.courseId}
                      onChange={(e) => updateEntry(entry.id, 'courseId', e.target.value)}
                      className="w-full px-3 py-2.5 rounded-lg border border-slate-300
                                 bg-white outline-none focus:ring-2 text-sm font-semibold
                                 text-slate-800"
                      style={{ '--tw-ring-color': NAVY }}
                    >
                      <option value="">Choose a course…</option>
                      {courses.map((course) => (
                        <option key={course.id} value={String(course.id)}>
                          {course.code} — {course.name}
                        </option>
                      ))}
                      <option value="custom">✏️ Write on your own</option>
                    </select>

                    {entry.courseId === 'custom' && (
                      <input
                        type="text"
                        autoFocus
                        placeholder="e.g., Departmental Meeting"
                        value={entry.customTitle}
                        onChange={(e) =>
                          updateEntry(entry.id, 'customTitle', e.target.value)
                        }
                        className="w-full mt-2.5 px-3 py-2.5 rounded-lg border border-slate-300
                                   outline-none focus:ring-2 text-sm font-medium text-slate-800
                                   animate-slideDown"
                        style={{ '--tw-ring-color': NAVY }}
                      />
                    )}
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-400
                                      uppercase tracking-wider mb-1.5">
                      📍 Room number
                    </label>
                    <input
                      type="text"
                      placeholder="e.g., Room 302"
                      value={entry.room}
                      onChange={(e) => updateEntry(entry.id, 'room', e.target.value)}
                      className="w-full px-3 py-2.5 rounded-lg border border-slate-300
                                 outline-none focus:ring-2 text-sm font-medium text-slate-700"
                      style={{ '--tw-ring-color': NAVY }}
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-400
                                      uppercase tracking-wider mb-1.5">
                      🕒 Time
                    </label>
                    <div className="flex items-center gap-2">
                      <select
                        value={entry.start}
                        onChange={(e) => updateEntry(entry.id, 'start', e.target.value)}
                        className="flex-1 px-3 py-2.5 rounded-lg border border-slate-300
                                   bg-white outline-none focus:ring-2 text-sm font-semibold
                                   text-slate-700"
                        style={{ '--tw-ring-color': NAVY }}
                      >
                        <option value="">Start</option>
                        {TIME_SLOTS.map((slot) => (
                          <option key={slot} value={slot}>{formatTime(slot)}</option>
                        ))}
                      </select>
                      <span className="text-slate-400 font-bold">–</span>
                      <select
                        value={entry.end}
                        onChange={(e) => updateEntry(entry.id, 'end', e.target.value)}
                        className="flex-1 px-3 py-2.5 rounded-lg border border-slate-300
                                   bg-white outline-none focus:ring-2 text-sm font-semibold
                                   text-slate-700"
                        style={{ '--tw-ring-color': NAVY }}
                      >
                        <option value="">End</option>
                        {TIME_SLOTS.map((slot) => (
                          <option key={slot} value={slot}>{formatTime(slot)}</option>
                        ))}
                      </select>
                    </div>
                    {invalidRange && (
                      <p className="text-xs font-bold text-red-600 mt-1.5">
                        End time must be after the start time.
                      </p>
                    )}
                  </div>
                </div>
              </div>
            );
          })}

          <button
            onClick={addEntry}
            className="press w-full py-3.5 rounded-xl border-2 border-dashed
                       border-slate-300 text-slate-500 font-bold text-sm
                       hover:border-slate-400 hover:text-slate-700 hover:bg-white
                       transition-colors"
          >
            + Add another class to {activeDayLabel}
          </button>
        </div>
      )}

      {/* ── Sticky save bar ────────────────────────────────────── */}
      <div className="fixed bottom-0 left-64 right-0 bg-white/95 backdrop-blur
                      border-t border-slate-200 px-8 py-3 flex flex-wrap items-center
                      justify-between gap-3 z-30">
        <p className="text-xs font-bold text-slate-400">
          {saveNotice ? (
            <span className="text-emerald-700">✅ {saveNotice}</span>
          ) : isDirty() ? (
            'Unsaved changes'
          ) : (
            'All changes saved'
          )}
        </p>
        <div className="flex gap-3">
          {isDirty() && (
            <button
              onClick={handleDiscard}
              className="press px-5 py-2.5 rounded-lg font-bold text-slate-600
                         hover:bg-slate-100 text-sm"
            >
              Discard changes
            </button>
          )}
          <button
            onClick={handleSave}
            className="press px-6 py-2.5 rounded-lg font-bold text-white shadow-md
                       text-sm uppercase tracking-wide"
            style={{ backgroundColor: RED }}
          >
            💾 Save Schedule
          </button>
        </div>
      </div>
    </div>
  );
}