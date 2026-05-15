// src/api/courses.js
const BASE_URL = 'http://127.0.0.1:8000/api';

// Helper function to get the token
const getAuthHeaders = () => {
    const token = localStorage.getItem('prezence_token');
    return {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}` // This proves we are logged in!
    };
};

// GET: Fetch all courses for the logged-in faculty
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

// POST: Create a brand new course
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

// GET: Fetch a single course by its ID (includes its batches!)
export const fetchCourse = async (courseId) => {
    try {
        const token = localStorage.getItem('prezence_token');
        const response = await fetch(`${BASE_URL}/courses/${courseId}/`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
        });
        const data = await response.json();
        return response.ok ? { success: true, data } : { success: false, error: data };
    } catch (error) {
        return { success: false, error: 'Network error connecting to Django' };
    }
};