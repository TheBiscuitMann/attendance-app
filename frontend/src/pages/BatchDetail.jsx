import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { fetchBatch } from '../api/batches';
import { createStudent, updateStudent } from '../api/students';
import { createSession, saveAttendance, fetchSummary, fetchSessions } from '../api/attendance';

const NAVY = '#0B2A59';

// Minimum attendance percentage to sit the final exam.
// NOTE: the backend (api/views.py) has its own ELIGIBILITY_THRESHOLD.
// Keep the two numbers in sync.
const ELIGIBILITY_THRESHOLD = 60;

const today = () => new Date().toISOString().split('T')[0];

// The API stores dates as ISO (YYYY-MM-DD). Everything a teacher reads
// is shown as DD/MM/YYYY, so every date in this file goes through here.
const formatDate = (iso) => {
  if (!iso) return '';
  const [year, month, day] = iso.split('-');
  return `${day}/${month}/${year}`;
};

/* ── Icons ───────────────────────────────────────────────────────── */

const CheckIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor"
       strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M20 6L9 17l-5-5" />
  </svg>
);

const CrossIcon = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor"
       strokeWidth="3" strokeLinecap="round" aria-hidden="true">
    <path d="M18 6L6 18M6 6l12 12" />
  </svg>
);

const ClockIcon = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor"
       strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <circle cx="12" cy="12" r="9" />
    <path d="M12 7v5l3 2" />
  </svg>
);

