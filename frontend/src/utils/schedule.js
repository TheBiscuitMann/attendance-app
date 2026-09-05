// src/utils/schedule.js
//
// One place for the weekly-schedule data shape. The data itself now
// lives on the server, so a teacher sees the same routine on any
// machine they log in from.

import { request } from '../api/client';

export const DAYS = [
  { key: 'Sun', label: 'Sunday' },
  { key: 'Mon', label: 'Monday' },
  { key: 'Tue', label: 'Tuesday' },
  { key: 'Wed', label: 'Wednesday' },
  { key: 'Thu', label: 'Thursday' },
  { key: 'Fri', label: 'Friday' },
  { key: 'Sat', label: 'Saturday' },
];

const LEGACY_WEEK_KEY = 'mu_weekly_schedule';
const LEGACY_COURSE_KEY = 'mu_profile_schedules';

// Fired after a save so any mounted component can refresh itself.
export const SCHEDULE_EVENT = 'profileScheduleUpdated';

export const emptyWeek = () =>
  DAYS.reduce((acc, d) => ({ ...acc, [d.key]: [] }), {});

// Times are stored as 24-hour "HH:MM" so they sort as plain strings,
// and only ever shown to the user in 12-hour form.
export const TIME_SLOTS = (() => {
  const slots = [];
  for (let hour = 7; hour <= 22; hour++) {
    for (const minute of [0, 15, 30, 45]) {
      if (hour === 22 && minute > 0) break;
      slots.push(
        `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`
      );
    }
  }
  return slots;
})();

export const formatTime = (value) => {
  if (!value) return '';
  const [h, m] = value.split(':').map(Number);
  const suffix = h >= 12 ? 'PM' : 'AM';
  const hour12 = h % 12 === 0 ? 12 : h % 12;
  return `${hour12}:${String(m).padStart(2, '0')} ${suffix}`;
};

export const newEntryId = () =>
  `e${Date.now().toString(36)}${Math.random().toString(36).slice(2, 7)}`;

/* ── Migration off localStorage ──────────────────────────────────────
   Anything a teacher entered before the schedule moved server-side is
   pushed up once, then cleared locally. Handles both the day-keyed
   format and the original course-keyed one. */

const readLegacyWeek = () => {
  const raw = localStorage.getItem(LEGACY_WEEK_KEY);
  if (raw) {
    try {
      const parsed = JSON.parse(raw);
      if (parsed && Object.keys(parsed).length) return { ...emptyWeek(), ...parsed };
    } catch {
      /* fall through to the older format */
    }
  }

  const legacyRaw = localStorage.getItem(LEGACY_COURSE_KEY);
  if (!legacyRaw) return null;
  try {
    const old = JSON.parse(legacyRaw);
    const week = emptyWeek();
    Object.entries(old).forEach(([courseId, record]) => {
      (record.days || []).forEach((day) => {
        if (!week[day]) return;
        week[day].push({
          id: newEntryId(),
          course: Number(courseId) || null,
          customTitle: record.title || '',
          title: record.title || '',
          room: record.room || '',
          start: record.time || '',
          end: '',
        });
      });
    });
    return week;
  } catch {
    return null;
  }
};

const clearLegacy = () => {
  localStorage.removeItem(LEGACY_WEEK_KEY);
  localStorage.removeItem(LEGACY_COURSE_KEY);
};

/* ── Server shape <-> UI shape ───────────────────────────────────────
   The API sends `course` and `custom_title`; the editor works with
   `courseId` (which may be the string "custom") and `customTitle`. */

const fromServer = (week) => {
  const result = emptyWeek();
  DAYS.forEach(({ key }) => {
    result[key] = (week[key] || []).map((entry) => ({
      id: entry.id ? String(entry.id) : newEntryId(),
      courseId: entry.course ? String(entry.course) : (entry.custom_title ? 'custom' : ''),
      customTitle: entry.custom_title || '',
      title: entry.title || '',
      room: entry.room || '',
      start: entry.start || '',
      end: entry.end || '',
    }));
  });
  return result;
};

const toServer = (week) => {
  const payload = {};
  DAYS.forEach(({ key }) => {
    payload[key] = (week[key] || []).map((entry) => ({
      course: entry.courseId && entry.courseId !== 'custom' ? entry.courseId : null,
      custom_title: entry.courseId === 'custom' ? entry.customTitle : '',
      room: entry.room || '',
      start: entry.start || '',
      end: entry.end || '',
    }));
  });
  return payload;
};

/* ── Public API ─────────────────────────────────────────────────── */

export const fetchWeek = async () => {
  const result = await request('/schedule/', {
    fallbackError: 'Could not load your schedule.',
  });
  if (!result.success) return result;

  let week = fromServer(result.data);

  // First run after the move to the server: push whatever was stored
  // in this browser, then never look at localStorage again.
  const isEmpty = DAYS.every(({ key }) => week[key].length === 0);
  if (isEmpty) {
    const legacy = readLegacyWeek();
    if (legacy) {
      const uploaded = await saveWeek(legacy);
      clearLegacy();
      if (uploaded.success) week = uploaded.week;
    }
  }

  return { success: true, week };
};

export const saveWeek = async (week) => {
  const result = await request('/schedule/', {
    method: 'PUT',
    body: { week: toServer(week) },
    fallbackError: 'Could not save your schedule.',
  });

  if (!result.success) return result;

  window.dispatchEvent(new Event(SCHEDULE_EVENT));
  return { success: true, week: fromServer(result.data) };
};

export const todayKey = () => DAYS[new Date().getDay()].key;
export const todayLabel = () => DAYS[new Date().getDay()].label;
/* ── Routine PDF import ──────────────────────────────────────────────
   A PDF routine is parsed on the server (grid reconstruction needs
   pdfplumber). The response is always a preview — nothing is saved
   until the teacher confirms, because syncing replaces the whole week. */

export const importRoutinePdf = (file, initials) => {
  const form = new FormData();
  form.append('file', file);
  form.append('initials', initials);
  return request('/schedule/import/', {
    method: 'POST',
    body: form,
    fallbackError: 'Could not read that routine PDF.',
  });
};