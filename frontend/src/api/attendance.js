// src/api/attendance.js
import { request } from './client';

export const createSession = (batchId, date, topic) =>
    request('/sessions/', {
        method: 'POST',
        body: { batch: batchId, date, topic },
        fallbackError: 'Could not start a session for this date.',
    });

export const fetchSessions = (batchId) =>
    request(`/sessions/?batch=${batchId}`, {
        fallbackError: 'Could not load the session history.',
    });

export const deleteSession = (sessionId) =>
    request(`/sessions/${sessionId}/`, {
        method: 'DELETE',
        fallbackError: 'Could not delete that session.',
    });

export const saveAttendance = (sessionId, records) =>
    request('/attendance/save/', {
        method: 'POST',
        body: { session_id: sessionId, records },
        fallbackError: 'Could not save attendance.',
    });

export const fetchSummary = (batchId) =>
    request(`/attendance/summary/?batch=${batchId}`, {
        fallbackError: 'Could not load the summary.',
    });