// src/api/courses.js
import { request } from './client';

export const fetchCourses = () =>
    request('/courses/', { fallbackError: 'Could not load your courses.' });

export const createCourse = (code, name) =>
    request('/courses/', {
        method: 'POST',
        body: { code, name },
        fallbackError: 'Could not create the course.',
    });

export const fetchCourse = (courseId) =>
    request(`/courses/${courseId}/`, { fallbackError: 'Could not load that course.' });

// PATCH rather than PUT so we only send the fields that changed.
export const updateCourse = (courseId, code, name) =>
    request(`/courses/${courseId}/`, {
        method: 'PATCH',
        body: { code, name },
        fallbackError: 'Could not save your changes.',
    });

// Cascades in the database — batches, students, sessions and attendance
// under this course all go with it.
export const deleteCourse = (courseId) =>
    request(`/courses/${courseId}/`, {
        method: 'DELETE',
        fallbackError: 'Could not delete that course.',
    });