export default function BatchDetail() {
  const { batchId } = useParams();
  const navigate = useNavigate();

  const [batch, setBatch] = useState(null);
  const [activeTab, setActiveTab] = useState('attendance');
  const [isLoading, setIsLoading] = useState(true);

  // Every saved session for this batch, kept in memory so switching the
  // date can look up that day's record without a round trip.
  const [sessions, setSessions] = useState([]);
  const [editingSessionId, setEditingSessionId] = useState(null);

  const [studentName, setStudentName] = useState('');
  const [studentId, setStudentId] = useState('');
  const [editingRowId, setEditingRowId] = useState(null);
  const [editName, setEditName] = useState('');
  const [editId, setEditId] = useState('');

  const [sessionDate, setSessionDate] = useState(today());
  const [sessionTopic, setSessionTopic] = useState('');

  // Each entry is { present: bool, late: bool }.
  // `late` is only meaningful when `present` is true.
  const [attendanceMarks, setAttendanceMarks] = useState({});
  const [isSaving, setIsSaving] = useState(false);

  // Snapshot of the marks as last loaded or saved, so we can tell
  // whether the teacher has unsaved changes.
  const baselineRef = useRef('{}');
  const dateInputRef = useRef(null);

  // A date that already has a saved session is read-only. The only way
  // to edit it is through Session History, which sets this to that
  // session's id and unlocks the sheet for it.
  const [unlockedSessionId, setUnlockedSessionId] = useState(null);

  // { date, unlockId } — a date switch waiting on the discard prompt.
  const [pendingSwitch, setPendingSwitch] = useState(null);

  // Shown when someone tries to change a locked sheet.
  const [lockNotice, setLockNotice] = useState(false);

  const [summaryData, setSummaryData] = useState([]);
  const [banner, setBanner] = useState(null); // { type, text }

  useEffect(() => {
    loadBatchDetails();
  }, [batchId]);

  useEffect(() => {
    if (activeTab === 'summary') loadSummary();
  }, [activeTab]);

  const showBanner = (type, text) => {
    setBanner({ type, text });
    if (type === 'success') setTimeout(() => setBanner(null), 3000);
  };

  const blankMarks = (students) => {
    const marks = {};
    students.forEach((s) => { marks[s.id] = { present: false, late: false }; });
    return marks;
  };

  const marksFromSession = (students, session) => {
    const marks = blankMarks(students);
    session.attendance.forEach((record) => {
      marks[record.student] = {
        present: record.present,
        late: record.present && !!record.late,
      };
    });
    return marks;
  };

  /* ── Loading the sheet for a given date ────────────────────────
     This is the whole feature: pick a date, and the sheet either
     shows what was recorded that day or starts fresh with everyone
     absent. Works for past dates and future ones alike. */

  const applyDate = (
    date,
    students = batch.students,
    sessionList = sessions,
    unlockId = null
  ) => {
    const existing = sessionList.find((s) => s.date === date);

    let marks;
    if (existing) {
      setEditingSessionId(existing.id);
      setSessionTopic(existing.topic || '');
      marks = marksFromSession(students, existing);
    } else {
      setEditingSessionId(null);
      setSessionTopic('');
      marks = blankMarks(students);
    }

    setSessionDate(date);
    setAttendanceMarks(marks);
    baselineRef.current = JSON.stringify(marks);
    // Only unlock when this switch came from Session History AND the
    // session it unlocks is the one we just loaded.
    setUnlockedSessionId(existing && unlockId === existing.id ? unlockId : null);
    setPendingSwitch(null);
    setLockNotice(false);
  };

  // The native date input renders in the browser's own locale, which we
  // can't override. So it's kept off-screen purely for its calendar, and
  // a button shows the date in DD/MM/YYYY.
  const openDatePicker = () => {
    const el = dateInputRef.current;
    if (!el) return;
    if (typeof el.showPicker === 'function') {
      try {
        el.showPicker();
        return;
      } catch (err) {
        // Some browsers refuse showPicker outside a user gesture.
      }
    }
    el.focus();
    el.click();
  };

  const isDirty = () => JSON.stringify(attendanceMarks) !== baselineRef.current;

  // A saved session is read-only unless it was explicitly opened for
  // editing from Session History.
  const isLocked = () => !!editingSessionId && editingSessionId !== unlockedSessionId;

  // Switching dates mid-roll-call would silently throw away whatever
  // the teacher has ticked, so ask first.
  const requestDateChange = (newDate, unlockId = null) => {
    if (!newDate) return;
    if (isDirty()) {
      setPendingSwitch({ date: newDate, unlockId });
    } else {
      applyDate(newDate, batch.students, sessions, unlockId);
    }
  };

  const loadBatchDetails = async () => {
    setIsLoading(true);
    const [batchRes, sessionRes] = await Promise.all([
      fetchBatch(batchId),
      fetchSessions(batchId),
    ]);

    if (batchRes.success) {
      const students = batchRes.data.students;
      const sessionList = sessionRes.success ? sessionRes.data : [];
      setBatch(batchRes.data);
      setSessions(sessionList);
      // Opening the page lands on today — and if today's attendance was
      // already taken, it shows those marks rather than a blank sheet.
      applyDate(sessionDate, students, sessionList);
    }
    setIsLoading(false);
  };

  const refreshSessions = async (dateToApply) => {
    const result = await fetchSessions(batchId);
    if (result.success) {
      setSessions(result.data);
      if (dateToApply) applyDate(dateToApply, batch.students, result.data);
      return result.data;
    }
    return sessions;
  };

  const loadSummary = async () => {
    const result = await fetchSummary(batchId);
    if (result.success) setSummaryData(result.data);
  };

  /* ── Marking ───────────────────────────────────────────────────── */

  const markOf = (id) => attendanceMarks[id] || { present: false, late: false };

  const setPresence = (id, present) => {
    if (isLocked()) return setLockNotice(true);
    setAttendanceMarks((prev) => ({
      ...prev,
      [id]: { present, late: present ? (prev[id]?.late || false) : false },
    }));
  };

  const toggleLate = (id) => {
    if (isLocked()) return setLockNotice(true);
    setAttendanceMarks((prev) => {
      const current = prev[id] || { present: false, late: false };
      if (!current.present) return prev;
      return { ...prev, [id]: { ...current, late: !current.late } };
    });
  };

  const markAll = (present) => {
    if (isLocked()) return setLockNotice(true);
    const marks = {};
    batch.students.forEach((s) => {
      marks[s.id] = {
        present,
        late: present ? (attendanceMarks[s.id]?.late || false) : false,
      };
    });
    setAttendanceMarks(marks);
  };

  const resetSheet = () => {
    if (isLocked()) return setLockNotice(true);
    const marks = blankMarks(batch.students);
    setAttendanceMarks(marks);
  };

  const handleSubmitAttendance = async () => {
    if (!sessionDate) {
      showBanner('error', 'Pick a date for this session before saving.');
      return;
    }
    if (isSaving) return;

    setIsSaving(true);
    let targetSessionId = editingSessionId;

    if (!targetSessionId) {
      const sessionRes = await createSession(batchId, sessionDate, sessionTopic);
      if (!sessionRes.success) {
        setIsSaving(false);
        showBanner('error', 'Could not start a session for this date. Try again.');
        return;
      }
      targetSessionId = sessionRes.data.id;
    }

    const records = Object.keys(attendanceMarks).map((studId) => ({
      student_id: parseInt(studId, 10),
      present: attendanceMarks[studId].present,
      late: attendanceMarks[studId].late,
    }));

    const saveRes = await saveAttendance(targetSessionId, records);
    setIsSaving(false);

    if (saveRes.success) {
      baselineRef.current = JSON.stringify(attendanceMarks);
      setUnlockedSessionId(null); // saved records lock again
      await refreshSessions(sessionDate);
      showBanner('success', `Attendance saved for ${formatDate(sessionDate)}.`);
    } else {
      showBanner('error', 'Could not save attendance. Try again.');
    }
  };

  /* ── Students ──────────────────────────────────────────────────── */

  const handleAddStudent = async (e) => {
    e.preventDefault();
    const result = await createStudent(batchId, studentName, studentId);
    if (result.success) {
      setStudentName('');
      setStudentId('');
      loadBatchDetails();
    } else {
      showBanner('error', 'Could not add that student. Check the ID and name.');
    }
  };

  const saveEdit = async (id) => {
    const result = await updateStudent(id, batchId, editName, editId);
    if (result.success) {
      setEditingRowId(null);
      loadBatchDetails();
    } else {
      showBanner('error', 'Could not save that student.');
    }
  };

  if (isLoading) {
    return <div className="p-8 text-slate-500 font-medium animate-pulse">Loading batch…</div>;
  }
  if (!batch) {
    return <div className="p-8 text-red-600 font-bold">This batch could not be loaded.</div>;
  }

  const sortedStudents = [...batch.students].sort((a, b) =>
    a.student_id.localeCompare(b.student_id)
  );

  const presentCount = sortedStudents.filter((s) => markOf(s.id).present).length;
  const lateCount = sortedStudents.filter((s) => markOf(s.id).late).length;
  const absentCount = sortedStudents.length - presentCount;

  const barredStudents = summaryData.filter((s) => s.rate < ELIGIBILITY_THRESHOLD);
  const isFutureDate = sessionDate > today();
  const locked = isLocked();
  const unlocked = !!editingSessionId && !locked;

  return (
    <div className="max-w-6xl mx-auto pb-12 font-sans page-enter">

      {/* ── Header ─────────────────────────────────────────────── */}
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-2">
          <button
            onClick={() => navigate(`/courses/${batch.course}`)}
            className="press text-xs bg-white border border-slate-300 text-slate-600
                       px-3 py-1.5 rounded-md hover:bg-slate-50 font-bold shadow-sm"
          >
            ← Back to Course Layout
          </button>
          <span
            className="text-xs font-black px-2.5 py-1 rounded border uppercase tracking-wider"
            style={{ backgroundColor: '#eef2ff', color: NAVY, borderColor: '#c7d2fe' }}
          >
            {batch.name} {batch.section && `• ${batch.section}`}
          </span>
        </div>
        <h1 className="text-3xl font-bold text-slate-900 tracking-tight">
          Faculty Control Terminal
        </h1>
      </div>

      {/* ── Banner ─────────────────────────────────────────────── */}
      {banner && (
        <div
          className={`mb-6 flex items-start justify-between gap-4 rounded-lg border px-4 py-3
                      animate-slideDown ${
            banner.type === 'error'
              ? 'border-red-200 bg-red-50'
              : 'border-emerald-200 bg-emerald-50'
          }`}
        >
          <p className={`text-sm font-semibold ${
            banner.type === 'error' ? 'text-red-800' : 'text-emerald-800'
          }`}>
            {banner.text}
          </p>
          <button
            onClick={() => setBanner(null)}
            className={`font-bold text-sm leading-none ${
              banner.type === 'error'
                ? 'text-red-400 hover:text-red-700'
                : 'text-emerald-500 hover:text-emerald-800'
            }`}
            aria-label="Dismiss"
          >
            ✕
          </button>
        </div>
      )}

      {/* ── Tabs ───────────────────────────────────────────────── */}
      <div className="flex space-x-1 bg-slate-200/60 p-1 rounded-xl mb-8 border
                      border-slate-300/40 overflow-x-auto">
        {[
          { id: 'attendance', icon: '📝', label: 'Take Attendance' },
          { id: 'summary', icon: '📊', label: 'Attendance Summary' },
          { id: 'history', icon: '🕰️', label: 'Session History' },
          { id: 'students', icon: '👥', label: 'Manage Students' },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`press flex-1 whitespace-nowrap py-2.5 px-4 rounded-lg font-bold text-sm
              transition-all flex items-center justify-center gap-2 ${
              activeTab === tab.id
                ? 'bg-white shadow-sm'
                : 'text-slate-500 hover:text-slate-800 hover:bg-slate-200/50'
            }`}
            style={activeTab === tab.id ? { color: NAVY } : undefined}
          >
            <span className="text-base" aria-hidden="true">{tab.icon}</span>
            <span>{tab.label}</span>
          </button>
        ))}
      </div>

      {/* ══════════════ TAB 1: TAKE ATTENDANCE ══════════════ */}
      {activeTab === 'attendance' && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">

          {/* Context strip — tells the teacher, at a glance, whether the
              sheet on screen is a saved record or a fresh one. */}
          {locked ? (
            <div className="bg-slate-100 border-b border-slate-300 p-3.5 px-6 flex flex-wrap
                            justify-between items-center gap-3 animate-fadeIn">
              <p className="text-slate-700 text-sm font-bold">
                🔒 Attendance for {formatDate(sessionDate)} is already recorded. This sheet
                is read-only.
              </p>
              <button
                onClick={() => setActiveTab('history')}
                className="press text-xs bg-white border border-slate-300 hover:bg-slate-50
                           text-slate-700 font-bold px-3 py-1.5 rounded-md shadow-sm"
              >
                Go to Session History
              </button>
            </div>
          ) : unlocked ? (
            <div className="bg-amber-50 border-b border-amber-200 p-3.5 px-6 flex flex-wrap
                            justify-between items-center gap-3 animate-fadeIn">
              <p className="text-amber-900 text-sm font-bold">
                ✏️ Editing the record for {formatDate(sessionDate)}. Saving overwrites that day.
              </p>
              <div className="flex gap-2">
                <button
                  onClick={resetSheet}
                  className="press text-xs bg-amber-200 hover:bg-amber-300 text-amber-900
                             font-bold px-3 py-1.5 rounded-md"
                >
                  Clear all marks
                </button>
                <button
                  onClick={() => applyDate(sessionDate)}
                  className="press text-xs bg-white border border-amber-300 hover:bg-amber-50
                             text-amber-900 font-bold px-3 py-1.5 rounded-md"
                >
                  Cancel edit
                </button>
              </div>
            </div>
          ) : isFutureDate ? (
            <div className="bg-sky-50 border-b border-sky-200 p-3.5 px-6 animate-fadeIn">
              <p className="text-sky-900 text-sm font-bold">
                🗓️ New sheet for {formatDate(sessionDate)} — a future date. Everyone starts absent.
              </p>
            </div>
          ) : null}

          {/* Session settings */}
          <div className="p-6 border-b border-slate-100 bg-slate-50/70 flex flex-col
                          lg:flex-row gap-5 justify-between items-start lg:items-end">
            <div className="flex flex-wrap gap-4 w-full lg:w-auto flex-1">
              <div>
                <label
                  htmlFor="session-date"
                  className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5"
                >
                  📅 Select Target Date
                </label>
                <div className="relative">
                  <button
                    type="button"
                    onClick={openDatePicker}
                    className="press flex items-center gap-2.5 px-3 py-2 rounded-lg border
                               border-slate-300 bg-white font-bold text-slate-700
                               hover:border-slate-400 focus:ring-2 min-w-[150px]"
                    style={{ '--tw-ring-color': NAVY }}
                  >
                    <span>{formatDate(sessionDate)}</span>
                    <span className="ml-auto text-slate-400" aria-hidden="true">📅</span>
                  </button>
                  <input
                    id="session-date"
                    ref={dateInputRef}
                    type="date"
                    value={sessionDate}
                    onChange={(e) => requestDateChange(e.target.value)}
                    className="absolute left-0 bottom-0 w-px h-px opacity-0 pointer-events-none"
                    tabIndex={-1}
                    aria-label="Select date"
                  />
                </div>
              </div>
              <div className="flex-1 min-w-[260px]">
                <label
                  htmlFor="session-topic"
                  className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5"
                >
                  ✍️ Academic Topic / Agenda
                </label>
                <input
                  id="session-topic"
                  type="text"
                  placeholder="e.g., Introduction to Compiler Construction"
                  value={sessionTopic}
                  disabled={locked}
                  onChange={(e) => setSessionTopic(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 outline-none
                             font-medium text-slate-800 placeholder-slate-400 bg-white focus:ring-2
                             disabled:bg-slate-100 disabled:text-slate-500"
                  style={{ '--tw-ring-color': NAVY }}
                />
              </div>
            </div>

            <div className={`flex gap-2 w-full lg:w-auto justify-end ${locked ? 'hidden' : ''}`}>
              <button
                onClick={() => markAll(true)}
                className="press px-3.5 py-2 text-xs bg-emerald-50 text-emerald-700
                           border border-emerald-200 rounded-lg font-bold hover:bg-emerald-100"
              >
                ✓ Check All Present
              </button>
              <button
                onClick={() => markAll(false)}
                className="press px-3.5 py-2 text-xs bg-rose-50 text-rose-700
                           border border-rose-200 rounded-lg font-bold hover:bg-rose-100"
              >
                ✕ Reset All Absent
              </button>
            </div>
          </div>

          {/* Live tally */}
          {sortedStudents.length > 0 && (
            <div className="px-6 py-3 bg-white border-b border-slate-100 flex flex-wrap
                            items-center gap-x-6 gap-y-1 text-sm font-bold">
              <span className="text-emerald-700">{presentCount} present</span>
              <span className="text-rose-700">{absentCount} absent</span>
              <span className="text-amber-600">{lateCount} late</span>
              <span className="text-slate-400 font-semibold ml-auto">
                {sortedStudents.length} students
              </span>
            </div>
          )}

          {/* Roster */}
          {sortedStudents.length === 0 ? (
            <div className="text-center py-16 px-6">
              <p className="text-slate-700 font-bold">No students in this batch yet</p>
              <p className="text-slate-500 font-medium mt-1.5">
                Add them under Manage Students, then come back here.
              </p>
              <button
                onClick={() => setActiveTab('students')}
                className="press mt-5 text-white font-bold text-sm px-5 py-2.5 rounded-lg shadow-md"
                style={{ backgroundColor: NAVY }}
              >
                Add students
              </button>
            </div>
          ) : (
            <ul className="divide-y divide-slate-100">
              {sortedStudents.map((student) => {
                const mark = markOf(student.id);
                return (
                  <li
                    key={student.id}
                    className={`flex flex-wrap items-center gap-4 px-6 py-3.5 transition-colors ${
                      mark.present ? 'bg-emerald-50/40' : 'bg-white'
                    } ${locked ? 'opacity-90' : ''}`}
                  >
                    <div className="min-w-0 flex-1">
                      <p className="font-semibold text-slate-800 leading-tight truncate">
                        {student.name}
                      </p>
                      <p className="text-xs font-bold text-slate-400 tracking-tight mt-0.5">
                        {student.student_id}
                      </p>
                    </div>

                    {/* Present / Absent segmented toggle — picking either
                        side clears the other, so both can never be lit. */}
                    <div
                      className="inline-flex rounded-lg border border-slate-200 bg-slate-100 p-0.5"
                      role="group"
                      aria-label={`Attendance for ${student.name}`}
                    >
                      <button
                        onClick={() => setPresence(student.id, true)}
                        aria-pressed={mark.present}
                        className={`press inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-md
                          text-xs font-black uppercase tracking-wide transition-all ${
                          mark.present
                            ? 'bg-emerald-600 text-white shadow-sm'
                            : locked
                            ? 'text-slate-400'
                            : 'text-slate-500 hover:text-emerald-700'
                        }`}
                      >
                        <CheckIcon /> Present
                      </button>
                      <button
                        onClick={() => setPresence(student.id, false)}
                        aria-pressed={!mark.present}
                        className={`press inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-md
                          text-xs font-black uppercase tracking-wide transition-all ${
                          !mark.present
                            ? 'bg-rose-600 text-white shadow-sm'
                            : locked
                            ? 'text-slate-400'
                            : 'text-slate-500 hover:text-rose-700'
                        }`}
                      >
                        <CrossIcon /> Absent
                      </button>
                    </div>

                    {/* Late chip — inert until the student is present */}
                    <button
                      onClick={() => toggleLate(student.id)}
                      disabled={!mark.present && !locked}
                      aria-pressed={mark.late}
                      title={
                        locked
                          ? 'This record is read-only'
                          : mark.present
                          ? 'Mark as arrived late'
                          : 'Only a present student can be late'
                      }
                      className={`press inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg
                        text-xs font-black uppercase tracking-wide border transition-all w-[92px]
                        justify-center ${
                        !mark.present
                          ? 'bg-slate-50 text-slate-300 border-slate-200'
                          : mark.late
                          ? 'bg-amber-500 text-white border-amber-500 shadow-sm'
                          : locked
                          ? 'bg-white text-slate-400 border-slate-200'
                          : 'bg-white text-slate-500 border-slate-300 hover:border-amber-400 hover:text-amber-600'
                      }`}
                    >
                      <ClockIcon /> Late
                    </button>
                  </li>
                );
              })}
            </ul>
          )}

          {sortedStudents.length > 0 && (
            <div className="p-4 bg-slate-50 border-t border-slate-200 flex flex-wrap
                            items-center justify-between gap-3">
              {locked ? (
                <>
                  <p className="text-xs font-bold text-slate-500">
                    🔒 Recorded on {formatDate(sessionDate)} — read-only
                  </p>
                  <button
                    onClick={() => setActiveTab('history')}
                    className="press font-bold py-3 px-8 rounded-lg text-sm tracking-wide
                               uppercase border border-slate-300 bg-white text-slate-700
                               hover:bg-slate-50 shadow-sm"
                  >
                    Edit in Session History
                  </button>
                </>
              ) : (
                <>
                  <p className="text-xs font-bold text-slate-400">
                    {isDirty() ? 'Unsaved changes' : 'All changes saved'}
                  </p>
                  <button
                    onClick={handleSubmitAttendance}
                    disabled={isSaving}
                    className="press text-white font-bold py-3 px-10 rounded-lg shadow-md
                               text-sm tracking-wide uppercase disabled:opacity-60"
                    style={{ backgroundColor: NAVY }}
                  >
                    {isSaving
                      ? 'Saving…'
                      : unlocked
                      ? '💾 Commit Changes'
                      : '💾 Finalize & Save Attendance'}
                  </button>
                </>
              )}
            </div>
          )}
        </div>
      )}

      {/* ══════════════ TAB 2: SUMMARY ══════════════ */}
      {activeTab === 'summary' && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm
                        overflow-hidden animate-fadeIn">
          <div className="p-6 border-b border-slate-100 bg-slate-50 flex flex-col
                          sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h3 className="text-lg font-bold text-slate-900">Roster Eligibility Matrix</h3>
              <p className="text-xs text-slate-500 font-medium mt-0.5">
                Students need {ELIGIBILITY_THRESHOLD}% to sit the final exam.
                Late arrivals still count as present.
              </p>
            </div>
            {barredStudents.length > 0 && (
              <span className="bg-rose-50 text-rose-700 font-black px-4 py-1.5 rounded-lg
                               text-xs border border-rose-200 uppercase tracking-wide">
                🚨 {barredStudents.length} below threshold
              </span>
            )}
          </div>

          {summaryData.length === 0 ? (
            <p className="text-center text-slate-400 py-16 font-medium">
              Save a session first — the summary builds from your saved records.
            </p>
          ) : (
            <div className="overflow-x-auto thin-scroll">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-xs font-bold
                                 text-slate-400 uppercase tracking-wider">
                    <th className="p-4 pl-6">Student ID</th>
                    <th className="p-4">Full Name</th>
                    <th className="p-4 text-center">Present</th>
                    <th className="p-4 text-center">Late</th>
                    <th className="p-4 text-center">Absent</th>
                    <th className="p-4 text-center">Percentage</th>
                    <th className="p-4 text-right pr-6">Eligibility</th>
                  </tr>
                </thead>
                <tbody>
                  {[...summaryData]
                    .sort((a, b) => a.student_id.localeCompare(b.student_id))
                    .map((student, index) => (
                      <tr
                        key={student.id}
                        className={`border-b border-slate-100 ${
                          index % 2 === 0 ? 'bg-white' : 'bg-slate-50/50'
                        }`}
                      >
                        <td className="p-4 pl-6 font-bold text-slate-700">{student.student_id}</td>
                        <td className="p-4 font-semibold text-slate-800">{student.name}</td>
                        <td className="p-4 text-center font-bold text-emerald-600">
                          {student.present}
                        </td>
                        <td className="p-4 text-center font-bold">
                          {student.late > 0 ? (
                            <span className="inline-block bg-amber-100 text-amber-700
                                             px-2 py-0.5 rounded">
                              {student.late}
                            </span>
                          ) : (
                            <span className="text-slate-300">—</span>
                          )}
                        </td>
                        <td className="p-4 text-center font-bold text-rose-600">
                          {student.absent}
                        </td>
                        <td className="p-4 text-center">
                          <span
                            className={`font-black tracking-tight ${
                              student.rate < ELIGIBILITY_THRESHOLD
                                ? 'text-rose-600'
                                : student.rate < ELIGIBILITY_THRESHOLD + 15
                                ? 'text-amber-500'
                                : 'text-emerald-600'
                            }`}
                          >
                            {student.rate}%
                          </span>
                        </td>
                        <td className="p-4 text-right pr-6">
                          {student.rate < ELIGIBILITY_THRESHOLD ? (
                            <span className="bg-rose-100 text-rose-800 text-xs font-black
                                             px-2.5 py-1 rounded border border-rose-200
                                             tracking-wide uppercase">
                              🚫 Not Eligible
                            </span>
                          ) : (
                            <span className="bg-emerald-100 text-emerald-800 text-xs font-black
                                             px-2.5 py-1 rounded border border-emerald-200
                                             tracking-wide uppercase">
                              Eligible
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ══════════════ TAB 3: SESSION HISTORY ══════════════ */}
      {activeTab === 'history' && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 animate-fadeIn">
          <h3 className="text-lg font-bold text-slate-900 mb-1">Academic Logs</h3>
          <p className="text-xs text-slate-500 font-medium mb-6">
            Open any past session to review or correct its attendance.
          </p>
          {sessions.length === 0 ? (
            <p className="text-slate-400 py-6 font-medium">No sessions saved yet.</p>
          ) : (
            <div className="grid gap-3">
              {sessions.map((session) => {
                const lateInSession = session.attendance.filter((a) => a.late).length;
                const presentInSession = session.attendance.filter((a) => a.present).length;
                return (
                  <div
                    key={session.id}
                    className="lift p-4 border border-slate-200 rounded-xl flex flex-wrap
                               justify-between items-center gap-3 bg-white hover:shadow-sm"
                  >
                    <div className="min-w-0">
                      <p className="font-bold text-slate-800 text-lg flex items-center gap-2">
                        <span aria-hidden="true">📅</span> {formatDate(session.date)}
                      </p>
                      <p className="text-slate-500 text-sm font-medium mt-0.5 truncate">
                        {session.topic || 'No topic recorded'}
                      </p>
                    </div>
                    <div className="flex items-center gap-3 flex-wrap">
                      <span className="bg-slate-100 text-slate-600 text-xs font-bold
                                       px-3 py-1 rounded-full border border-slate-200">
                        {presentInSession} present
                      </span>
                      {lateInSession > 0 && (
                        <span className="bg-amber-100 text-amber-700 text-xs font-bold
                                         px-3 py-1 rounded-full border border-amber-200">
                          {lateInSession} late
                        </span>
                      )}
                      <button
                        onClick={() => {
                          setActiveTab('attendance');
                          requestDateChange(session.date, session.id);
                        }}
                        className="press font-black text-xs uppercase tracking-wide px-4 py-2
                                   rounded-lg border transition-all"
                        style={{ backgroundColor: '#eef2ff', color: NAVY, borderColor: '#c7d2fe' }}
                      >
                        ✏️ Edit Records
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ══════════════ TAB 4: MANAGE STUDENTS ══════════════ */}
      {activeTab === 'students' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 animate-fadeIn">
          <div className="lg:col-span-1">
            <div
              className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm"
              style={{ borderTop: `4px solid ${NAVY}` }}
            >
              <h2 className="text-xl font-bold text-slate-900 mb-4">Enroll New Student</h2>
              <form onSubmit={handleAddStudent} className="space-y-4">
                <div>
                  <label
                    htmlFor="new-student-id"
                    className="block text-sm font-bold text-slate-700 mb-1.5"
                  >
                    Registration ID
                  </label>
                  <input
                    id="new-student-id"
                    type="text"
                    required
                    placeholder="e.g., 231-115-081"
                    value={studentId}
                    onChange={(e) => setStudentId(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-lg border border-slate-300
                               outline-none font-medium focus:ring-2"
                    style={{ '--tw-ring-color': NAVY }}
                  />
                </div>
                <div>
                  <label
                    htmlFor="new-student-name"
                    className="block text-sm font-bold text-slate-700 mb-1.5"
                  >
                    Full Name
                  </label>
                  <input
                    id="new-student-name"
                    type="text"
                    required
                    placeholder="e.g., Ahsanul Haque"
                    value={studentName}
                    onChange={(e) => setStudentName(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-lg border border-slate-300
                               outline-none font-medium focus:ring-2"
                    style={{ '--tw-ring-color': NAVY }}
                  />
                </div>
                <button
                  type="submit"
                  className="press w-full text-white font-bold py-2.5 px-4 rounded-lg
                             shadow-md mt-2 text-sm uppercase tracking-wide"
                  style={{ backgroundColor: NAVY }}
                >
                  Authorize Enrollment
                </button>
              </form>
            </div>
          </div>

          <div className="lg:col-span-2">
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="p-4 px-6 border-b border-slate-100 bg-slate-50 flex
                              justify-between items-center">
                <h3 className="text-lg font-bold text-slate-900">Enrolled Academic Roster</h3>
                <span
                  className="text-xs font-bold px-3 py-1 rounded-full border"
                  style={{ backgroundColor: '#eef2ff', color: NAVY, borderColor: '#c7d2fe' }}
                >
                  {sortedStudents.length} total
                </span>
              </div>

              {sortedStudents.length === 0 ? (
                <p className="text-center text-slate-400 py-14 font-medium">
                  No students yet. Add your first one on the left.
                </p>
              ) : (
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200 text-xs font-bold
                                   text-slate-400 uppercase tracking-wider">
                      <th className="p-4 pl-6">ID</th>
                      <th className="p-4">Name</th>
                      <th className="p-4 text-right pr-6">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sortedStudents.map((student, index) => (
                      <tr
                        key={student.id}
                        className={`border-b border-slate-100 ${
                          index % 2 === 0 ? 'bg-white' : 'bg-slate-50/50'
                        }`}
                      >
                        {editingRowId === student.id ? (
                          <>
                            <td className="p-3 pl-6">
                              <input
                                value={editId}
                                onChange={(e) => setEditId(e.target.value)}
                                className="w-full px-2 py-1 border rounded outline-none
                                           font-bold text-slate-700"
                                style={{ borderColor: NAVY }}
                              />
                            </td>
                            <td className="p-3">
                              <input
                                value={editName}
                                onChange={(e) => setEditName(e.target.value)}
                                className="w-full px-2 py-1 border rounded outline-none
                                           font-semibold text-slate-800"
                                style={{ borderColor: NAVY }}
                              />
                            </td>
                            <td className="p-3 text-right pr-6 space-x-2 whitespace-nowrap">
                              <button
                                onClick={() => saveEdit(student.id)}
                                className="press text-xs bg-emerald-600 text-white px-3 py-1.5
                                           rounded font-bold hover:bg-emerald-700"
                              >
                                Save
                              </button>
                              <button
                                onClick={() => setEditingRowId(null)}
                                className="press text-xs bg-slate-200 text-slate-700 px-3 py-1.5
                                           rounded font-bold hover:bg-slate-300"
                              >
                                Cancel
                              </button>
                            </td>
                          </>
                        ) : (
                          <>
                            <td className="p-4 pl-6 font-bold text-slate-700">
                              {student.student_id}
                            </td>
                            <td className="p-4 font-semibold text-slate-800">{student.name}</td>
                            <td className="p-4 text-right pr-6">
                              <button
                                onClick={() => {
                                  setEditingRowId(student.id);
                                  setEditName(student.name);
                                  setEditId(student.student_id);
                                }}
                                className="press text-sm font-bold hover:underline"
                                style={{ color: NAVY }}
                              >
                                Edit Profile
                              </button>
                            </td>
                          </>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── Unsaved-changes guard when switching dates ─────────── */}
      {pendingSwitch && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex
                        items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 animate-fadeIn">
            <h3 className="text-lg font-bold text-slate-900">Discard unsaved marks?</h3>
            <p className="text-sm text-slate-600 font-medium mt-2 leading-relaxed">
              You have attendance marked for {formatDate(sessionDate)} that hasn't
              been saved. Switching to {formatDate(pendingSwitch.date)} will discard it.
            </p>
            <div className="flex gap-3 mt-6">
              <button
                onClick={() =>
                  applyDate(
                    pendingSwitch.date,
                    batch.students,
                    sessions,
                    pendingSwitch.unlockId
                  )
                }
                className="press text-white font-bold text-sm px-5 py-2.5 rounded-lg shadow-md"
                style={{ backgroundColor: '#D32F2F' }}
              >
                Discard and switch
              </button>
              <button
                onClick={() => setPendingSwitch(null)}
                className="press font-bold text-sm px-5 py-2.5 rounded-lg
                           text-slate-600 bg-slate-100 hover:bg-slate-200"
              >
                Stay on {formatDate(sessionDate)}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Locked-sheet notice ────────────────────────────────── */}
      {lockNotice && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex
                        items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden
                          animate-fadeIn">
            <div className="px-6 pt-6 pb-5">
              <div className="w-11 h-11 rounded-full bg-slate-100 flex items-center
                              justify-center text-xl mb-4" aria-hidden="true">
                🔒
              </div>
              <h3 className="text-lg font-bold text-slate-900">
                Attendance already recorded
              </h3>
              <p className="text-sm text-slate-600 font-medium mt-2 leading-relaxed">
                Attendance for <strong>{formatDate(sessionDate)}</strong> has already been
                saved, so this sheet can't be changed here. To correct it, open the record
                from Session History.
              </p>
            </div>
            <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex gap-3">
              <button
                onClick={() => {
                  setLockNotice(false);
                  setActiveTab('history');
                }}
                className="press text-white font-bold text-sm px-5 py-2.5 rounded-lg shadow-md"
                style={{ backgroundColor: NAVY }}
              >
                Go to Session History
              </button>
              <button
                onClick={() => setLockNotice(false)}
                className="press font-bold text-sm px-5 py-2.5 rounded-lg
                           text-slate-600 hover:bg-slate-200"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}