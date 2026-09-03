// src/api/batches.js
const BASE_URL = 'http://127.0.0.1:8000/api';

const getAuthHeaders = () => {
    const token = localStorage.getItem('prezence_token');
    return {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
    };
};

// GET: all batches for the logged-in faculty
export const fetchBatches = async () => {
    try {
        const response = await fetch(`${BASE_URL}/batches/`, {
            method: 'GET',
            headers: getAuthHeaders(),
        });
        const data = await response.json();
        return response.ok ? { success: true, data } : { success: false, error: data };
    } catch (error) {
        return { success: false, error: 'Network error' };
    }
};

// POST: create a batch under a course
export const createBatch = async (courseId, name, section) => {
    try {
        const response = await fetch(`${BASE_URL}/batches/`, {
            method: 'POST',
            headers: getAuthHeaders(),
            body: JSON.stringify({ course: courseId, name, section }),
        });
        const data = await response.json();
        return response.ok ? { success: true, data } : { success: false, error: data };
    } catch (error) {
        return { success: false, error: 'Network error' };
    }
};

// GET: a single batch and its students
export const fetchBatch = async (batchId) => {
    try {
        const response = await fetch(`${BASE_URL}/batches/${batchId}/`, {
            method: 'GET',
            headers: getAuthHeaders(),
        });
        const data = await response.json();
        return response.ok ? { success: true, data } : { success: false, error: data };
    } catch (error) {
        return { success: false, error: 'Network error connecting to Django' };
    }
};

// PATCH: rename a batch or move it to a different course
export const updateBatch = async (batchId, courseId, name, section) => {
    try {
        const response = await fetch(`${BASE_URL}/batches/${batchId}/`, {
            method: 'PATCH',
            headers: getAuthHeaders(),
            body: JSON.stringify({ course: courseId, name, section }),
        });
        const data = await response.json();
        return response.ok ? { success: true, data } : { success: false, error: data };
    } catch (error) {
        return { success: false, error: 'Network error' };
    }
};

// DELETE: remove a batch.
// Cascades — students, sessions and attendance under it go too.
export const deleteBatch = async (batchId) => {
    try {
        const response = await fetch(`${BASE_URL}/batches/${batchId}/`, {
            method: 'DELETE',
            headers: getAuthHeaders(),
        });
        if (response.ok) return { success: true };
        const data = await response.json().catch(() => ({}));
        return { success: false, error: data };
    } catch (error) {
        return { success: false, error: 'Network error' };
    }
};