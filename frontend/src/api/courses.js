// src/api/courses.js
const BASE_URL = 'http://127.0.0.1:8000/api';

const getAuthHeaders = () => {
    const token = localStorage.getItem('prezence_token');
    return {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
    };
};

// GET: all courses for the logged-in faculty
export const fetchCourses = async () => {
    try {
        const response = await fetch(`${BASE_URL}/courses/`, {
            method: 'GET',
            headers: getAuthHeaders(),
        });
        const data = await response.json();
        return response.ok ? { success: true, data } : { success: false, error: data };
    } catch (error) {
        return { success: false, error: 'Network error connecting to Django' };
    }
};

// POST: create a course
export const createCourse = async (code, name) => {
    try {
        const response = await fetch(`${BASE_URL}/courses/`, {
            method: 'POST',
            headers: getAuthHeaders(),
            body: JSON.stringify({ code, name }),
        });
        const data = await response.json();
        return response.ok ? { success: true, data } : { success: false, error: data };
    } catch (error) {
        return { success: false, error: 'Network error connecting to Django' };
    }
};

// GET: a single course, including its batches
export const fetchCourse = async (courseId) => {
    try {
        const response = await fetch(`${BASE_URL}/courses/${courseId}/`, {
            method: 'GET',
            headers: getAuthHeaders(),
        });
        const data = await response.json();
        return response.ok ? { success: true, data } : { success: false, error: data };
    } catch (error) {
        return { success: false, error: 'Network error connecting to Django' };
    }
};

// PATCH: rename or re-code an existing course.
// PATCH rather than PUT so we only send the fields that changed.
export const updateCourse = async (courseId, code, name) => {
    try {
        const response = await fetch(`${BASE_URL}/courses/${courseId}/`, {
            method: 'PATCH',
            headers: getAuthHeaders(),
            body: JSON.stringify({ code, name }),
        });
        const data = await response.json();
        return response.ok ? { success: true, data } : { success: false, error: data };
    } catch (error) {
        return { success: false, error: 'Network error connecting to Django' };
    }
};

// DELETE: remove a course.
// Cascades in the database — batches, students, sessions and
// attendance under this course all go with it.
export const deleteCourse = async (courseId) => {
    try {
        const response = await fetch(`${BASE_URL}/courses/${courseId}/`, {
            method: 'DELETE',
            headers: getAuthHeaders(),
        });
        // 204 No Content has an empty body, so don't try to parse it.
        if (response.ok) return { success: true };
        const data = await response.json().catch(() => ({}));
        return { success: false, error: data };
    } catch (error) {
        return { success: false, error: 'Network error connecting to Django' };
    }
};