// src/utils/schedule.js
//
// One place for the weekly-schedule data shape, so the Schedule page and
// the header itinerary can't drift apart.

export const DAYS = [
  { key: 'Sun', label: 'Sunday' },
  { key: 'Mon', label: 'Monday' },
  { key: 'Tue', label: 'Tuesday' },
  { key: 'Wed', label: 'Wednesday' },
  { key: 'Thu', label: 'Thursday' },
  { key: 'Fri', label: 'Friday' },
  { key: 'Sat', label: 'Saturday' },
];

export const WEEK_KEY = 'mu_weekly_schedule';
const LEGACY_KEY = 'mu_profile_schedules';

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

// The original format stored one record per course with a list of days
// and a single time. Fold it into the day-first shape so nobody loses
// the schedule they already entered.
const migrateLegacySchedule = () => {
  const raw = localStorage.getItem(LEGACY_KEY);
  if (!raw) return null;
  try {
    const old = JSON.parse(raw);
    const week = emptyWeek();
    Object.entries(old).forEach(([courseId, record]) => {
      (record.days || []).forEach((day) => {
        if (!week[day]) return;
        week[day].push({
          id: newEntryId(),
          courseId: String(courseId),
          customTitle: '',
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

export const loadWeek = () => {
  const raw = localStorage.getItem(WEEK_KEY);
  if (raw) {
    try {
      return { ...emptyWeek(), ...JSON.parse(raw) };
    } catch {
      return emptyWeek();
    }
  }
  return migrateLegacySchedule() || emptyWeek();
};

export const saveWeek = (week) => {
  localStorage.setItem(WEEK_KEY, JSON.stringify(week));
  localStorage.removeItem(LEGACY_KEY); // migration is complete
  window.dispatchEvent(new Event(SCHEDULE_EVENT));
};

export const todayKey = () => DAYS[new Date().getDay()].key;
export const todayLabel = () => DAYS[new Date().getDay()].label;